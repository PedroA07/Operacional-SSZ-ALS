
// Cidades excluídas da localidade (porto/origem ALS)
const EXCLUDED_CITIES = ['GUARUJA', 'GUARUJÁ', 'SANTOS'];

export function normAccent(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}

function isExcludedCity(city: string): boolean {
  const n = normAccent(city);
  return EXCLUDED_CITIES.some(exc => n.startsWith(exc));
}

export interface ParsedFreightContract {
  prevTermino?: string;   // "06/05/2026"
  localidade?: string;    // destino ou origem (exceto Guarujá/Santos)
  motorista?: string;
  container?: string;     // primeiro container
  osNumber?: string;      // número de OS encontrado no PDF
}

async function getPdfjsLib() {
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsLib;
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // O pdf.js retorna items na ordem do stream interno do PDF, não em ordem de leitura.
    // Em layouts de tabela/formulário (labels numa coluna, valores em outra) isso embaralha
    // o texto. Ordenamos por linha (y decrescente = topo→baixo) e depois por coluna (x crescente).
    const items = (content.items as any[]).filter(item => item.str?.trim());

    items.sort((a, b) => {
      const ay = a.transform[5], by = b.transform[5];
      const ax = a.transform[4], bx = b.transform[4];
      const yDiff = by - ay;
      // Tolerância de 4pt para considerar na mesma linha
      if (Math.abs(yDiff) > 4) return yDiff;
      return ax - bx;
    });

    // Agrupa em linhas para manter "label: valor" juntos
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let lastY: number | null = null;

    for (const item of items) {
      const y = item.transform[5];
      if (lastY === null || Math.abs(y - lastY) <= 4) {
        currentLine.push(item.str);
      } else {
        if (currentLine.length) lines.push(currentLine);
        currentLine = [item.str];
      }
      lastY = y;
    }
    if (currentLine.length) lines.push(currentLine);

    pages.push(lines.map(line => line.join(' ')).join('\n'));
  }
  return pages.join('\n');
}

// ── Compressão de PDF ─────────────────────────────────────────────────────────
// Renderiza cada página em canvas JPEG e reconstrói o PDF via jsPDF.
// Só aplica se o arquivo for maior que THRESHOLD ou for imagem escaneada.
// Sempre compara tamanho final: retorna o menor.
const COMPRESS_THRESHOLD_BYTES = 300 * 1024; // 300 KB
const RENDER_SCALE = 1.5;   // resolução do canvas (72 × 1.5 = 108 DPI)
const JPEG_QUALITY = 0.78;  // 0–1

export async function compressPDFForStorage(file: File): Promise<{ file: File; compressed: boolean }> {
  if (file.size < COMPRESS_THRESHOLD_BYTES) {
    return { file, compressed: false };
  }

  try {
    const pdfjsLib = await getPdfjsLib();
    const { jsPDF } = await import('jspdf');

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

    let doc: InstanceType<typeof jsPDF> | null = null;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: RENDER_SCALE });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;

      const imgData = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

      // Dimensões em mm (96 DPI base para canvas)
      const wMM = (viewport.width / RENDER_SCALE) * (25.4 / 72);
      const hMM = (viewport.height / RENDER_SCALE) * (25.4 / 72);
      const orientation = wMM > hMM ? 'l' : 'p';

      if (!doc) {
        doc = new jsPDF({ orientation, unit: 'mm', format: [wMM, hMM] });
      } else {
        doc.addPage([wMM, hMM], orientation);
      }
      doc.addImage(imgData, 'JPEG', 0, 0, wMM, hMM);
    }

    if (!doc) return { file, compressed: false };

    const blob = doc.output('blob');
    // Só usa versão comprimida se for realmente menor
    if (blob.size < file.size) {
      const smaller = new File([blob], file.name, { type: 'application/pdf' });
      return { file: smaller, compressed: true };
    }
    return { file, compressed: false };
  } catch {
    // Fallback silencioso: usa o original
    return { file, compressed: false };
  }
}

export function parseFreightContractText(text: string): ParsedFreightContract {
  const result: ParsedFreightContract = {};

  // ── Prev. Término ─────────────────────────────────────────────────────────────
  // Cobre: "Prev. Término: 06/05/2026" e "Prev. Término 06/05/2026" etc.
  const termMatch = text.match(/Prev\.?\s*T[eé]rmin[oa][o]?[\s:]+(\d{2}\/\d{2}\/\d{4})/i);
  if (termMatch) result.prevTermino = termMatch[1];

  // ── Origem e Destino ──────────────────────────────────────────────────────────
  // Formato: "GUARUJA - SP" ou "GUARULHOS - SP"
  // Captura palavras maiúsculas (com acentos e espaços) seguidas de " - XX"
  const origemMatch = text.match(/Origem[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ ]+?)\s*-\s*([A-Z]{2})\b/i);
  const destinoMatch = text.match(/Destino[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ ]+?)\s*-\s*([A-Z]{2})\b/i);

  const origem = origemMatch ? `${origemMatch[1].trim()} - ${origemMatch[2]}` : undefined;
  const destino = destinoMatch ? `${destinoMatch[1].trim()} - ${destinoMatch[2]}` : undefined;

  if (destino && !isExcludedCity(destino)) {
    result.localidade = destino;
  } else if (origem && !isExcludedCity(origem)) {
    result.localidade = origem;
  } else if (destino) {
    result.localidade = destino;
  }

  // ── Motorista ─────────────────────────────────────────────────────────────────
  // Linha típica: "Motorista: NOME COMPLETO" seguido de CPF/CNH/Fone ou fim de linha
  const motMatch = text.match(
    /Motorista[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ ]{3,}?)(?:\s+CPF|\s+CNH|\s+Fone|\s{3,}|\n|$)/im
  );
  if (motMatch) result.motorista = motMatch[1].trim();

  // ── Container ─────────────────────────────────────────────────────────────────
  // Padrão: "Nr conteiner: HASU4364753," — captura SOMENTE o primeiro
  // Aceita espaço/hífen entre letras e dígitos e 6-7 dígitos (ISO 6346)
  const normCtn = (s: string) => s.toUpperCase().replace(/[\s\-_.]/g, '');
  const ctnMatch = text.match(/Nr\.?\s*conteiner[:\s]+([A-Z]{4}[\s\-]?\d{6,7})/i);
  if (ctnMatch) {
    result.container = normCtn(ctnMatch[1]);
  } else {
    // Fallback: qualquer sequência 4 letras + 6-7 dígitos (com ou sem espaço/hífen)
    const fallback = text.match(/\b([A-Z]{4})[\s\-]?(\d{6,7})\b/);
    if (fallback) result.container = normCtn(fallback[1] + fallback[2]);
  }

  // ── Número de OS ──────────────────────────────────────────────────────────────
  // Cobre: "O.S.: 6ALC588885A", "OS: 12345", "Ordem de Serviço: 6ALC588885A"
  // OS da ALS é alfanumérico (ex: 6ALC588885A) ou numérico (ex: 12345)
  const osMatch = text.match(
    /(?:O\.?\s*S\.?|Ordem\s+de\s+Servi[cç]o)[\s:]+([A-Z0-9]{4,15})/i
  );
  if (osMatch) result.osNumber = osMatch[1].trim().toUpperCase();

  return result;
}
