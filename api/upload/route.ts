
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Singleton do S3 Client para performance
let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (!s3Client) {
    // Se o endpoint vier com o nome do bucket no final, limpamos para o S3Client não se confundir
    const cleanEndpoint = process.env.R2_ENDPOINT?.split('.com')[0] + '.com';
    
    s3Client = new S3Client({
      region: "auto",
      endpoint: cleanEndpoint,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3Client;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "general";
    
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo não fornecido" }), { status: 400 });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    // Remove espaços e caracteres especiais do nome do arquivo para evitar erros de URL
    const safeFileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const fileName = `${folder}/${Date.now()}_${safeFileName}`;
    
    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: fileBytes,
      ContentType: file.type,
    });

    await client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${fileName}`;

    return new Response(JSON.stringify({ url: publicUrl, path: fileName }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[R2 Upload Error]:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
