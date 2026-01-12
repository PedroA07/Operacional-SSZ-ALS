
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
    
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo ausente" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // LIMPEZA AGRESSIVA DO CAMINHO:
    // 1. Remove barras duplas e espaços
    let finalKey = rawPath.replace(/\/+/g, '/').replace(/^\/+/, '').trim();
    
    // 2. Remove TODAS as ocorrências de "als-transportes/" ou "als transportes/" do início da string.
    // Isso evita als-transportes/als-transportes/trips/... 
    // Usamos um loop para garantir que mesmo se estiver triplicado por erro, seja removido.
    while (finalKey.toLowerCase().startsWith('als-transportes/') || finalKey.toLowerCase().startsWith('als transportes/')) {
      finalKey = finalKey.replace(/^(als[- ]transportes\/)/i, '');
    }
    
    // 3. Garante que o caminho final não comece com barra
    finalKey = finalKey.replace(/^\/+/, '');
    
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const contentType = file.type || 'image/jpeg';

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: finalKey, 
      Body: fileBytes,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    });

    await client.send(command);

    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    domain = domain.trim().replace(/\/$/, "");
    if (domain && !domain.startsWith('http')) domain = `https://${domain}`;
    
    // A URL pública agora aponta corretamente para o arquivo na raiz do bucket
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
