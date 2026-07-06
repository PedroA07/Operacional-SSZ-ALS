
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface CteParty {
  nome?: string;
  cnpjCpf?: string;
  ie?: string;
  endereco?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  fone?: string;
}

export interface CteData {
  chave?: string;
  numero?: string;
  serie?: string;
  dataEmissao?: string;
  natOp?: string;
  cfop?: string;
  modal?: string;
  tipoCte?: string;
  tipoServico?: string;
  munIni?: string;
  ufIni?: string;
  munFim?: string;
  ufFim?: string;
  tomador?: string;
  emitente?: CteParty;
  remetente?: CteParty;
  destinatario?: CteParty;
  expedidor?: CteParty;
  recebedor?: CteParty;
  valorTotal?: string;
  valorReceber?: string;
  componentes?: { nome: string; valor: string }[];
  icms?: { cst?: string; vBC?: string; pICMS?: string; vICMS?: string };
  produtoPredominante?: string;
  valorCarga?: string;
  quantidades?: string[];
  chavesNfe?: string[];
  observacoes?: string;
  protocolo?: string;
  dataProtocolo?: string;
  rntrc?: string;
}

const MODAIS: Record<string, string> = {
  '01': 'RODOVIÁRIO', '02': 'AÉREO', '03': 'AQUAVIÁRIO',
  '04': 'FERROVIÁRIO', '05': 'DUTOVIÁRIO', '06': 'MULTIMODAL',
};
const TIPOS_CTE: Record<string, string> = {
  '0': 'NORMAL', '1': 'COMPLEMENTO DE VALORES', '2': 'ANULAÇÃO', '3': 'SUBSTITUTO',
};
const TIPOS_SERVICO: Record<string, string> = {
  '0': 'NORMAL', '1': 'SUBCONTRATAÇÃO', '2': 'REDESPACHO',
  '3': 'REDESPACHO INTERMEDIÁRIO', '4': 'VINCULADO A MULTIMODAL',
};
const TOMADORES: Record<string, string> = {
  '0': 'REMETENTE', '1': 'EXPEDIDOR', '2': 'RECEBEDOR', '3': 'DESTINATÁRIO', '4': 'OUTROS',
};

// ── Parser ────────────────────────────────────────────────────────────────────
const text = (parent: Element | Document | null, tag: string): string => {
  if (!parent) return '';
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || '';
};

const first = (parent: Element | Document | null, tag: string): Element | null => {
  if (!parent) return null;
  return parent.getElementsByTagName(tag)[0] || null;
};

const parseParty = (el: Element | null): CteParty | undefined => {
  if (!el) return undefined;
  // O nó de endereço varia por papel: enderEmit, enderReme, enderDest, enderExped, enderReceb
  const ender = Array.from(el.children).find(c => c.localName.startsWith('ender')) || null;
  return {
    nome: text(el, 'xNome'),
    cnpjCpf: text(el, 'CNPJ') || text(el, 'CPF'),
    ie: text(el, 'IE'),
    endereco: [text(ender, 'xLgr'), text(ender, 'nro'), text(ender, 'xCpl'), text(ender, 'xBairro')]
      .filter(Boolean).join(', '),
    municipio: text(ender, 'xMun'),
    uf: text(ender, 'UF'),
    cep: text(ender, 'CEP'),
    fone: text(el, 'fone'),
  };
};

