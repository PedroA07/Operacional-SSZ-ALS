
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = {
  runtime: 'edge',
};

const getS3Client = () => {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawPath = formData.get("path") as string; 
    
    if (!file || !rawPath) {
      return new Response(JSON.stringify({ error: "Arquivo ou caminho ausentes" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // NORMALIZAÇÃO RADICAL E INSENSÍVEL A CASO:
    // 1. Remove barras iniciais
    // 2. Remove qualquer menção a 'als-transportes/' no início (case-insensitive)
    let cleanKey = rawPath.replace(/^\/+/, '');
    
    // Remove "als-transportes/" ou "als-transportes" (com ou sem barra) do início da string
    cleanKey = cleanKey.replace(/^als-transportes\/?/i, '');
    
    // Garante que não sobrou nenhuma barra no início após a remoção do prefixo
    cleanKey = cleanKey.replace(/^\/+/, '');
    
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const contentType = file.type || 'image/jpeg';

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: cleanKey, 
      Body: fileBytes,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    });

    await client.send(command);

    // Montagem da URL Pública
    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    domain = domain.trim().replace(/\/$/, "");
    
    if (domain && !domain.startsWith('http')) {
      domain = `https://${domain}`;
    }
    
    // URL Final: dominio/trips/... (ou drivers/..., etc)
    const publicUrl = `${domain}/${cleanKey}`;

    console.log(`[R2 UPLOAD] Key Final: ${cleanKey}`);
    console.log(`[R2 UPLOAD] URL Gerada: ${publicUrl}`);

    return new Response(JSON.stringify({ 
      url: publicUrl, 
      path: cleanKey,
      success: true 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[R2 Upload Error]:", error);
    return new Response(JSON.stringify({ 
      error: `Falha no R2: ${error.message}` 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
