
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
    const rawPath = (formData.get("path") as string) || ""; 
    const bucketName = process.env.R2_BUCKET_NAME || "";
    
    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo ausente" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // LIMPEZA ABSOLUTA DA KEY (CHAVE DO OBJETO)
    // 1. Remove qualquer barra inicial que impediria o Regex de funcionar
    let finalKey = rawPath.trim().replace(/^\/+/, '');
    
    // 2. Remove o nome do bucket ou 'als-transportes' do início se existir
    if (bucketName) {
      const bucketPattern = new RegExp(`^${bucketName}/?`, 'i');
      finalKey = finalKey.replace(bucketPattern, '');
    }
    
    // 3. Remove variação manual 'als-transportes' por segurança extra
    finalKey = finalKey.replace(/^(als[- ]transportes\/)+/i, '');

    // 4. Limpeza final de barras residuais e normalização
    finalKey = finalKey
      .replace(/^\/+/, '')
      .replace(/\/+/g, '/');

    // Fallback para nome do arquivo caso a chave fique vazia
    if (!finalKey) {
      finalKey = file.name || `upload_${Date.now()}.jpg`;
    }
    
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const client = getS3Client();
    
    // AQUI: Bucket recebe o nome correto, Key recebe APENAS o caminho interno
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
    
    // A URL pública agora é montada sem a pasta als-transportes
    const publicUrl = `${domain}/${finalKey}`;

    return new Response(JSON.stringify({ 
      url: publicUrl, 
      path: finalKey,
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
