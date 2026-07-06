
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

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

// Proxy de download do R2 — evita depender de CORS no domínio público do bucket
export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Método não permitido' }), { status: 405 });
  }

  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    const name = url.searchParams.get('name') || key?.split('/').pop() || 'arquivo';
    if (!key) {
      return new Response(JSON.stringify({ error: 'key obrigatória' }), { status: 400 });
    }

    const bucketName = process.env.R2_BUCKET_NAME || "als-transportes";
    const data = await getS3Client().send(new GetObjectCommand({ Bucket: bucketName, Key: key }));

    const body = data.Body as unknown as ReadableStream;
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": data.ContentType || 'application/octet-stream',
        "Content-Disposition": `attachment; filename="${encodeURIComponent(name)}"`,
        "Cache-Control": "private, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[R2 Download Error]:", error);
    return new Response(JSON.stringify({ error: `Erro R2: ${error.message}` }), { status: 500 });
  }
}
