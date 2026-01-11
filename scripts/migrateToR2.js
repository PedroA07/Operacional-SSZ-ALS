
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

dotenv.config();

// Configurações Supabase (Use Service Role Key!)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configurações R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BUCKET = process.env.R2_BUCKET_NAME;
const R2_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

async function migrateFile(supabasePath, bucketName) {
  if (!supabasePath || supabasePath.startsWith('http')) return null;

  try {
    // 1. Download do Supabase
    const { data, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(supabasePath);

    if (downloadError) throw downloadError;

    // 2. Upload para R2
    const fileExtension = supabasePath.split('.').pop();
    const contentType = fileExtension === 'pdf' ? 'application/pdf' : 'image/jpeg';
    const buffer = Buffer.from(await data.arrayBuffer());

    const uploadCommand = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: supabasePath,
      Body: buffer,
      ContentType: contentType,
    });

    await r2Client.send(uploadCommand);
    
    const newUrl = `${R2_DOMAIN}/${supabasePath}`;
    console.log(`[OK] Migrado: ${supabasePath} -> ${newUrl}`);
    return newUrl;
  } catch (err) {
    console.error(`[ERRO] Falha ao migrar ${supabasePath}:`, err.message);
    return null;
  }
}

async function startMigration() {
  console.log('--- INICIANDO MIGRAÇÃO SUPABASE -> CLOUDFLARE R2 ---');

  // --- 1. MIGRAR MOTORISTAS (FOTOS E CNH) ---
  console.log('\n> Processando Tabela: drivers...');
  const { data: drivers } = await supabase.from('drivers').select('id, photo, cnh_pdf_url');
  for (const driver of (drivers || [])) {
    const updates = {};
    if (driver.photo && !driver.photo.startsWith('http')) {
      const url = await migrateFile(driver.photo, 'drivers');
      if (url) updates.photo = url;
    }
    if (driver.cnh_pdf_url && !driver.cnh_pdf_url.startsWith('http')) {
      const url = await migrateFile(driver.cnh_pdf_url, 'drivers');
      if (url) updates.cnh_pdf_url = url;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('drivers').update(updates).eq('id', driver.id);
    }
  }

  // --- 2. MIGRAR VIAGENS (DOCUMENTOS E DOSSIÊ JSON) ---
  console.log('\n> Processando Tabela: trips...');
  const { data: trips } = await supabase.from('trips').select('*');
  for (const trip of (trips || [])) {
    const updates = {};
    const docFields = ['os_doc', 'agendamento_doc', 'completo_doc', 'freight_contract_doc', 'cte_doc', 'cva_doc', 'nf_doc'];
    
    for (const field of docFields) {
      if (trip[field] && trip[field].url && !trip[field].url.startsWith('http')) {
        const url = await migrateFile(trip[field].url, 'trips');
        if (url) {
          updates[field] = { ...trip[field], url };
        }
      }
    }

    // Processar array JSON driver_docs
    if (trip.driver_docs && Array.isArray(trip.driver_docs)) {
      let changed = false;
      const newDocs = await Promise.all(trip.driver_docs.map(async (doc) => {
        if (doc.url && !doc.url.startsWith('http')) {
          const url = await migrateFile(doc.url, 'trips');
          if (url) { changed = true; return { ...doc, url }; }
        }
        return doc;
      }));
      if (changed) updates.driver_docs = newDocs;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('trips').update(updates).eq('id', trip.id);
    }
  }

  // --- 3. MIGRAR USUÁRIOS E STAFF ---
  console.log('\n> Processando Tabelas: users e staff...');
  const { data: users } = await supabase.from('users').select('id, photo');
  for (const user of (users || [])) {
    if (user.photo && !user.photo.startsWith('http')) {
      const url = await migrateFile(user.photo, 'drivers'); // Fotos costumam estar no bucket drivers ou staff
      if (url) await supabase.from('users').update({ photo: url }).eq('id', user.id);
    }
  }

  console.log('\n--- MIGRAÇÃO CONCLUÍDA COM SUCESSO ---');
}

startMigration().catch(console.error);
