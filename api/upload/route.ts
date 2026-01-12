
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
    const path = formData.get("path") as string; 
    
    if (!file || !path) {
      return new Response(JSON.stringify({ error: "Arquivo ou destino (path) ausente" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: path,
      Body: fileBytes,
      ContentType: file.type || 'image/jpeg',
    });

    await client.send(command);

    const publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/${path}`;

    return new Response(JSON.stringify({ url: publicUrl, path: path }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[R2 Upload Error]:", error);
    return new Response(JSON.stringify({ error: `Falha no S3: ${error.message}` }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
