
// Cidades excluídas da localidade (porto/origem ALS)
const EXCLUDED_CITIES = ['GUARUJA', 'GUARUJÁ', 'SANTOS'];

function normAccent(s: string): string {
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
    pages.push(content.items.map((item: any) => item.str).join(' '));
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

  // ── Prev. Término ────────────────────────────────────────────────────────────
  const termMatch = text.match(/Prev\.?\s*T[eé]rmin[oa][\s:]*(\d{2}\/\d{2}\/\d{4})/i);
  if (termMatch) result.prevTermino = termMatch[1];

  // ── Origem e Destino ─────────────────────────────────────────────────────────
  const origemMatch = text.match(/Origem[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+ - [A-Z]{2})/i);
  const destinoMatch = text.match(/Destino[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+ - [A-Z]{2})/i);

  const origem = origemMatch?.[1]?.trim();
  const destino = destinoMatch?.[1]?.trim();

  if (destino && !isExcludedCity(destino)) {
    result.localidade = destino;
  } else if (origem && !isExcludedCity(origem)) {
    result.localidade = origem;
  } else if (destino) {
    result.localidade = destino;
  }

  // ── Motorista ─────────────────────────────────────────────────────────────────
  const motMatch = text.match(/Motorista[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+?)(?:\s{2,}|\s+CPF[\s:]|\s+CNH[\s:]|\s+Fone[\s:])/i);
  if (motMatch) result.motorista = motMatch[1].trim();

  // ── Container ─────────────────────────────────────────────────────────────────
  const ctnMatch = text.match(/Nr\s*conteiner[\s:]+([A-Z]{4}\d{7})/i);
  if (ctnMatch) result.container = ctnMatch[1].toUpperCase();

  return result;
}
