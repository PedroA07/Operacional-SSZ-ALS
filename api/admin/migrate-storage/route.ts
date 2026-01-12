
import { S3Client, ListObjectsV2Command, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

/**
 * Endpoint de Migração Crítica:
 * Move arquivos de pastas raiz (trips/, drivers/, colaboradores/) 
 * para dentro da pasta pai als-transportes/
 */
export async function POST(request: Request) {
  // Proteção simples contra execução acidental
  const migrationKey = request.headers.get("x-migration-key");
  if (migrationKey !== "als-master-2025") {
    return new Response(JSON.stringify({ error: "Chave de migração inválida ou ausente." }), { status: 403 });
  }

  const client = getS3Client();
  const bucketName = process.env.R2_BUCKET_NAME || "als-transportes";
  const targetPrefix = "als-transportes/";

  try {
    let continuationToken: string | undefined = undefined;
    let totalProcessed = 0;
    let totalMoved = 0;
    const log: string[] = [];

    console.log(`[MIGRAÇÃO] Iniciando varredura no bucket: ${bucketName}`);

    do {
      // 1. Listar objetos no bucket
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });

      const listResponse = await client.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) break;

      for (const item of listResponse.Contents) {
        const sourceKey = item.Key;
        if (!sourceKey) continue;

        totalProcessed++;

        // Pular se já estiver na pasta destino ou se for a própria pasta destino
        if (sourceKey.startsWith(targetPrefix) || sourceKey === targetPrefix) {
          continue;
        }

        const destinationKey = `${targetPrefix}${sourceKey}`;

        try {
          // 2. Copiar objeto para o novo caminho
          // Nota: CopySource deve ser bucket/key
          await client.send(new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${encodeURIComponent(sourceKey)}`,
            Key: destinationKey,
          }));

          // 3. Deletar objeto original (apenas após o sucesso da cópia)
          await client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: sourceKey,
          }));

          totalMoved++;
          console.log(`[OK] Movido: ${sourceKey} -> ${destinationKey}`);
        } catch (copyErr: any) {
          console.error(`[ERRO] Falha ao mover ${sourceKey}:`, copyErr.message);
          log.push(`Erro em ${sourceKey}: ${copyErr.message}`);
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_bucket_items: totalProcessed,
        items_moved: totalMoved,
        errors: log
      },
      message: "Migração de storage concluída. Verifique os logs para detalhes de erros individuais."
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[MIGRAÇÃO] Erro Crítico:", error);
    return new Response(JSON.stringify({ 
      error: `Falha na migração: ${error.message}`,
      stack: error.stack 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
