
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT?.split('.com')[0] + '.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_R2 = process.env.R2_BUCKET_NAME;
const DOMAIN_R2 = process.env.R2_PUBLIC_DOMAIN;

// Função para upload direto para o R2 com path específico
async function uploadToR2(buffer, destPath, contentType) {
  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: BUCKET_R2,
      Key: destPath,
      Body: buffer,
      ContentType: contentType,
    }));
    return `${DOMAIN_R2}/${destPath}`;
  } catch (e) {
    console.error(`  [X] Falha upload R2: ${destPath}`, e.message);
    return null;
  }
}

// Função inteligente para pegar o Buffer, seja de Base64 ou de Path do Supabase
async function getFileBuffer(source, supabaseBucket) {
  if (!source) return null;

  // Se for Base64
  if (source.startsWith('data:')) {
    const parts = source.split(',');
    const mime = parts[0].split(':')[1].split(';')[0];
    const data = Buffer.from(parts[1], 'base64');
    return { data, mime };
  }

  // Se for um caminho (ex: "uploads/foto.jpg" ou apenas "foto.jpg")
  if (!source.startsWith('http')) {
    // Tenta baixar do bucket informado
    const { data, error } = await supabase.storage.from(supabaseBucket).download(source);
    if (error) {
      // Tenta um fallback caso o path já inclua o bucket erroneamente ou esteja em outro
      console.log(`  [!] Path ${source} não achado em ${supabaseBucket}, tentando busca global...`);
      return null;
    }
    return { 
      data: Buffer.from(await data.arrayBuffer()), 
      mime: source.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' 
    };
  }
  return null;
}

async function start() {
  console.log("🚀 INICIANDO MIGRAÇÃO ORGANIZADA ALS -> R2");

  // 1. USUÁRIOS (Remapeando da pasta Supabase 'documentos/')
  console.log("\n--- Organizando: users/photos/ ---");
  const { data: users } = await supabase.from('users').select('id, photo, username');
  for (const u of (users || [])) {
    // As fotos de usuários costumam estar no bucket 'drivers' ou 'staff' na pasta 'documentos/'
    const res = await getFileBuffer(u.photo, 'drivers'); 
    if (res) {
      const newPath = `users/photos/${u.id}.jpg`;
      const url = await uploadToR2(res.data, newPath, res.mime);
      if (url) {
        await supabase.from('users').update({ photo: url }).eq('id', u.id);
        console.log(`  [OK] Usuário ${u.username} -> ${newPath}`);
      }
    }
  }

  // 2. MOTORISTAS (Remapeando da pasta Supabase 'uploads/')
  console.log("\n--- Organizando: drivers/[id]/ ---");
  const { data: drivers } = await supabase.from('drivers').select('id, photo, cnh_pdf_url, name');
  for (const d of (drivers || [])) {
    // Foto de Perfil
    if (d.photo) {
      const res = await getFileBuffer(d.photo, 'drivers');
      if (res) {
        const newPath = `drivers/${d.id}/profile.jpg`;
        const url = await uploadToR2(res.data, newPath, res.mime);
        if (url) await supabase.from('drivers').update({ photo: url }).eq('id', d.id);
      }
    }
    // PDF da CNH
    if (d.cnh_pdf_url) {
      const res = await getFileBuffer(d.cnh_pdf_url, 'drivers');
      if (res) {
        const newPath = `drivers/${d.id}/cnh.pdf`;
        const url = await uploadToR2(res.data, newPath, 'application/pdf');
        if (url) await supabase.from('drivers').update({ cnh_pdf_url: url }).eq('id', d.id);
      }
    }
    console.log(`  [OK] Motorista ${d.name} processado.`);
  }

  // 3. VIAGENS (A estrutura mais complexa: Pasta por OS)
  console.log("\n--- Organizando: trips/[os]/ ---");
  const { data: trips } = await supabase.from('trips').select('*');
  for (const t of (trips || [])) {
    const updates = {};
    const osClean = t.os.replace(/[^a-z0-9]/gi, '_');
    
    // Documentos da Viagem (OS, CTE, NF, etc)
    const docFields = ['os_doc', 'cte_doc', 'agendamento_doc', 'completo_doc', 'cva_doc', 'nf_doc'];
    for (const field of docFields) {
      if (t[field] && t[field].url) {
        const res = await getFileBuffer(t[field].url, 'trips');
        if (res) {
          const type = field.split('_')[0]; // os, cte, etc
          const newPath = `trips/${osClean}/documentos/${type}.pdf`;
          const url = await uploadToR2(res.data, newPath, 'application/pdf');
          if (url) updates[field] = { ...t[field], url };
        }
      }
    }

    // Fotos de Campo (driver_docs)
    if (t.driver_docs && Array.isArray(t.driver_docs)) {
      const newDocs = [];
      for (const img of t.driver_docs) {
        const res = await getFileBuffer(img.url, 'trips');
        if (res) {
          const photoId = img.id || `img_${Date.now()}`;
          const newPath = `trips/${osClean}/fotos_campo/${photoId}.jpg`;
          const url = await uploadToR2(res.data, newPath, 'image/jpeg');
          if (url) newDocs.push({ ...img, url });
          else newDocs.push(img);
        } else {
          newDocs.push(img);
        }
      }
      updates.driver_docs = newDocs;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('trips').update(updates).eq('id', t.id);
      console.log(`  [OK] OS ${t.os} organizada.`);
    }
  }

  console.log("\n✅ MIGRAÇÃO E ORGANIZAÇÃO CONCLUÍDA!");
}

start();
