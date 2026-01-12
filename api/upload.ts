
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

    // LIMPEZA DEFINITIVA DA KEY
    // Remove o nome do bucket do início da string (Key) para não criar pasta com o nome do bucket
    let finalKey = rawPath.trim();
    
    // Regex para remover o nome do bucket ou 'als-transportes' do início, seguido ou não de barra
    const bucketCleanupRegex = new RegExp(`^(${bucketName}|als[-_]transportes)\/?`, 'i');
    finalKey = finalKey.replace(bucketCleanupRegex, '');

    // Limpeza de barras iniciais e duplas
    finalKey = finalKey
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');

    if (!finalKey) {
      finalKey = file.name || `upload_${Date.now()}.jpg`;
    }
    
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: finalKey, // A Key agora é estritamente o caminho interno
      Body: fileBytes,
      ContentType: file.type || 'image/jpeg',
      CacheControl: "public, max-age=31536000",
    });

    await client.send(command);

    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    domain = domain.trim().replace(/\/$/, "");
    if (domain && !domain.startsWith('http')) domain = `https://${domain}`;
    
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
