
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const config = { runtime: 'edge' };

const getS3Client = () =>
  new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });

export default async function handler(request: Request) {
  if (request.method !== 'DELETE') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  try {
    const { key } = (await request.json()) as { key: string };
    if (!key) {
      return new Response(JSON.stringify({ error: 'key obrigatória' }), { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "als-transportes";
    await getS3Client().send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[R2 Delete Error]:", error);
    return new Response(JSON.stringify({ error: `Erro R2: ${error.message}` }), { status: 500 });
  }
}
