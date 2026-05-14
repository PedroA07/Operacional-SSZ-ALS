
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

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  // Worker via URL do pacote instalado
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

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

export function parseFreightContractText(text: string): ParsedFreightContract {
  const result: ParsedFreightContract = {};

  // ── Prev. Término ────────────────────────────────────────────────────────────
  // Padrões: "Prev. Término: 06/05/2026" ou "Prev.Término:06/05/2026" etc.
  const termMatch = text.match(/Prev\.?\s*T[eé]rmin[oa][\s:]*(\d{2}\/\d{2}\/\d{4})/i);
  if (termMatch) result.prevTermino = termMatch[1];

  // ── Origem e Destino ─────────────────────────────────────────────────────────
  // Formato nos PDFs: "GUARUJA - SP" ou "GUARULHOS - SP"
  const origemMatch = text.match(/Origem[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+ - [A-Z]{2})/i);
  const destinoMatch = text.match(/Destino[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+ - [A-Z]{2})/i);

  const origem = origemMatch?.[1]?.trim();
  const destino = destinoMatch?.[1]?.trim();

  // Prefere o lado que NÃO é Guarujá/Santos
  if (destino && !isExcludedCity(destino)) {
    result.localidade = destino;
  } else if (origem && !isExcludedCity(origem)) {
    result.localidade = origem;
  } else if (destino) {
    // Ambos excluídos — usa o destino mesmo assim
    result.localidade = destino;
  }

  // ── Motorista ─────────────────────────────────────────────────────────────────
  // Linha: "Motorista: NOME COMPLETO CPF: ..."
  const motMatch = text.match(/Motorista[\s:]+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s]+?)(?:\s{2,}|\s+CPF[\s:]|\s+CNH[\s:]|\s+Fone[\s:])/i);
  if (motMatch) result.motorista = motMatch[1].trim();

  // ── Container ─────────────────────────────────────────────────────────────────
  // Padrão: "Nr conteiner: XXXX1234567," — captura primeiro número
  const ctnMatch = text.match(/Nr\s*conteiner[\s:]+([A-Z]{4}\d{7})/i);
  if (ctnMatch) result.container = ctnMatch[1].toUpperCase();

  return result;
}
