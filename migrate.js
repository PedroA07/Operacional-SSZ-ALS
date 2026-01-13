const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// Configurações extraídas do ambiente
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT.split('.com')[0] + '.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET_R2 = process.env.R2_BUCKET_NAME;
const DOMAIN_R2 = process.env.R2_PUBLIC_DOMAIN;
const PARENT_FOLDER = 'als-transportes/';

/**
 * Normaliza nomes para uso em pastas (Sem acentos, espaços -> underscores)
 */
const normalizeName = (name) => {
  if (!name) return 'SEM_NOME';
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
};

/**
 * Função para baixar um arquivo e retornar buffer
 */
async function getBufferFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (e) {
    return null;
  }
}

async function startMigration() {
  console.log('🚀 Iniciando Migração: ID -> NOME (Drivers)');

  // 1. Buscar todos os motoristas
  const { data: drivers, error } = await supabase.from('drivers').select('id, name, photo, cnh_pdf_url');
  if (error) {
    console.error('Erro ao buscar motoristas:', error);
    process.exit(1);
  }

  for (const driver of drivers) {
    const normalizedName = normalizeName(driver.name);
    const updates = {};
    let hasChanges = false;

    console.log(`\n--- Processando: ${driver.name} ---`);

    // Migrar Foto de Perfil
    if (driver.photo && driver.photo.includes('/drivers/') && !driver.photo.includes(normalizedName)) {
      const buffer = await getBufferFromUrl(driver.photo);
      if (buffer) {
        const newPath = `${PARENT_FOLDER}drivers/${normalizedName}/foto_perfil/perfil.jpg`;
        await r2Client.send(new PutObjectCommand({
          Bucket: BUCKET_R2,
          Key: newPath,
          Body: buffer,
          ContentType: 'image/jpeg'
        }));
        updates.photo = `${DOMAIN_R2}/${newPath}`;
        hasChanges = true;
        console.log(`  [OK] Foto movida para: ${newPath}`);
      }
    }

    // Migrar CNH PDF
    if (driver.cnh_pdf_url && driver.cnh_pdf_url.includes('/drivers/') && !driver.cnh_pdf_url.includes(normalizedName)) {
      const buffer = await getBufferFromUrl(driver.cnh_pdf_url);
      if (buffer) {
        const newPath = `${PARENT_FOLDER}drivers/${normalizedName}/cnh/cnh.pdf`;
        await r2Client.send(new PutObjectCommand({
          Bucket: BUCKET_R2,
          Key: newPath,
          Body: buffer,
          ContentType: 'application/pdf'
        }));
        updates.cnh_pdf_url = `${DOMAIN_R2}/${newPath}`;
        hasChanges = true;
        console.log(`  [OK] CNH movida para: ${newPath}`);
      }
    }

    if (hasChanges) {
      const { error: upError } = await supabase.from('drivers').update(updates).eq('id', driver.id);
      if (upError) console.error(`  [X] Erro ao atualizar DB para ${driver.name}`);
      else console.log(`  [✓] Banco de dados atualizado.`);
    } else {
      console.log(`  [!] Nenhuma migração necessária ou arquivos já organizados.`);
    }
  }

  console.log('\n✅ Migração concluída!');
}

startMigration().catch(console.error);