import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Singleton do S3 Client para evitar múltiplas instâncias em Serverless (Performance)
let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
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
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    // Fix: Replaced Node.js 'Buffer' with 'Uint8Array' for universal environment compatibility (e.g. Edge runtime support)
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const fileName = `${folder}/${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    
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