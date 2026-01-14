
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
    const bucketName = process.env.R2_BUCKET_NAME || "als-transportes";
    
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo ausente" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Limpeza da Key: Remove o bucket se ele vier no path e garante que não haja barras duplas
    // O R2 grava a partir da raiz do bucket, então a Key não deve começar com o nome do bucket
    const cleanKey = rawPath
      .replace(new RegExp(`^${bucketName}/`, 'i'), '')
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: cleanKey,
      Body: fileBytes,
      ContentType: file.type || 'image/jpeg',
      CacheControl: "public, max-age=31536000",
    });

    await client.send(command);

    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    domain = domain.trim().replace(/\/$/, "");
    if (domain && !domain.startsWith('http')) domain = `https://${domain}`;

    // CONSTRUÇÃO DA URL PÚBLICA:
    // Forçamos o prefixo als-transportes/ na URL para compatibilidade com o sistema de visualização
    const publicUrl = `${domain}/als-transportes/${cleanKey}`;

    return new Response(JSON.stringify({ 
      url: publicUrl, 
      path: `als-transportes/${cleanKey}`,
      success: true 
    }), {
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
