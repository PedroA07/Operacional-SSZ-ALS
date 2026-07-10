
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

// Gera o DANFE (Documento Auxiliar da NF-e) em PDF a partir do XML da NF-e,
// no mesmo espírito do DACTE gerado para CT-e (utils/cteXmlToPdf.ts).

// ── Parse completo do XML ─────────────────────────────────────────────────────
interface NfeParty {
  nome?: string;
  cnpjCpf?: string;
  ie?: string;
  endereco?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  fone?: string;
}

interface NfeItem {
  codigo: string;
  descricao: string;
  ncm: string;
  cst: string;
  cfop: string;
  unidade: string;
  quantidade: string;
  valorUnitario: string;
  valorTotal: string;
}

export interface NfeData {
  chave?: string;
  numero?: string;
  serie?: string;
  natOp?: string;
  tpNF?: string;             // 0 entrada / 1 saída
  dataEmissao?: string;
  dataSaida?: string;
  emitente?: NfeParty;
  destinatario?: NfeParty;
  totais: Record<string, string>;   // vBC, vICMS, vBCST, vST, vProd, vFrete, vSeg, vDesc, vOutro, vIPI, vNF
  modFrete?: string;
  transportadora?: NfeParty;
  volumes?: { qVol?: string; esp?: string; marca?: string; nVol?: string; pesoB?: string; pesoL?: string };
  itens: NfeItem[];
  infCpl?: string;
  protocolo?: string;
  dataProtocolo?: string;
}

const text = (parent: Element | Document | null, tag: string): string => {
  if (!parent) return '';
  const el = parent.getElementsByTagName(tag)[0];
  return el?.textContent?.trim() || '';
};

const first = (parent: Element | Document | null, tag: string): Element | null => {
  if (!parent) return null;
  return parent.getElementsByTagName(tag)[0] || null;
};

const parseParty = (el: Element | null): NfeParty | undefined => {
  if (!el) return undefined;
  const ender = Array.from(el.children).find(c => c.localName.startsWith('ender')) || null;
  return {
    nome: text(el, 'xNome'),
    cnpjCpf: text(el, 'CNPJ') || text(el, 'CPF'),
    ie: text(el, 'IE'),
    endereco: [text(ender, 'xLgr'), text(ender, 'nro'), text(ender, 'xCpl')].filter(Boolean).join(', '),
    bairro: text(ender, 'xBairro'),
    municipio: text(ender, 'xMun'),
    uf: text(ender, 'UF'),
    cep: text(ender, 'CEP'),
    fone: text(ender, 'fone'),
  };
};

/** Parse completo do XML de NF-e para o DANFE. Retorna null se não for NF-e. */
export function parseNfeXmlFull(xmlText: string): NfeData | null {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) return null;
    const infNFe = first(doc, 'infNFe');
    if (!infNFe) return null;

    const ide = first(infNFe, 'ide');
    const tot = first(first(infNFe, 'total'), 'ICMSTot');
    const totais: Record<string, string> = {};
    ['vBC', 'vICMS', 'vBCST', 'vST', 'vProd', 'vFrete', 'vSeg', 'vDesc', 'vOutro', 'vIPI', 'vII', 'vNF'].forEach(k => {
      totais[k] = text(tot, k);
    });

    const transp = first(infNFe, 'transp');
    const vol = first(transp, 'vol');

    const itens: NfeItem[] = Array.from(infNFe.getElementsByTagName('det')).map(det => {
      const prod = first(det, 'prod');
      const icms = first(first(det, 'imposto'), 'ICMS');
      const orig = text(icms, 'orig');
      const cst = text(icms, 'CST') || text(icms, 'CSOSN');
      return {
        codigo: text(prod, 'cProd'),
        descricao: text(prod, 'xProd'),
        ncm: text(prod, 'NCM'),
        cst: `${orig}${cst}`,
        cfop: text(prod, 'CFOP'),
        unidade: text(prod, 'uCom'),
        quantidade: text(prod, 'qCom'),
        valorUnitario: text(prod, 'vUnCom'),
        valorTotal: text(prod, 'vProd'),
      };
    });

    const infProt = first(doc, 'infProt');

    return {
      chave: (infNFe.getAttribute('Id') || '').replace(/^NFe/i, '') || undefined,
      numero: text(ide, 'nNF') || undefined,
      serie: text(ide, 'serie') || undefined,
      natOp: text(ide, 'natOp') || undefined,
      tpNF: text(ide, 'tpNF') || undefined,
      dataEmissao: text(ide, 'dhEmi') || undefined,
      dataSaida: text(ide, 'dhSaiEnt') || undefined,
      emitente: parseParty(first(infNFe, 'emit')),
      destinatario: parseParty(first(infNFe, 'dest')),
      totais,
      modFrete: text(transp, 'modFrete') || undefined,
      transportadora: parseParty(first(transp, 'transporta')),
      volumes: vol ? {
        qVol: text(vol, 'qVol'), esp: text(vol, 'esp'), marca: text(vol, 'marca'),
        nVol: text(vol, 'nVol'), pesoB: text(vol, 'pesoB'), pesoL: text(vol, 'pesoL'),
      } : undefined,
      itens,
      infCpl: text(first(infNFe, 'infAdic'), 'infCpl').replace(/\s+/g, ' ').trim() || undefined,
      protocolo: text(infProt, 'nProt') || undefined,
      dataProtocolo: text(infProt, 'dhRecbto') || undefined,
    };
  } catch (e) {
    console.error('[nfeXmlToPdf] Erro ao fazer parse do XML:', e);
    return null;
  }
}

