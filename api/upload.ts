
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

    // NORMALIZAÇÃO RADICAL: 
    // 1. Remove barras iniciais
    // 2. Remove qualquer menção acidental a 'als-transportes/' no início do path 
    //    para garantir que 'trips/...' seja a raiz.
    let cleanKey = rawPath.replace(/^\/+/, '');
    if (cleanKey.startsWith('als-transportes/')) {
      cleanKey = cleanKey.replace('als-transportes/', '');
    }
    
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
    
    // O link final DEVE ser dominio/trips/... sem o prefixo da empresa
    const publicUrl = `${domain}/${cleanKey}`;

    console.log(`[R2 STORAGE] Arquivo gravado com Key: ${cleanKey}`);
    console.log(`[R2 STORAGE] URL Gerada: ${publicUrl}`);

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
    return new Response(JSON.stringify({ error: `Falha no R2: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
