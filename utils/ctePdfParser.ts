
import { CteDocParty, CteDocSummary, CteDocVolume } from '../types';

// Extrai valores de um DACTE em PDF (best-effort, baseado na camada de texto).
// PDFs escaneados (imagem, sem texto) não têm dados extraíveis.

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

interface TextItem {
  str: string;
  norm: string;
  x: number;
  y: number;
  page: number;
}

const norm = (s: string): string =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

// "1.234.567,89" → 1234567.89 (aceita também formato sem milhar)
const parseBrNumber = (s: string): number | undefined => {
  const cleaned = s.replace(/[^\d.,]/g, '');
  if (!cleaned) return undefined;
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const n = parseFloat(normalized);
  return isNaN(n) ? undefined : n;
};

const CURRENCY_RE = /^R?\$?\s*\d[\d.]*,\d{2}$/;
const NUMBER_RE = /^[\d.]+(,\d+)?$/;
// Itens que SÃO rótulos do formulário DACTE (não valores) — usado para não
// confundir um rótulo vizinho com o nome do remetente/destinatário
const LABEL_EXACT_RE = /^(REMETENTE|DESTINATARIO|EXPEDIDOR|RECEBEDOR|EMITENTE|TOMADOR.*|RAZAO SOCIAL.*|CNPJ.*|CPF.*|ENDERECO.*|MUNICIPIO.*|INSCRICAO.*|IE[\s:].*|PAIS.*|CEP.*|FONE.*|DATA.*|CHAVE.*|PROTOCOLO.*|NATUREZA.*|CFOP.*|MODAL.*|SERIE.*|VALOR.*|PESO.*|QUANTIDADE.*|DACTE.*|DOCUMENTO.*|COMPONENTES.*|OBSERVAC.*|INICIO.*|TERMINO.*|ORIGEM.*|DESTINO.*|TIPO D.*|PRODUTO.*|SITUACAO.*|BASE.*|ALIQUOTA.*)$/;

export interface CtePdfParseResult {
  summary: CteDocSummary;
  found: boolean;
}