// ── Formatação ────────────────────────────────────────────────────────────────
const fmtMoney = (v?: string): string => {
  if (!v) return '';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtQtd = (v?: string): string => {
  if (!v) return '';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 4 });
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

const fmtDate = (v?: string): string => {
  if (!v) return '';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleDateString('pt-BR');
  } catch { return v; }
};

const fmtChave = (v?: string): string => v ? v.replace(/(\d{4})(?=\d)/g, '$1 ') : '';

const FRETE: Record<string, string> = {
  '0': '0 - EMITENTE', '1': '1 - DESTINATÁRIO', '2': '2 - TERCEIROS',
  '3': '3 - PRÓPRIO/REMET.', '4': '4 - PRÓPRIO/DEST.', '9': '9 - SEM FRETE',
};

// ── Geração do PDF (DANFE simplificado) ──────────────────────────────────────
export const generateDanfePdf = (data: NfeData): jsPDF => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 8;
  const W = 210 - M * 2;
  const PAGE_BOTTOM = 289;
  let y = M;

  const LABEL = 5.2;
  const GRAY: [number, number, number] = [90, 90, 90];

  pdf.setDrawColor(60, 60, 60);
  pdf.setLineWidth(0.25);

  const ensure = (h: number) => {
    if (y + h > PAGE_BOTTOM) { pdf.addPage(); y = M; }
  };

  const box = (x: number, yy: number, w: number, h: number, label: string, value: string, opts?: { bold?: boolean; size?: number; center?: boolean; right?: boolean }) => {
    pdf.rect(x, yy, w, h);
    pdf.setFontSize(LABEL);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...GRAY);
    pdf.text(label, x + 1.2, yy + 2.4);
    pdf.setFontSize(opts?.size ?? 7);
    pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    pdf.setTextColor(0, 0, 0);
    const lines = pdf.splitTextToSize(value || '—', w - 2.4);
    const visible = lines.slice(0, Math.max(1, Math.floor((h - 3.5) / 3)));
    if (opts?.center) pdf.text(visible, x + w / 2, yy + 5.6, { align: 'center' });
    else if (opts?.right) pdf.text(visible, x + w - 1.2, yy + 5.6, { align: 'right' });
    else pdf.text(visible, x + 1.2, yy + 5.6);
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

  const emit = data.emitente || {};
  const dest = data.destinatario || {};
  const t = data.totais || {};

  // ── Canhoto ────────────────────────────────────────────────────────────────
  pdf.rect(M, y, W, 4.5);
  pdf.setFontSize(5.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(
    `RECEBEMOS DE ${(emit.nome || '').toUpperCase()} OS PRODUTOS CONSTANTES DA NOTA FISCAL INDICADA ABAIXO`.slice(0, 130),
    M + W / 2, y + 3, { align: 'center' }
  );
  y += 4.5;
  box(M, y, W * 0.25, 8, 'DATA DE RECEBIMENTO', '');
  box(M + W * 0.25, y, W * 0.55, 8, 'IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', '');
  box(M + W * 0.8, y, W * 0.2, 8, 'NF-e', `Nº ${data.numero || '—'}  SÉRIE ${data.serie || '—'}`, { bold: true, size: 6.5, center: true });
  y += 8;
  pdf.setLineDashPattern([1.2, 1.2], 0);
  pdf.line(M, y + 1.8, M + W, y + 1.8);
  pdf.setLineDashPattern([], 0);
  y += 3.5;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  const headerH = 26;
  const emitW = W * 0.42;
  pdf.rect(M, y, emitW, headerH);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  const emitName = pdf.splitTextToSize(emit.nome || 'EMITENTE', emitW - 4).slice(0, 2);
  pdf.text(emitName, M + 2, y + 5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.2);
  let ey = y + 5 + emitName.length * 3.4;
  [
    [emit.endereco, emit.bairro].filter(Boolean).join(' - '),
    [emit.municipio, emit.uf].filter(Boolean).join(' - ') + (emit.cep ? ` - CEP: ${fmtCep(emit.cep)}` : ''),
    emit.fone ? `Fone: ${emit.fone}` : '',
  ].filter(Boolean).forEach(l => {
    pdf.text(pdf.splitTextToSize(l as string, emitW - 4)[0] || '', M + 2, ey);
    ey += 3;
  });

  const danfeX = M + emitW;
  const danfeW = W * 0.16;
  pdf.rect(danfeX, y, danfeW, headerH);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('DANFE', danfeX + danfeW / 2, y + 5, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(4.8);
  pdf.text('Documento Auxiliar da', danfeX + danfeW / 2, y + 8.2, { align: 'center' });
  pdf.text('Nota Fiscal Eletrônica', danfeX + danfeW / 2, y + 10.4, { align: 'center' });
  pdf.setFontSize(5.5);
  pdf.text('0 - ENTRADA', danfeX + 2, y + 14.5);
  pdf.text('1 - SAÍDA', danfeX + 2, y + 17.2);
  pdf.rect(danfeX + danfeW - 8, y + 12.5, 6, 5.5);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(data.tpNF || '—', danfeX + danfeW - 5, y + 16.5, { align: 'center' });
  pdf.setFontSize(7);
  pdf.text(`Nº ${data.numero || '—'}`, danfeX + danfeW / 2, y + 21.5, { align: 'center' });
  pdf.text(`SÉRIE ${data.serie || '—'}   FL 1/1`, danfeX + danfeW / 2, y + 24.5, { align: 'center' });

  const barX = danfeX + danfeW;
  const barW = W - emitW - danfeW;
  pdf.rect(barX, y, barW, headerH);
  if (data.chave && /^\d{44}$/.test(data.chave)) {
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, data.chave, { format: 'CODE128C', displayValue: false, margin: 0, width: 2, height: 40 });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', barX + 3, y + 2, barW - 6, 9);
    } catch (e) { console.warn('[nfeXmlToPdf] Falha no código de barras:', e); }
  }
  pdf.setFontSize(LABEL);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...GRAY);
  pdf.text('CHAVE DE ACESSO', barX + 1.2, y + 14);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(6.4);
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmtChave(data.chave) || '—', barX + barW / 2, y + 17.5, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(5);
  pdf.text('Consulta de autenticidade no portal nacional da NF-e', barX + barW / 2, y + 21.5, { align: 'center' });
  pdf.text('www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora', barX + barW / 2, y + 24, { align: 'center' });
  y += headerH;

  // ── Natureza / protocolo ───────────────────────────────────────────────────
  box(M, y, W * 0.55, 8, 'NATUREZA DA OPERAÇÃO', data.natOp || '');
  box(M + W * 0.55, y, W * 0.45, 8, 'PROTOCOLO DE AUTORIZAÇÃO DE USO',
    data.protocolo ? `${data.protocolo}   ${fmtDateTime(data.dataProtocolo)}` : '—', { bold: true, center: true });
  y += 8;
  box(M, y, W * 0.4, 8, 'INSCRIÇÃO ESTADUAL', emit.ie || '');
  box(M + W * 0.4, y, W * 0.3, 8, 'INSC. ESTADUAL DO SUBST. TRIB.', '');
  box(M + W * 0.7, y, W * 0.3, 8, 'CNPJ', fmtCnpjCpf(emit.cnpjCpf));
  y += 8;

  // ── Destinatário / remetente ───────────────────────────────────────────────
  sectionTitle('DESTINATÁRIO / REMETENTE');
  box(M, y, W * 0.55, 8, 'NOME / RAZÃO SOCIAL', dest.nome || '', { bold: true });
  box(M + W * 0.55, y, W * 0.25, 8, 'CNPJ / CPF', fmtCnpjCpf(dest.cnpjCpf));
  box(M + W * 0.8, y, W * 0.2, 8, 'DATA DA EMISSÃO', fmtDate(data.dataEmissao), { center: true });
  y += 8;
  box(M, y, W * 0.45, 8, 'ENDEREÇO', dest.endereco || '', { size: 6 });
  box(M + W * 0.45, y, W * 0.2, 8, 'BAIRRO / DISTRITO', dest.bairro || '', { size: 6 });
  box(M + W * 0.65, y, W * 0.15, 8, 'CEP', fmtCep(dest.cep), { center: true });
  box(M + W * 0.8, y, W * 0.2, 8, 'DATA SAÍDA/ENTRADA', fmtDate(data.dataSaida), { center: true });
  y += 8;
  box(M, y, W * 0.45, 8, 'MUNICÍPIO', dest.municipio || '');
  box(M + W * 0.45, y, W * 0.2, 8, 'FONE / FAX', dest.fone || '', { size: 6 });
  box(M + W * 0.65, y, W * 0.07, 8, 'UF', dest.uf || '', { center: true });
  box(M + W * 0.72, y, W * 0.28, 8, 'INSCRIÇÃO ESTADUAL', dest.ie || '');
  y += 8;

  // ── Cálculo do imposto ─────────────────────────────────────────────────────
  sectionTitle('CÁLCULO DO IMPOSTO');
  box(M, y, W * 0.2, 8, 'BASE DE CÁLC. DO ICMS', fmtMoney(t.vBC), { right: true });
  box(M + W * 0.2, y, W * 0.2, 8, 'VALOR DO ICMS', fmtMoney(t.vICMS), { right: true });
  box(M + W * 0.4, y, W * 0.2, 8, 'BASE DE CÁLC. ICMS ST', fmtMoney(t.vBCST), { right: true });
  box(M + W * 0.6, y, W * 0.2, 8, 'VALOR DO ICMS ST', fmtMoney(t.vST), { right: true });
  box(M + W * 0.8, y, W * 0.2, 8, 'VALOR TOTAL DOS PRODUTOS', fmtMoney(t.vProd), { bold: true, right: true });
  y += 8;
  box(M, y, W * 0.16, 8, 'VALOR DO FRETE', fmtMoney(t.vFrete), { right: true });
  box(M + W * 0.16, y, W * 0.16, 8, 'VALOR DO SEGURO', fmtMoney(t.vSeg), { right: true });
  box(M + W * 0.32, y, W * 0.16, 8, 'DESCONTO', fmtMoney(t.vDesc), { right: true });
  box(M + W * 0.48, y, W * 0.16, 8, 'OUTRAS DESPESAS', fmtMoney(t.vOutro), { right: true });
  box(M + W * 0.64, y, W * 0.16, 8, 'VALOR TOTAL DO IPI', fmtMoney(t.vIPI), { right: true });
  box(M + W * 0.8, y, W * 0.2, 8, 'VALOR TOTAL DA NOTA', fmtMoney(t.vNF), { bold: true, size: 8, right: true });
  y += 8;

  // ── Transportador / volumes ────────────────────────────────────────────────
  sectionTitle('TRANSPORTADOR / VOLUMES TRANSPORTADOS');
  const tr = data.transportadora || {};
  box(M, y, W * 0.4, 8, 'RAZÃO SOCIAL', tr.nome || '', { size: 6 });
  box(M + W * 0.4, y, W * 0.2, 8, 'FRETE POR CONTA', FRETE[data.modFrete || ''] || data.modFrete || '', { size: 6, center: true });
  box(M + W * 0.6, y, W * 0.13, 8, 'PLACA DO VEÍCULO', '');
  box(M + W * 0.73, y, W * 0.27, 8, 'CNPJ / CPF', fmtCnpjCpf(tr.cnpjCpf));
  y += 8;
  const vol = data.volumes || {};
  box(M, y, W * 0.14, 8, 'QUANTIDADE', fmtQtd(vol.qVol), { center: true });
  box(M + W * 0.14, y, W * 0.24, 8, 'ESPÉCIE', vol.esp || '', { size: 6 });
  box(M + W * 0.38, y, W * 0.16, 8, 'MARCA', vol.marca || '', { size: 6 });
  box(M + W * 0.54, y, W * 0.16, 8, 'NUMERAÇÃO', vol.nVol || '', { size: 6 });
  box(M + W * 0.7, y, W * 0.15, 8, 'PESO BRUTO (KG)', fmtQtd(vol.pesoB), { bold: true, right: true });
  box(M + W * 0.85, y, W * 0.15, 8, 'PESO LÍQUIDO (KG)', fmtQtd(vol.pesoL), { right: true });
  y += 8;

  // ── Dados dos produtos ─────────────────────────────────────────────────────
  const COLS = [
    { label: 'CÓDIGO', w: 24, key: 'codigo' as const },
    { label: 'DESCRIÇÃO DO PRODUTO / SERVIÇO', w: 62, key: 'descricao' as const },
    { label: 'NCM', w: 15, key: 'ncm' as const },
    { label: 'CST', w: 9, key: 'cst' as const },
    { label: 'CFOP', w: 10, key: 'cfop' as const },
    { label: 'UN', w: 8, key: 'unidade' as const },
    { label: 'QTD', w: 16, key: 'quantidade' as const },
    { label: 'V. UNITÁRIO', w: 25, key: 'valorUnitario' as const },
    { label: 'V. TOTAL', w: 25, key: 'valorTotal' as const },
  ];
  const colX: number[] = [];
  let acc = M;
  COLS.forEach(c => { colX.push(acc); acc += c.w; });

  const drawItemsHeader = () => {
    sectionTitle('DADOS DOS PRODUTOS / SERVIÇOS');
    pdf.rect(M, y, W, 4);
    pdf.setFontSize(4.8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...GRAY);
    COLS.forEach((c, i) => pdf.text(c.label, colX[i] + 1, y + 2.8));
    y += 4;
  };

  const ROW_H = 4.2;
  ensure(4.2 + 4 + ROW_H * 2);
  drawItemsHeader();
  let i = 0;
  while (i < data.itens.length) {
    const availRows = Math.floor((PAGE_BOTTOM - y - 1) / ROW_H);
    if (availRows < 1) { pdf.addPage(); y = M; drawItemsHeader(); continue; }
    const rowsHere = Math.min(availRows, data.itens.length - i);
    const h = rowsHere * ROW_H + 1;
    pdf.rect(M, y, W, h);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(5.4);
    pdf.setTextColor(0, 0, 0);
    for (let r = 0; r < rowsHere; r++, i++) {
      const item = data.itens[i];
      const ry = y + 3 + r * ROW_H;
      const cell = (idx: number, value: string, right = false) => {
        const cw = COLS[idx].w - 2;
        const txt = pdf.splitTextToSize(value || '', cw)[0] || '';
        if (right) pdf.text(txt, colX[idx] + COLS[idx].w - 1, ry, { align: 'right' });
        else pdf.text(txt, colX[idx] + 1, ry);
      };
      cell(0, item.codigo);
      cell(1, item.descricao);
      cell(2, item.ncm);
      cell(3, item.cst);
      cell(4, item.cfop);
      cell(5, item.unidade);
      cell(6, fmtQtd(item.quantidade), true);
      cell(7, fmtMoney(item.valorUnitario), true);
      cell(8, fmtMoney(item.valorTotal), true);
    }
    y += h;
  }

  // ── Dados adicionais ───────────────────────────────────────────────────────
  if (data.infCpl) {
    ensure(4.2 + 6.2);
    sectionTitle('DADOS ADICIONAIS — INFORMAÇÕES COMPLEMENTARES');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    const lines: string[] = pdf.splitTextToSize(data.infCpl, W - 4);
    const LINE_H = 3;
    let li = 0;
    while (li < lines.length) {
      const avail = Math.floor((PAGE_BOTTOM - y - 3) / LINE_H);
      if (avail < 1) { pdf.addPage(); y = M; continue; }
      const chunk = lines.slice(li, li + avail);
      const h = chunk.length * LINE_H + 3;
      pdf.rect(M, y, W, h);
      pdf.text(chunk, M + 2, y + 3.6);
      y += h;
      li += avail;
    }
  }

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  ensure(8);
  pdf.setFontSize(5.5);
  pdf.setTextColor(...GRAY);
  pdf.text(
    `DANFE gerado automaticamente a partir do XML da NF-e em ${new Date().toLocaleString('pt-BR')} — sem valor fiscal, consulte o documento autorizado na SEFAZ.`,
    M, y + 4
  );

  return pdf;
};

/** Converte o texto do XML de NF-e em um Blob de PDF (DANFE). Retorna null se não for NF-e. */
export const nfeXmlToPdfBlob = (xmlText: string): { blob: Blob; data: NfeData } | null => {
  const data = parseNfeXmlFull(xmlText);
  if (!data) return null;
  const pdf = generateDanfePdf(data);
  return { blob: pdf.output('blob'), data };
};
