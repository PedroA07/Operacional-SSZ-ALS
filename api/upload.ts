
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
    const bucketName = process.env.R2_BUCKET_NAME || "";
    
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo ausente" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // LIMPEZA SUPREMA DA CHAVE (KEY):
    // 1. Remove o nome do bucket do início (caso venha no path por erro de config)
    // 2. Remove 'als-transportes' de qualquer forma no início
    let finalKey = rawPath.trim();
    
    if (bucketName && finalKey.toLowerCase().startsWith(bucketName.toLowerCase())) {
      finalKey = finalKey.substring(bucketName.length);
    }

    finalKey = finalKey
      .replace(/^(als[- ]transportes\/)+/i, '') // Remove o nome indesejado no início
      .replace(/^(als[- ]transportes)+/i, '')   // Remove sem a barra também
      .replace(/^\/+/, '')                     // Remove barras iniciais residuais
      .replace(/\/+/g, '/');                    // Normaliza barras duplas no meio

    // Se o path ficou vazio após a limpeza, usa o nome do arquivo na raiz
    if (!finalKey) {
      finalKey = file.name || `upload_${Date.now()}.jpg`;
    }
    
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
