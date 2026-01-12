
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || "als-transportes";

  // LÓGICA DE EXCLUSÃO (DELETE)
  if (request.method === 'DELETE') {
    try {
      const { path } = await request.json();
      if (!path) return new Response(JSON.stringify({ error: "Caminho ausente" }), { status: 400 });

      // Limpa o path para garantir que seja apenas a Key do R2
      const finalKey = path
        .replace(/.*\/als-transportes\//, '')
        .replace(/^als-transportes\//, '')
        .replace(/^\/+/, '');

      const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: finalKey,
      });

      await client.send(command);
      return new Response(JSON.stringify({ success: true, message: "Arquivo removido do R2" }), { status: 200 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: `Erro ao deletar: ${error.message}` }), { status: 500 });
    }
  }

  // LÓGICA DE UPLOAD (POST)
  if (request.method === 'POST') {
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

      const finalKey = rawPath
        .replace(/^als-transportes\//i, '') 
        .replace(/^als-transportes/i, '')
        .replace(/^\/+/, '')
        .replace(/\/+/g, '/');

      const fileBytes = new Uint8Array(await file.arrayBuffer());
      
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
      
      const publicUrl = `${domain}/als-transportes/${finalKey}`;

      return new Response(JSON.stringify({ 
        url: publicUrl, 
        path: `als-transportes/${finalKey}`,
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

  return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
}
