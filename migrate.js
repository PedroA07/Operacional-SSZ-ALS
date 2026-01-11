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

async function getFileBuffer(source, supabaseBucket) {
  if (!source) return null;
  if (source.startsWith('data:')) {
    const parts = source.split(',');
    const mime = parts[0].split(':')[1].split(';')[0];
    return { data: Buffer.from(parts[1], 'base64'), mime };
  }
  
  // Se for um link do R2 antigo ou Supabase, tenta baixar
  const downloadUrl = source.startsWith('http') ? source : null;
  
  try {
    if (downloadUrl) {
      const resp = await fetch(downloadUrl);
      if (!resp.ok) return null;
      const arrayBuffer = await resp.arrayBuffer();
      return { 
        data: Buffer.from(arrayBuffer), 
        mime: downloadUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' 
      };
    } else {
      // É um path do Supabase Storage
      const cleanPath = source.replace(`${supabaseBucket}/`, '');
      const { data, error } = await supabase.storage.from(supabaseBucket).download(cleanPath);
      if (error) return null;
      return { 
        data: Buffer.from(await data.arrayBuffer()), 
        mime: cleanPath.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg' 
      };
    }
  } catch (e) { return null; }
}

async function start() {
  console.log("🚀 INICIANDO REORGANIZAÇÃO COMPLETA DE PASTAS NO R2");

  // 1. COLABORADORES (ANTIGA PASTA DOCUMENTOS/ OU USERS/)
  console.log("\n--- Organizando: colaboradores/[id]/foto_perfil/ ---");
  const { data: staff } = await supabase.from('staff').select('id, photo, name');
  for (const s of (staff || [])) {
    if (s.photo) {
      const res = await getFileBuffer(s.photo, 'drivers'); 
      if (res) {
        const newPath = `colaboradores/${s.id}/foto_perfil/perfil.jpg`;
        const url = await uploadToR2(res.data, newPath, res.mime);
        if (url) {
          await supabase.from('staff').update({ photo: url }).eq('id', s.id);
          // Atualiza também na tabela de usuários para sincronismo
          await supabase.from('users').update({ photo: url }).eq('staff_id', s.id);
          console.log(`  [OK] Colaborador ${s.name} organizado.`);
        }
      }
    }
  }

  // 2. MOTORISTAS (drivers/[id]/foto_perfil/ e drivers/[id]/cnh/)
  console.log("\n--- Organizando: drivers/[id]/ ---");
  const { data: drivers } = await supabase.from('drivers').select('id, photo, cnh_pdf_url, name');
  for (const d of (drivers || [])) {
    // Foto de Perfil
    if (d.photo) {
      const res = await getFileBuffer(d.photo, 'drivers');
      if (res) {
        const newPath = `drivers/${d.id}/foto_perfil/perfil.jpg`;
        const url = await uploadToR2(res.data, newPath, res.mime);
        if (url) await supabase.from('drivers').update({ photo: url }).eq('id', d.id);
      }
    }
    // CNH PDF
    if (d.cnh_pdf_url) {
      const res = await getFileBuffer(d.cnh_pdf_url, 'drivers');
      if (res) {
        const newPath = `drivers/${d.id}/cnh/cnh.pdf`;
        const url = await uploadToR2(res.data, newPath, 'application/pdf');
        if (url) await supabase.from('drivers').update({ cnh_pdf_url: url }).eq('id', d.id);
      }
    }
    console.log(`  [OK] Motorista ${d.name} organizado.`);
  }

  // 3. VIAGENS (trips/[os]/documentos/ e trips/[os]/fotos_campo/)
  console.log("\n--- Organizando: trips/[os]/ ---");
  const { data: trips } = await supabase.from('trips').select('*');
  for (const t of (trips || [])) {
    const updates = {};
    const osClean = (t.os || 'sem_os').replace(/[^a-z0-9]/gi, '_');
    
    // PDFs de Documentos (CTE, OS, etc)
    const docFields = ['os_doc', 'cte_doc', 'agendamento_doc', 'completo_doc', 'cva_doc', 'nf_doc', 'freight_contract_doc'];
    for (const field of docFields) {
      if (t[field] && t[field].url) {
        const res = await getFileBuffer(t[field].url, 'trips');
        if (res) {
          const type = field.replace('_doc', '').replace('freight_contract', 'contrato'); 
          const newPath = `trips/${osClean}/documentos/${type}.pdf`;
          const url = await uploadToR2(res.data, newPath, 'application/pdf');
          if (url) updates[field] = { ...t[field], url };
        }
      }
    }

    // Fotos de Campo (array driver_docs)
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
      console.log(`  [OK] OS ${t.os} reorganizada.`);
    }
  }

  console.log("\n✅ REORGANIZAÇÃO CONCLUÍDA! AGORA TUDO ESTÁ EM PASTAS ESPECÍFICAS.");
}

start().catch(err => {
  console.error("❌ ERRO CRÍTICO NA REORGANIZAÇÃO:", err);
  process.exit(1);
});