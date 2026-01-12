
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const config = {
  runtime: 'edge',
};

// Inicialização do cliente S3 para Cloudflare R2
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
    const path = formData.get("path") as string; 
    
    if (!file || !path) {
      return new Response(JSON.stringify({ error: "Dados do arquivo ausentes na requisição" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Converte o arquivo para bytes para o SDK do S3
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: path,
      Body: fileBytes,
      ContentType: file.type || 'image/jpeg',
    });

    await client.send(command);

    // Constrói a URL pública final
    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    if (domain && !domain.startsWith('http')) {
      domain = `https://${domain}`;
    }
    
    // Remove barras duplicadas na construção da URL
    const publicUrl = `${domain.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

    return new Response(JSON.stringify({ 
      url: publicUrl, 
      path: path,
      success: true 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[R2 Upload Critical Error]:", error);
    return new Response(JSON.stringify({ 
      error: `Erro no servidor de arquivos: ${error.message}`,
      code: error.code || 'UNKNOWN_ERROR'
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