export async function parseCtePdf(file: File): Promise<CtePdfParseResult> {
  const pdfjsLib = await getPdfjsLib();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const items: TextItem[] = [];
  const maxPages = Math.min(pdf.numPages, 5);
  for (let p = 1; p <= maxPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const it of content.items as any[]) {
      const str = (it.str || '').trim();
      if (!str) continue;
      items.push({ str, norm: norm(str), x: it.transform[4], y: it.transform[5], page: p });
    }
  }

  // Busca o valor associado a um rótulo: mesmo item (inline), na mesma linha à
  // direita, ou logo abaixo (layout de formulário do DACTE)
  const valueNear = (label: TextItem, valueRe: RegExp, maxDy = 20, maxDx = 70): string | undefined => {
    // Inline: "VALOR TOTAL DO SERVIÇO R$ 1.500,00" num item só
    const inline = label.str.match(/(?:R\$)?\s*(\d[\d.]*,\d{2})\s*$/);
    if (inline && /\d/.test(inline[1])) return inline[1];

    let best: TextItem | undefined;
    let bestScore = Infinity;
    for (const it of items) {
      if (it.page !== label.page || it === label) continue;
      if (!valueRe.test(it.norm)) continue;
      const dy = label.y - it.y; // positivo = abaixo do rótulo
      const dx = Math.abs(it.x - label.x);
      const sameLine = Math.abs(dy) <= 2.5 && it.x > label.x && it.x - label.x < 220;
      const below = dy > 1 && dy <= maxDy && dx <= maxDx;
      if (!sameLine && !below) continue;
      const score = (sameLine ? 0 : dy * 2) + dx;
      if (score < bestScore) { bestScore = score; best = it; }
    }
    return best?.str;
  };

  const findLabels = (re: RegExp): TextItem[] => items.filter(it => re.test(it.norm));

  const labeledCurrency = (labelRe: RegExp, maxDy = 25, maxDx = 140): number | undefined => {
    for (const label of findLabels(labelRe)) {
      const raw = valueNear(label, CURRENCY_RE, maxDy, maxDx);
      const n = raw !== undefined ? parseBrNumber(raw) : undefined;
      if (n !== undefined) return n;
    }
    return undefined;
  };

  // ── Chave de acesso do CT-e (44 dígitos, modelo 57) ────────────────────────
  // Da chave saem nº e série de forma determinística:
  // cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nCT(9) tpEmis(1) cCT(8) cDV(1)
  let chave: string | undefined;
  const chaveCandidates: string[] = [];
  for (const it of items) {
    // Item inteiro (chave agrupada "3526 0712 ...")
    const digits = it.str.replace(/\D/g, '');
    if (digits.length === 44) chaveCandidates.push(digits);
    // Tokens individuais (chave no meio de outros números: "NF-e 013 0000766241 3526...")
    for (const token of it.str.split(/\s+/)) {
      const td = token.replace(/\D/g, '');
      if (td.length === 44 && td !== digits) chaveCandidates.push(td);
    }
  }
  // Chaves também podem estar quebradas em vários itens da mesma linha
  if (chaveCandidates.length === 0) {
    const byLine = new Map<string, string>();
    for (const it of items) {
      const key = `${it.page}:${Math.round(it.y / 3)}`;
      byLine.set(key, (byLine.get(key) || '') + it.str);
    }
    for (const line of byLine.values()) {
      const digits = line.replace(/\D/g, '');
      if (digits.length === 44) chaveCandidates.push(digits);
    }
  }
  // Prioriza chave de CT-e (modelo 57); DACTEs também listam chaves de NF-e (55)
  chave = chaveCandidates.find(c => c.substring(20, 22) === '57') || undefined;
  const chavesNfe = Array.from(new Set(
    chaveCandidates.filter(c => c.substring(20, 22) === '55')
  )).slice(0, 50);

  let numero: string | undefined;
  let serie: string | undefined;
  if (chave) {
    numero = String(parseInt(chave.substring(25, 34), 10));
    serie = String(parseInt(chave.substring(22, 25), 10));
  }

  // ── Valores ────────────────────────────────────────────────────────────────
  // Alguns layouts alinham o valor à direita da caixa — janela horizontal ampla.
  // Fallback: "VALOR (TOTAL) A RECEBER" costuma repetir o valor da prestação.
  const valorPrestacao = labeledCurrency(/VALOR TOTAL (DO SERVICO|DA PRESTACAO)/)
    ?? labeledCurrency(/VALOR (TOTAL )?A RECEBER/);
  const valorCarga = labeledCurrency(/VALOR (TOTAL )?DA (CARGA|MERCADORIA)/);

  // ── Data de emissão ────────────────────────────────────────────────────────
  let dataEmissao: string | undefined;
  for (const label of findLabels(/DATA E HORA D[EA] EMISS/)) {
    const raw = valueNear(label, /^\d{2}\/\d{2}\/\d{4}/, 20, 120);
    const m = raw?.match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (m) {
      dataEmissao = `${m[3]}-${m[2]}-${m[1]}T${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}`;
      break;
    }
  }

  // ── Volumes ────────────────────────────────────────────────────────────────
  const volumes: CteDocVolume[] = [];
  // Layout 1: rótulo "PESO BRUTO" (inline ou com valor abaixo)
  for (const label of findLabels(/PESO (BRUTO|BASE|B\.? ?CALC)/)) {
    const inline = label.norm.match(/PESO[^0-9]*([\d.,]+)/);
    const raw = (inline && inline[1]) || valueNear(label, NUMBER_RE, 15, 60);
    const quantidade = raw !== undefined ? parseBrNumber(raw) : undefined;
    if (quantidade !== undefined && quantidade > 0) {
      volumes.push({ tipo: 'PESO BRUTO', unidade: 'KG', quantidade });
      break;
    }
  }
  // Layout 2: colunas TIPO MEDIDA / QTDE/UN.MEDIDA — valores como "24.130,9000/KG"
  const qtyUnitRe = /^([\d.,]+)\s*\/\s*(KG|KGS|TON|UND?|UN)\.?$/;
  for (const it of items) {
    const m = it.norm.match(qtyUnitRe);
    if (!m) continue;
    const quantidade = parseBrNumber(m[1]);
    if (quantidade === undefined || quantidade <= 0) continue;
    const un = m[2].startsWith('KG') ? 'KG' : m[2] === 'TON' ? 'TON' : 'UN';
    const tipo = un === 'KG' ? 'PESO BRUTO' : un === 'TON' ? 'PESO (TON)' : 'UNIDADE';
    // Evita duplicar o peso já capturado pelo layout 1
    if (un === 'KG' && volumes.some(v => v.unidade === 'KG')) continue;
    volumes.push({ tipo, unidade: un, quantidade });
  }

  // ── Remetente / Destinatário (apenas nome e CNPJ, best-effort) ─────────────
  const partyNear = (labelRe: RegExp): CteDocParty | undefined => {
    for (const label of findLabels(labelRe)) {
      // Nome: texto em caixa alta próximo (à direita ou logo abaixo do rótulo)
      let nome: string | undefined;
      let bestScore = Infinity;
      for (const it of items) {
        if (it.page !== label.page || it === label) continue;
        const dy = label.y - it.y;
        const dx = it.x - label.x;
        const sameLine = Math.abs(dy) <= 2.5 && dx > 0 && dx < 120;
        const below = dy > 1 && dy <= 10 && Math.abs(dx) <= 60;
        if (!sameLine && !below) continue;
        if (it.norm.length < 5 || !/^[A-Z]/.test(it.norm)) continue;
        if (LABEL_EXACT_RE.test(it.norm)) continue;
        if (NUMBER_RE.test(it.norm) || CURRENCY_RE.test(it.norm)) continue;
        const score = (sameLine ? 0 : dy * 2) + Math.abs(dx);
        if (score < bestScore) { bestScore = score; nome = it.str; }
      }
      if (!nome) continue;
      // CNPJ formatado no bloco do rótulo (layouts variam: logo abaixo ou
      // várias linhas abaixo, em coluna à direita) — pega o mais próximo
      let cnpjCpf: string | undefined;
      let cnpjBest = Infinity;
      for (const it of items) {
        if (it.page !== label.page) continue;
        const dy = label.y - it.y;
        const dx = Math.abs(it.x - label.x);
        if (dy < 1 || dy > 55 || dx > 130) continue;
        const m = it.str.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
        if (m && dy + dx * 0.3 < cnpjBest) { cnpjBest = dy + dx * 0.3; cnpjCpf = m[0].replace(/\D/g, ''); }
      }
      return { nome, cnpjCpf };
    }
    return undefined;
  };

  const remetente = partyNear(/^REMETENTE\b/);
  const destinatario = partyNear(/^DESTINATARIO\b/);

  const summary: CteDocSummary = {
    numero,
    serie,
    chave,
    dataEmissao,
    valorPrestacao,
    valorCarga,
    volumes,
    remetente,
    destinatario,
    chavesNfe: chavesNfe.length > 0 ? chavesNfe : undefined,
  };

  const found = !!(numero || valorPrestacao !== undefined || valorCarga !== undefined
    || volumes.length > 0 || remetente || destinatario || chavesNfe.length > 0);

  return { summary, found };
}
