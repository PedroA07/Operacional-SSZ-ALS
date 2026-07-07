
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import qrcode from 'qrcode-generator';
import { CteDocParty, CteDocSummary, CteDocVolume } from '../types';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type CteParty = CteDocParty;

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
  tomadorParty?: CteParty;
  emitente?: CteParty;
  remetente?: CteParty;
  destinatario?: CteParty;
  expedidor?: CteParty;
  recebedor?: CteParty;
  valorTotal?: string;
  valorReceber?: string;
  componentes?: { nome: string; valor: string }[];
  icms?: { cst?: string; vBC?: string; pICMS?: string; vICMS?: string; pRedBC?: string };
  produtoPredominante?: string;
  outrasCaracteristicas?: string;
  valorCarga?: string;
  quantidades?: { tipo: string; unidade?: string; qtd: string }[];
  chavesNfe?: string[];
  qrCod?: string;
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
const UNIDADES: Record<string, string> = {
  '00': 'M³', '01': 'KG', '02': 'TON', '03': 'UN', '04': 'L', '05': 'MMBTU',
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
    pais: text(ender, 'xPais'),
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
      pRedBC: text(icmsEl, 'pRedBC'),
    } : undefined;

    const infCarga = first(infCte, 'infCarga');
    const quantidades = infCarga
      ? Array.from(infCarga.getElementsByTagName('infQ')).map(q => ({
          tipo: text(q, 'tpMed'),
          unidade: UNIDADES[text(q, 'cUnid')] || undefined,
          qtd: text(q, 'qCarga'),
        })).filter(q => q.tipo || q.qtd)
      : [];

    const infDoc = first(infCte, 'infDoc');
    const chavesNfe = infDoc
      ? Array.from(infDoc.getElementsByTagName('chave')).map(c => c.textContent?.trim() || '').filter(Boolean)
      : [];

    const infProt = first(doc, 'infProt');

    const remetente = parseParty(first(infCte, 'rem'));
    const destinatario = parseParty(first(infCte, 'dest'));
    const expedidor = parseParty(first(infCte, 'exped'));
    const recebedor = parseParty(first(infCte, 'receb'));
    // Tomador: papéis 0-3 referenciam uma das partes; toma4 traz dados próprios
    const tomadorParty = toma === '4'
      ? parseParty(tomaEl)
      : ({ '0': remetente, '1': expedidor, '2': recebedor, '3': destinatario } as Record<string, CteParty | undefined>)[toma];

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
      tomadorParty,
      emitente: parseParty(first(infCte, 'emit')),
      remetente,
      destinatario,
      expedidor,
      recebedor,
      valorTotal: text(vPrest, 'vTPrest'),
      valorReceber: text(vPrest, 'vRec'),
      componentes,
      icms,
      produtoPredominante: text(infCarga, 'proPred'),
      outrasCaracteristicas: text(infCarga, 'xOutCat'),
      valorCarga: text(infCarga, 'vCarga'),
      quantidades,
      chavesNfe,
      qrCod: text(doc, 'qrCodCTe'),
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
  const PAGE_BOTTOM = 289;           // limite inferior útil do A4
  let y = M;

  const LABEL = 5.2;
  const GRAY: [number, number, number] = [90, 90, 90];

  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.25);

  // Quebra de página automática quando a próxima seção não cabe
  const ensure = (h: number) => {
    if (y + h > PAGE_BOTTOM) {
      pdf.addPage();
      y = M;
    }
  };

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

  // ── Canhoto de recebimento ─────────────────────────────────────────────────
  pdf.rect(M, y, W, 4.5);
  pdf.setFontSize(5.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    'DECLARO QUE RECEBI OS VOLUMES DESTE CONHECIMENTO EM PERFEITO ESTADO PELO QUE DOU POR CUMPRIDO O PRESENTE CONTRATO DE TRANSPORTE',
    M + W / 2, y + 3, { align: 'center' }
  );
  y += 4.5;
  box(M, y, W * 0.38, 8, 'NOME / RG', '');
  box(M + W * 0.38, y, W * 0.27, 8, 'ASSINATURA / CARIMBO', '');
  box(M + W * 0.65, y, W * 0.19, 8, 'CHEGADA — DATA / HORA', '');
  box(M + W * 0.84, y, W * 0.16, 8, 'CT-E',
    `Nº ${data.numero || '—'}  SÉRIE ${data.serie || '—'}`, { bold: true, size: 6.5, center: true });
  y += 8;
  pdf.setLineDashPattern([1.2, 1.2], 0);
  pdf.line(M, y + 1.8, M + W, y + 1.8);
  pdf.setLineDashPattern([], 0);
  y += 3.5;

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
  pdf.setFontSize(8.5);
  pdf.text(`MODAL: ${data.modal || '—'}`, idX + idW / 2, y + 17.5, { align: 'center' });
  y += headerH;

  // ── Modelo / série / número / folha / emissão ──────────────────────────────
  box(M, y, W * 0.12, 8, 'MODELO', '57', { center: true });
  box(M + W * 0.12, y, W * 0.12, 8, 'SÉRIE', data.serie || '', { center: true });
  box(M + W * 0.24, y, W * 0.2, 8, 'NÚMERO', data.numero || '', { bold: true, center: true });
  box(M + W * 0.44, y, W * 0.1, 8, 'FL', '1/1', { center: true });
  box(M + W * 0.54, y, W * 0.26, 8, 'DATA E HORA DE EMISSÃO', fmtDateTime(data.dataEmissao), { center: true });
  box(M + W * 0.8, y, W * 0.2, 8, 'INSC. SUFRAMA DESTINATÁRIO', '', { center: true });
  y += 8;

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

  // ── Consulta de autenticidade + protocolo + QR Code ────────────────────────
  const qrH = 24;
  const qrBoxW = 26;
  const infoW = W - qrBoxW;
  pdf.rect(M, y, infoW, qrH);
  pdf.setFontSize(6.2);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text('Chave de acesso para consulta de autenticidade no site www.cte.fazenda.gov.br ou da Sefaz Autorizadora', M + infoW / 2, y + 4.5, { align: 'center' });
  pdf.setFontSize(LABEL);
  pdf.setTextColor(...GRAY);
  pdf.text('PROTOCOLO DE AUTORIZAÇÃO DE USO', M + 1.2, y + 10);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    data.protocolo ? `${data.protocolo}   ${fmtDateTime(data.dataProtocolo)}` : '—',
    M + infoW / 2, y + 16, { align: 'center' }
  );
  // QR Code de consulta (qrCodCTe do XML; fallback: chave de acesso)
  pdf.rect(M + infoW, y, qrBoxW, qrH);
  const qrContent = data.qrCod || data.chave || '';
  if (qrContent) {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(qrContent);
      qr.make();
      const n = qr.getModuleCount();
      const qrSize = qrH - 5;
      const cell = qrSize / n;
      const qx = M + infoW + (qrBoxW - qrSize) / 2;
      const qy = y + 2.5;
      pdf.setFillColor(0, 0, 0);
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          if (qr.isDark(r, c)) pdf.rect(qx + c * cell, qy + r * cell, cell, cell, 'F');
        }
      }
    } catch (e) {
      console.warn('[cteXmlToPdf] Falha ao gerar QR Code:', e);
    }
  }
  y += qrH;

  // ── Natureza / tipo ────────────────────────────────────────────────────────
  box(M, y, W * 0.4, 11, 'NATUREZA DA OPERAÇÃO', data.natOp || '', { size: 6.5 });
  box(M + W * 0.4, y, W * 0.15, 11, 'CFOP', data.cfop || '', { center: true });
  box(M + W * 0.55, y, W * 0.225, 11, 'TIPO DO CT-E', data.tipoCte || '', { center: true });
  box(M + W * 0.775, y, W * 0.225, 11, 'TIPO DO SERVIÇO', data.tipoServico || '', { center: true });
  y += 11;

  // ── Origem / destino / tomador ─────────────────────────────────────────────
  const orig = [data.munIni, data.ufIni].filter(Boolean).join(' - ');
  const dest = [data.munFim, data.ufFim].filter(Boolean).join(' - ');
  box(M, y, W * 0.4, 8, 'INÍCIO DA PRESTAÇÃO', orig, { bold: true });
  box(M + W * 0.4, y, W * 0.4, 8, 'TÉRMINO DA PRESTAÇÃO', dest, { bold: true });
  box(M + W * 0.8, y, W * 0.2, 8, 'TOMADOR DO SERVIÇO', data.tomador || '', { center: true });
  y += 8;

  // ── Tomador do serviço (dados completos) ───────────────────────────────────
  if (data.tomadorParty && (data.tomadorParty.nome || data.tomadorParty.cnpjCpf)) {
    ensure(9);
    const tp = data.tomadorParty;
    const tEnd = [
      tp.endereco,
      [tp.municipio, tp.uf].filter(Boolean).join(' - '),
      tp.cep ? `CEP: ${fmtCep(tp.cep)}` : '',
      tp.pais && tp.pais.toUpperCase() !== 'BRASIL' ? tp.pais : '',
    ].filter(Boolean).join(' — ');
    box(M, y, W * 0.3, 9, 'TOMADOR DO SERVIÇO', tp.nome || '', { bold: true, size: 7 });
    box(M + W * 0.3, y, W * 0.38, 9, 'ENDEREÇO', tEnd, { size: 6 });
    box(M + W * 0.68, y, W * 0.18, 9, 'CNPJ/CPF', fmtCnpjCpf(tp.cnpjCpf) || '', { size: 6.5 });
    box(M + W * 0.86, y, W * 0.14, 9, 'FONE', tp.fone || '', { size: 6.5 });
    y += 9;
  }

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
    const munLine = [p.municipio, p.uf].filter(Boolean).join(' - ')
      + (p.cep ? ` - CEP: ${fmtCep(p.cep)}` : '')
      + (p.pais && p.pais.toUpperCase() !== 'BRASIL' ? ` - ${p.pais}` : '');
    const lines = [
      p.cnpjCpf ? `CNPJ/CPF: ${fmtCnpjCpf(p.cnpjCpf)}${p.ie ? `  IE: ${p.ie}` : ''}` : '',
      p.endereco,
      munLine,
      p.fone ? `Fone: ${p.fone}` : '',
    ].filter(Boolean) as string[];
    let py = y + 9;
    lines.forEach(l => {
      pdf.text(pdf.splitTextToSize(l, w - 2.4)[0] || '', x + 1.2, py);
      py += 3;
    });
    return h;
  };

  ensure(21);
  partyBox(M, W / 2, 'REMETENTE', data.remetente);
  partyBox(M + W / 2, W / 2, 'DESTINATÁRIO', data.destinatario);
  y += 21;

  if (data.expedidor?.nome || data.recebedor?.nome) {
    ensure(21);
    partyBox(M, W / 2, 'EXPEDIDOR', data.expedidor);
    partyBox(M + W / 2, W / 2, 'RECEBEDOR', data.recebedor);
    y += 21;
  }

  // ── Carga ──────────────────────────────────────────────────────────────────
  ensure(16);
  box(M, y, W * 0.4, 8, 'PRODUTO PREDOMINANTE', data.produtoPredominante || '');
  box(M + W * 0.4, y, W * 0.35, 8, 'OUTRAS CARACTERÍSTICAS DA CARGA', data.outrasCaracteristicas || '', { size: 6.5 });
  box(M + W * 0.75, y, W * 0.25, 8, 'VALOR TOTAL DA CARGA', fmtMoney(data.valorCarga), { bold: true });
  y += 8;

  const qtds = data.quantidades || [];
  const numQ = (s: string) => { const n = parseFloat(s); return isNaN(n) ? 0 : n; };
  const cubagem = qtds.filter(q => q.unidade === 'M³').reduce((s, q) => s + numQ(q.qtd), 0);
  const qtdVolumes = qtds.filter(q => q.unidade === 'UN').reduce((s, q) => s + numQ(q.qtd), 0);
  box(M, y, W * 0.6, 8, 'QUANTIDADES',
    qtds
      .filter(q => q.unidade !== 'M³')
      .map(q => `${q.tipo ? `${q.tipo}: ` : ''}${q.qtd}${q.unidade ? ` ${q.unidade}` : ''}`)
      .join('  |  '), { size: 6.5 });
  box(M + W * 0.6, y, W * 0.2, 8, 'CUBAGEM (M³)',
    cubagem > 0 ? cubagem.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 }) : '0,00',
    { center: true });
  box(M + W * 0.8, y, W * 0.2, 8, 'QUANTIDADE DE VOLUMES',
    qtdVolumes > 0 ? qtdVolumes.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—',
    { center: true });
  y += 8;

  // ── Componentes do valor da prestação ──────────────────────────────────────
  const comps = (data.componentes || []).slice(0, 20);
  const compH = Math.max(10, Math.ceil(Math.max(comps.length, 1) / 2) * 4 + 4);
  ensure(4.2 + compH);
  sectionTitle('COMPONENTES DO VALOR DA PRESTAÇÃO DO SERVIÇO');
  pdf.rect(M, y, W * 0.6, compH);
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  comps.forEach((c, i) => {
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
    ensure(4.2 + 8);
    sectionTitle('INFORMAÇÕES RELATIVAS AO IMPOSTO');
    box(M, y, W * 0.28, 8, 'SITUAÇÃO TRIBUTÁRIA', data.icms.cst ? `CST ${data.icms.cst}` : '');
    box(M + W * 0.28, y, W * 0.18, 8, 'BASE DE CÁLCULO', fmtMoney(data.icms.vBC));
    box(M + W * 0.46, y, W * 0.18, 8, 'ALÍQUOTA ICMS', data.icms.pICMS ? `${data.icms.pICMS}%` : '');
    box(M + W * 0.64, y, W * 0.18, 8, 'VALOR ICMS', fmtMoney(data.icms.vICMS), { bold: true });
    box(M + W * 0.82, y, W * 0.18, 8, '% RED. BC CÁLC.', data.icms.pRedBC ? `${data.icms.pRedBC}%` : '0,00');
    y += 8;
  }

  // ── Documentos originários (NF-e) ──────────────────────────────────────────
  if (data.chavesNfe && data.chavesNfe.length > 0) {
    ensure(4.2 + 4 + 6.1);
    sectionTitle('DOCUMENTOS ORIGINÁRIOS');
    const keys = data.chavesNfe;
    const PER_ROW = 2;
    const ROW_H = 3.6;
    const HALF = W / 2;
    // Modelo/série/número derivados das posições fixas da chave de acesso
    const docCols = (k: string) => {
      if (/^\d{44}$/.test(k)) {
        return {
          modelo: k.substring(20, 22) === '55' ? 'NF-e' : k.substring(20, 22),
          serie: String(parseInt(k.substring(22, 25), 10)),
          numero: String(parseInt(k.substring(25, 34), 10)),
        };
      }
      return { modelo: '—', serie: '—', numero: '—' };
    };
    const drawDocHeader = () => {
      pdf.rect(M, y, W, 4);
      pdf.setFontSize(LABEL);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...GRAY);
      for (let c = 0; c < PER_ROW; c++) {
        const bx = M + c * HALF;
        pdf.text('MODELO', bx + 1.5, y + 2.8);
        pdf.text('SÉRIE', bx + 12, y + 2.8);
        pdf.text('NÚMERO', bx + 20, y + 2.8);
        pdf.text('CHAVE DE ACESSO', bx + 34, y + 2.8);
      }
      y += 4;
    };
    drawDocHeader();
    let i = 0;
    // Renderiza em blocos de linhas que cabem na página; continua nas seguintes
    while (i < keys.length) {
      const availRows = Math.floor((PAGE_BOTTOM - y - 2.5) / ROW_H);
      if (availRows < 1) { pdf.addPage(); y = M; drawDocHeader(); continue; }
      const rowsHere = Math.min(availRows, Math.ceil((keys.length - i) / PER_ROW));
      const h = rowsHere * ROW_H + 2.5;
      pdf.rect(M, y, W, h);
      pdf.setFontSize(5.8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      for (let r = 0; r < rowsHere; r++) {
        for (let c = 0; c < PER_ROW && i < keys.length; c++, i++) {
          const k = keys[i];
          const d = docCols(k);
          const bx = M + c * HALF;
          const by = y + 4 + r * ROW_H;
          pdf.text(d.modelo, bx + 1.5, by);
          pdf.text(d.serie, bx + 12, by);
          pdf.text(d.numero, bx + 20, by);
          pdf.text(fmtChave(k), bx + 34, by);
        }
      }
      y += h;
    }
  }

  // ── Observações ────────────────────────────────────────────────────────────
  if (data.observacoes) {
    ensure(4.2 + 6.2);
    sectionTitle('OBSERVAÇÕES');
    const obsLines: string[] = pdf.splitTextToSize(data.observacoes, W - 4);
    const LINE_H = 3.2;
    let i = 0;
    while (i < obsLines.length) {
      const availLines = Math.floor((PAGE_BOTTOM - y - 3) / LINE_H);
      if (availLines < 1) { pdf.addPage(); y = M; continue; }
      const chunk = obsLines.slice(i, i + availLines);
      const h = chunk.length * LINE_H + 3;
      pdf.rect(M, y, W, h);
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(chunk, M + 2, y + 3.8);
      y += h;
      i += availLines;
    }
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  ensure(8);
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

/** Monta o resumo estruturado do CT-e (valores numéricos, volumes e partes) para persistir no anexo. */
export const extractCteSummary = (data: CteData): CteDocSummary => {
  const num = (v?: string): number | undefined => {
    const n = parseFloat(v || '');
    return isNaN(n) ? undefined : n;
  };
  const volumes: CteDocVolume[] = [];
  (data.quantidades || []).forEach(q => {
    const quantidade = num(q.qtd);
    if (quantidade !== undefined) {
      volumes.push({ tipo: q.tipo || 'VOLUME', unidade: q.unidade, quantidade });
    }
  });
  return {
    numero: data.numero || undefined,
    serie: data.serie || undefined,
    chave: data.chave || undefined,
    dataEmissao: data.dataEmissao || undefined,
    valorPrestacao: num(data.valorTotal),
    valorCarga: num(data.valorCarga),
    volumes,
    remetente: data.remetente,
    destinatario: data.destinatario,
    chavesNfe: data.chavesNfe?.length ? data.chavesNfe : undefined,
  };
};
