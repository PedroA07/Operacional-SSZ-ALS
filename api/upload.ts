
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
    const path = formData.get("path") as string; 
    
    if (!file || !path) {
      return new Response(JSON.stringify({ error: "Dados do arquivo ausentes" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    // Define o MIME type corretamente. Se não vier do arquivo, assume jpeg.
    const contentType = file.type || 'image/jpeg';

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: path,
      Body: fileBytes,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000", // Cache de 1 ano para performance
    });

    await client.send(command);

    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    if (domain && !domain.startsWith('http')) {
      domain = `https://${domain}`;
    }
    
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
    console.error("[R2 Upload Error]:", error);
    return new Response(JSON.stringify({ error: `Falha no R2: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
