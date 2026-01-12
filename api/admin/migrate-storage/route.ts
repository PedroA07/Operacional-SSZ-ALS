
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from '@supabase/supabase-js';

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

const getSupabase = () => createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const normalizeFolderName = (name: string): string => {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
};

export async function POST(request: Request) {
  const migrationKey = request.headers.get("x-migration-key");
  if (migrationKey !== "als-master-2025") {
    return new Response(JSON.stringify({ error: "Acesso Negado." }), { status: 403 });
  }

  const client = getS3Client();
  const supabase = getSupabase();
  const bucketName = process.env.R2_BUCKET_NAME || "als-transportes";
  const targetPrefix = "als-transportes/";

  try {
    // 1. Carregar mapeamento de Staff ID -> Nome do Supabase
    const { data: staffList } = await supabase.from('staff').select('id, name');
    const staffMap = new Map();
    (staffList || []).forEach(s => staffMap.set(s.id, normalizeFolderName(s.name)));

    let continuationToken: string | undefined = undefined;
    let totalMoved = 0;
    const logs: string[] = [];

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });

      const listResponse = await client.send(listCommand);
      if (!listResponse.Contents) break;

      for (const item of listResponse.Contents) {
        const sourceKey = item.Key;
        if (!sourceKey || sourceKey.startsWith(targetPrefix)) continue;

        let destinationKey = sourceKey;

        // Regra especial: colaboradores/[id] -> colaboradores/[nome_normalizado]
        if (sourceKey.startsWith('colaboradores/')) {
          const parts = sourceKey.split('/');
          const id = parts[1];
          if (staffMap.has(id)) {
            const name = staffMap.get(id);
            parts[1] = name;
            destinationKey = parts.join('/');
          }
        }

        // Adiciona prefixo pai
        const finalDestKey = `${targetPrefix}${destinationKey}`;

        try {
          // Copiar
          await client.send(new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${encodeURIComponent(sourceKey)}`,
            Key: finalDestKey,
          }));

          // Deletar original
          await client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: sourceKey,
          }));

          totalMoved++;
          console.log(`[MIGRAÇÃO] Mover: ${sourceKey} -> ${finalDestKey}`);
        } catch (err: any) {
          logs.push(`Erro em ${sourceKey}: ${err.message}`);
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    return new Response(JSON.stringify({ 
      success: true, 
      moved: totalMoved, 
      errors: logs,
      message: "Migração R2 concluída: pastas movidas para o prefixo pai e colaboradores renomeados por nome."
    }), { status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
