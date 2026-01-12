
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = 'edge';

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

export async function POST(request: Request) {
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

    // LIMPEZA ABSOLUTA (Igual ao handler principal)
    const cleanKey = rawPath
      .replace(/als[- ]transportes\//gi, '')
      .replace(/als[- ]transportes/gi, '')
      .replace(/\/+/g, '/')
      .replace(/^\/+/, '');

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: cleanKey || file.name,
      Body: fileBytes,
      ContentType: file.type || 'image/jpeg',
    });

    await client.send(command);

    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    domain = domain.trim().replace(/\/$/, "");
    if (domain && !domain.startsWith('http')) domain = `https://${domain}`;

    const publicUrl = `${domain}/${cleanKey || file.name}`;

    return new Response(JSON.stringify({ url: publicUrl, path: cleanKey || file.name }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[R2 Route Error]:", error);
    return new Response(JSON.stringify({ error: `Falha no S3: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
