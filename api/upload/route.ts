
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
    const rawPath = formData.get("path") as string; 
    
    if (!file || !rawPath) {
      return new Response(JSON.stringify({ error: "Arquivo ou destino ausente" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // LIMPEZA SEGMENTADA IGUAL AO HANDLER PRINCIPAL
    const cleanKey = rawPath
      .split('/')
      .filter(segment => {
        const s = segment.toLowerCase().trim();
        return s !== '' && s !== 'als-transportes' && s !== 'als transportes';
      })
      .join('/');

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: cleanKey,
      Body: fileBytes,
      ContentType: file.type || 'image/jpeg',
    });

    await client.send(command);

    let domain = process.env.R2_PUBLIC_DOMAIN || "";
    domain = domain.trim().replace(/\/$/, "");
    if (domain && !domain.startsWith('http')) domain = `https://${domain}`;

    const publicUrl = `${domain}/${cleanKey}`;

    return new Response(JSON.stringify({ url: publicUrl, path: cleanKey }), {
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