/** Faz o parse de um XML de CT-e (procCTe ou CTe). Retorna null se não for um CT-e. */
export const parseCteXml = (xmlText: string): CteData | null => {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return null;
    const infCte = first(doc, 'infCte');
    if (!infCte) return null;

    const ide = first(infCte, 'ide');
    const chave = (infCte.getAttribute('Id') || '').replace(/^CTe/i, '');

    const tomaEl = first(ide, 'toma3') || first(ide, 'toma4');
    const toma = text(tomaEl, 'toma');

    const vPrest = first(infCte, 'vPrest');
    const componentes = vPrest
      ? Array.from(vPrest.getElementsByTagName('Comp')).map(c => ({
          nome: text(c, 'xNome'),
          valor: text(c, 'vComp'),
        }))
      : [];

    const icmsEl = first(infCte, 'ICMS');
    const icms = icmsEl ? {
      cst: text(icmsEl, 'CST'),
      vBC: text(icmsEl, 'vBC'),
      pICMS: text(icmsEl, 'pICMS'),
      vICMS: text(icmsEl, 'vICMS'),
    } : undefined;

    const infCarga = first(infCte, 'infCarga');
    const quantidades = infCarga
      ? Array.from(infCarga.getElementsByTagName('infQ')).map(q => {
          const tp = text(q, 'tpMed');
          const qtd = text(q, 'qCarga');
          return [tp, qtd].filter(Boolean).join(': ');
        }).filter(Boolean)
      : [];

    const infDoc = first(infCte, 'infDoc');
    const chavesNfe = infDoc
      ? Array.from(infDoc.getElementsByTagName('chave')).map(c => c.textContent?.trim() || '').filter(Boolean)
      : [];

    const infProt = first(doc, 'infProt');

    return {
      chave,
      numero: text(ide, 'nCT'),
      serie: text(ide, 'serie'),
      dataEmissao: text(ide, 'dhEmi'),
      natOp: text(ide, 'natOp'),
      cfop: text(ide, 'CFOP'),
      modal: MODAIS[text(ide, 'modal')] || text(ide, 'modal'),
      tipoCte: TIPOS_CTE[text(ide, 'tpCTe')] || text(ide, 'tpCTe'),
      tipoServico: TIPOS_SERVICO[text(ide, 'tpServ')] || text(ide, 'tpServ'),
      munIni: text(ide, 'xMunIni'),
      ufIni: text(ide, 'UFIni'),
      munFim: text(ide, 'xMunFim'),
      ufFim: text(ide, 'UFFim'),
      tomador: TOMADORES[toma] || toma,
      emitente: parseParty(first(infCte, 'emit')),
      remetente: parseParty(first(infCte, 'rem')),
      destinatario: parseParty(first(infCte, 'dest')),
      expedidor: parseParty(first(infCte, 'exped')),
      recebedor: parseParty(first(infCte, 'receb')),
      valorTotal: text(vPrest, 'vTPrest'),
      valorReceber: text(vPrest, 'vRec'),
      componentes,
      icms,
      produtoPredominante: text(infCarga, 'proPred'),
      valorCarga: text(infCarga, 'vCarga'),
      quantidades,
      chavesNfe,
      observacoes: text(first(infCte, 'compl'), 'xObs'),
      protocolo: text(infProt, 'nProt'),
      dataProtocolo: text(infProt, 'dhRecbto'),
      rntrc: text(first(infCte, 'rodo'), 'RNTRC'),
    };
  } catch (e) {
    console.error('[cteXmlToPdf] Erro ao fazer parse do XML:', e);
    return null;
  }
};

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtMoney = (v?: string): string => {
  if (!v) return '';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtCnpjCpf = (v?: string): string => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v;
};

const fmtCep = (v?: string): string => {
  if (!v) return '';
  const d = v.replace(/\D/g, '');
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : v;
};

const fmtDateTime = (v?: string): string => {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return v; }
};

const fmtChave = (v?: string): string => {
  if (!v) return '';
  return v.replace(/(\d{4})(?=\d)/g, '$1 ');
};

