
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
    const rawPath = (formData.get("path") as string) || ""; 
    const bucketName = process.env.R2_BUCKET_NAME || "als-transportes";
    
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo ausente" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Limpeza da Key para gravação física
    const cleanPath = rawPath
      .replace(/^als-transportes\//i, '')
      .replace(/^als-transportes/i, '')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');

    // Sempre grava com o prefixo als-transportes/ para que a key bata com a URL pública
    const finalKey = `als-transportes/${cleanPath}`;

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: finalKey, 
      Body: fileBytes,
      ContentType: file.type || 'image/jpeg',
      CacheControl: "public, max-age=31536000",
    });

    await client.send(command);

    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    domain = domain.trim().replace(/\/$/, "");
    if (domain && !domain.startsWith('http')) domain = `https://${domain}`;
    
    // URL pública: domain + key completa (que já inclui als-transportes/)
    const publicUrl = `${domain}/${finalKey}`;

    return new Response(JSON.stringify({
      url: publicUrl,
      path: finalKey,
      success: true 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[R2 Error]:", error);
    return new Response(JSON.stringify({ error: `Erro R2: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