// ── Geração do PDF (DACTE simplificado) ───────────────────────────────────────
export const generateDactePdf = (data: CteData): jsPDF => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 8;                       // margem
  const W = 210 - M * 2;             // largura útil
  let y = M;

  const LABEL = 5.2;
  const GRAY: [number, number, number] = [90, 90, 90];

  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.25);

  // Caixa com rótulo pequeno em cima e valor embaixo
  const box = (x: number, yy: number, w: number, h: number, label: string, value: string, opts?: { bold?: boolean; size?: number; center?: boolean }) => {
    pdf.rect(x, yy, w, h);
    pdf.setFontSize(LABEL);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...GRAY);
    pdf.text(label, x + 1.2, yy + 2.4);
    pdf.setFontSize(opts?.size ?? 7.5);
    pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    pdf.setTextColor(0, 0, 0);
    const maxW = w - 2.4;
    const lines = pdf.splitTextToSize(value || '—', maxW);
    const visible = lines.slice(0, Math.max(1, Math.floor((h - 3.5) / 3)));
    if (opts?.center) {
      pdf.text(visible, x + w / 2, yy + 5.6, { align: 'center' });
    } else {
      pdf.text(visible, x + 1.2, yy + 5.6);
    }
  };

  const sectionTitle = (label: string) => {
    pdf.setFillColor(228, 232, 238);
    pdf.rect(M, y, W, 4.2, 'FD');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 30, 30);
    pdf.text(label, M + 1.2, y + 2.9);
    y += 4.2;
  };

  // ── Cabeçalho: emitente + identificação DACTE ──────────────────────────────
  const headerH = 24;
  const emitW = W * 0.55;
  pdf.rect(M, y, emitW, headerH);
  const emit = data.emitente || {};
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(0, 0, 0);
  const emitName = pdf.splitTextToSize(emit.nome || 'EMITENTE', emitW - 4).slice(0, 2);
  pdf.text(emitName, M + 2, y + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  const emitLines = [
    emit.endereco,
    [emit.municipio, emit.uf].filter(Boolean).join(' - ') + (emit.cep ? ` - CEP: ${fmtCep(emit.cep)}` : ''),
    emit.cnpjCpf ? `CNPJ: ${fmtCnpjCpf(emit.cnpjCpf)}${emit.ie ? `  IE: ${emit.ie}` : ''}` : '',
    emit.fone ? `Fone: ${emit.fone}` : '',
    data.rntrc ? `RNTRC: ${data.rntrc}` : '',
  ].filter(Boolean) as string[];
  let ey = y + 5 + emitName.length * 3.4;
  emitLines.forEach(l => {
    pdf.text(pdf.splitTextToSize(l, emitW - 4)[0] || '', M + 2, ey);
    ey += 3;
  });

  const idX = M + emitW;
  const idW = W - emitW;
  pdf.rect(idX, y, idW, headerH);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('DACTE', idX + idW / 2, y + 5.5, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5.5);
  pdf.text('Documento Auxiliar do Conhecimento', idX + idW / 2, y + 9, { align: 'center' });
  pdf.text('de Transporte Eletrônico', idX + idW / 2, y + 11.5, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.5);
  pdf.text(`MODAL: ${data.modal || '—'}`, idX + idW / 2, y + 16, { align: 'center' });
  pdf.setFontSize(7);
  pdf.text(
    `Nº ${data.numero || '—'}   SÉRIE ${data.serie || '—'}   ${fmtDateTime(data.dataEmissao)}`,
    idX + idW / 2, y + 21, { align: 'center' }
  );
  y += headerH;

  // ── Chave de acesso + código de barras ─────────────────────────────────────
  const chaveH = 17;
  pdf.rect(M, y, W, chaveH);
  pdf.setFontSize(LABEL);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...GRAY);
  pdf.text('CHAVE DE ACESSO', M + 1.2, y + 2.4);
  if (data.chave && /^\d{44}$/.test(data.chave)) {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, data.chave, { format: 'CODE128C', displayValue: false, margin: 0, width: 2, height: 40 });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', M + 20, y + 3.5, W - 40, 8);
    } catch (e) {
      console.warn('[cteXmlToPdf] Falha ao gerar código de barras:', e);
    }
  }
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmtChave(data.chave) || '—', M + W / 2, y + 15.2, { align: 'center' });
  y += chaveH;

  // ── Protocolo ──────────────────────────────────────────────────────────────
  box(M, y, W, 8, 'PROTOCOLO DE AUTORIZAÇÃO DE USO',
    data.protocolo ? `${data.protocolo}   ${fmtDateTime(data.dataProtocolo)}` : '—',
    { bold: true, center: true });
  y += 8;

  // ── Natureza / tipo ────────────────────────────────────────────────────────
  box(M, y, W * 0.4, 8, 'NATUREZA DA OPERAÇÃO', data.natOp || '');
  box(M + W * 0.4, y, W * 0.15, 8, 'CFOP', data.cfop || '', { center: true });
  box(M + W * 0.55, y, W * 0.225, 8, 'TIPO DO CT-E', data.tipoCte || '', { center: true });
  box(M + W * 0.775, y, W * 0.225, 8, 'TIPO DO SERVIÇO', data.tipoServico || '', { center: true });
  y += 8;

  // ── Origem / destino / tomador ─────────────────────────────────────────────
  const orig = [data.munIni, data.ufIni].filter(Boolean).join(' - ');
  const dest = [data.munFim, data.ufFim].filter(Boolean).join(' - ');
  box(M, y, W * 0.4, 8, 'INÍCIO DA PRESTAÇÃO', orig, { bold: true });
  box(M + W * 0.4, y, W * 0.4, 8, 'TÉRMINO DA PRESTAÇÃO', dest, { bold: true });
  box(M + W * 0.8, y, W * 0.2, 8, 'TOMADOR DO SERVIÇO', data.tomador || '', { center: true });
  y += 8;

  // ── Remetente / Destinatário ───────────────────────────────────────────────
  const partyBox = (x: number, w: number, title: string, p?: CteParty) => {
    const h = 21;
    pdf.rect(x, y, w, h);
    pdf.setFontSize(LABEL);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...GRAY);
    pdf.text(title, x + 1.2, y + 2.4);
    pdf.setTextColor(0, 0, 0);
    if (!p || (!p.nome && !p.cnpjCpf)) {
      pdf.setFontSize(7);
      pdf.text('—', x + 1.2, y + 6);
      return h;
    }
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.text(pdf.splitTextToSize(p.nome || '', w - 2.4)[0] || '', x + 1.2, y + 5.6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.2);
    const lines = [
      p.cnpjCpf ? `CNPJ/CPF: ${fmtCnpjCpf(p.cnpjCpf)}${p.ie ? `  IE: ${p.ie}` : ''}` : '',
      p.endereco,
      [p.municipio, p.uf].filter(Boolean).join(' - ') + (p.cep ? ` - CEP: ${fmtCep(p.cep)}` : ''),
      p.fone ? `Fone: ${p.fone}` : '',
    ].filter(Boolean) as string[];
    let py = y + 9;
    lines.forEach(l => {
      pdf.text(pdf.splitTextToSize(l, w - 2.4)[0] || '', x + 1.2, py);
      py += 3;
    });
    return h;
  };

  partyBox(M, W / 2, 'REMETENTE', data.remetente);
  partyBox(M + W / 2, W / 2, 'DESTINATÁRIO', data.destinatario);
  y += 21;

  if (data.expedidor?.nome || data.recebedor?.nome) {
    partyBox(M, W / 2, 'EXPEDIDOR', data.expedidor);
    partyBox(M + W / 2, W / 2, 'RECEBEDOR', data.recebedor);
    y += 21;
  }

  // ── Carga ──────────────────────────────────────────────────────────────────
  box(M, y, W * 0.4, 8, 'PRODUTO PREDOMINANTE', data.produtoPredominante || '');
  box(M + W * 0.4, y, W * 0.25, 8, 'VALOR TOTAL DA CARGA', fmtMoney(data.valorCarga), { bold: true });
  box(M + W * 0.65, y, W * 0.35, 8, 'QUANTIDADES', (data.quantidades || []).join('  |  '));
  y += 8;

  // ── Componentes do valor da prestação ──────────────────────────────────────
  sectionTitle('COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO');
  const comps = data.componentes || [];
  const compH = Math.max(10, Math.ceil(Math.max(comps.length, 1) / 2) * 4 + 4);
  pdf.rect(M, y, W * 0.6, compH);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  comps.slice(0, 10).forEach((c, i) => {
    const colX = M + (i % 2) * (W * 0.3);
    const rowY = y + 4 + Math.floor(i / 2) * 4;
    pdf.text(pdf.splitTextToSize(c.nome, W * 0.3 - 24)[0] || '', colX + 1.5, rowY);
    pdf.text(fmtMoney(c.valor), colX + W * 0.3 - 2, rowY, { align: 'right' });
  });
  if (comps.length === 0) pdf.text('—', M + 1.5, y + 4);
  box(M + W * 0.6, y, W * 0.2, compH, 'VALOR TOTAL DO SERVIÇO', fmtMoney(data.valorTotal), { bold: true, size: 8.5, center: true });
  box(M + W * 0.8, y, W * 0.2, compH, 'VALOR A RECEBER', fmtMoney(data.valorReceber), { bold: true, size: 8.5, center: true });
  y += compH;

  // ── ICMS ───────────────────────────────────────────────────────────────────
  if (data.icms && (data.icms.vICMS || data.icms.cst)) {
    sectionTitle('INFORMAÇÕES RELATIVAS AO IMPOSTO');
    box(M, y, W * 0.25, 8, 'SITUAÇÃO TRIBUTÁRIA', data.icms.cst ? `CST ${data.icms.cst}` : '');
    box(M + W * 0.25, y, W * 0.25, 8, 'BASE DE CÁLCULO', fmtMoney(data.icms.vBC));
    box(M + W * 0.5, y, W * 0.25, 8, 'ALÍQUOTA ICMS', data.icms.pICMS ? `${data.icms.pICMS}%` : '');
    box(M + W * 0.75, y, W * 0.25, 8, 'VALOR ICMS', fmtMoney(data.icms.vICMS), { bold: true });
    y += 8;
  }

  // ── Documentos originários (NF-e) ──────────────────────────────────────────
  if (data.chavesNfe && data.chavesNfe.length > 0) {
    sectionTitle('DOCUMENTOS ORIGINÁRIOS — CHAVES DE ACESSO NF-E');
    const nfH = Math.min(data.chavesNfe.length, 8) * 3.6 + 2.5;
    pdf.rect(M, y, W, nfH);
    pdf.setFontSize(6.8);
    pdf.setFont('helvetica', 'normal');
    data.chavesNfe.slice(0, 8).forEach((c, i) => {
      pdf.text(fmtChave(c), M + 2, y + 4 + i * 3.6);
    });
    if (data.chavesNfe.length > 8) {
      pdf.setFontSize(5.5);
      pdf.text(`(+${data.chavesNfe.length - 8} chaves não exibidas)`, M + W - 2, y + nfH - 1.5, { align: 'right' });
    }
    y += nfH;
  }

  // ── Observações ────────────────────────────────────────────────────────────
  if (data.observacoes) {
    sectionTitle('OBSERVAÇÕES');
    const obsLines = pdf.splitTextToSize(data.observacoes, W - 4).slice(0, 8);
    const obsH = obsLines.length * 3.2 + 3;
    pdf.rect(M, y, W, obsH);
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(obsLines, M + 2, y + 3.8);
    y += obsH;
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  pdf.setFontSize(5.5);
  pdf.setTextColor(...GRAY);
  pdf.text(
    `DACTE gerado automaticamente a partir do XML do CT-e em ${new Date().toLocaleString('pt-BR')} — sem valor fiscal, consulte o documento autorizado na SEFAZ.`,
    M, y + 4
  );

  return pdf;
};

/** Converte o texto de um XML de CT-e em um Blob de PDF (DACTE). Retorna null se o XML não for um CT-e. */
export const cteXmlToPdfBlob = (xmlText: string): { blob: Blob; data: CteData } | null => {
  const data = parseCteXml(xmlText);
  if (!data) return null;
  const pdf = generateDactePdf(data);
  return { blob: pdf.output('blob'), data };
};
