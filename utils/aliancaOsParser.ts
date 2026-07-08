
import { extractTextFromPDF } from './freightContractParser';

// Parser das OS's da Aliança/Maersk (PDF "Ordem de Serviço - Exportação/Coleta").
// Extrai os dados para pré-preencher programação, ordem de coleta e emissões.

export interface ParsedAliancaOs {
  os?: string;
  tipoOperacao?: string;        // EXPORTAÇÃO | COLETA | ... (do título da OS)
  booking?: string;
  agendamento?: string;
  ship?: string;                // navio/viagem real (regra: Demais Observações vence)
  shipFromObs?: boolean;        // true quando o navio veio das Demais Observações
  navioViagemCampo?: string;    // valor bruto do campo "Navio / Viagem"
  dataColeta?: string;          // ISO (Programação de Serviços: data + hora)
  container?: string;           // nº do container (quando a OS já traz)
  containerTipo?: string;       // 40HC, 20DC...
  pesoCarga?: string;
  tara?: string;
  valorNf?: string;
  autColeta?: string;           // nº aut. coleta/entrega OU campo completo da senha da OC
  senhaOc?: string;             // campo completo após "INFORMAR SENHA NA OC" (senha + embarque)
  senhaNumero?: string;         // apenas o número da senha
  requerimentoTipo?: string;    // Geral | Equipamento
  requerimentoDescricao?: string; // descrição completa do requerimento especial
  cliente?: string;
  embarcador?: string;          // razão do Local Coleta
  cnpjColeta?: string;
  enderecoColeta?: string;
  municipioColeta?: string;
  ufColeta?: string;
  bairroColeta?: string;
  cepColeta?: string;
  contato?: string;
  foneColeta?: string;
  mercadoria?: string;
  padraoCarga?: string;         // CARGA GERAL | CARGO PREMIUM | PADRÃO ALIMENTO | REEFER
  docReferencia?: string;       // "CTe Rodoviário" | "CTe Longo Curso" → tipo de viagem
  armador?: string;
  pol?: string;
  pod?: string;
  destinoFinal?: string;
  retirarVazio?: string;
  entregarCheio?: string;
  observacoes?: string;         // Demais Observações completas
}

const norm = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

const cleanShip = (s: string): string =>
  s.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim().toUpperCase();

/** Parse do texto extraído do PDF da OS. Retorna null se não parecer uma OS da Aliança. */
export function parseAliancaOsText(text: string): ParsedAliancaOs | null {
  if (!/Ordem de Servi/i.test(text)) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const full = lines.join('\n');
  const result: ParsedAliancaOs = {};

  // ── Identificação ────────────────────────────────────────────────────────
  const osMatch = full.match(/N[ºo°]\s*([0-9][A-Z]{2,4}[0-9]{4,}[A-Z]?)/);
  if (osMatch) result.os = osMatch[1].toUpperCase();

  const tipoMatch = full.match(/Ordem de Servi[çc]o\s*[-–]\s*([A-Za-zçãõÇÃÕ]+)/);
  if (tipoMatch) {
    const t = norm(tipoMatch[1]);
    const map: Record<string, string> = {
      'EXPORTACAO': 'EXPORTAÇÃO', 'IMPORTACAO': 'IMPORTAÇÃO', 'COLETA': 'COLETA',
      'ENTREGA': 'ENTREGA', 'CABOTAGEM': 'CABOTAGEM',
    };
    result.tipoOperacao = map[t] || t;
  }

  const bookingMatch = full.match(/Booking\s+([A-Z0-9-]+)/i);
  if (bookingMatch) result.booking = bookingMatch[1].toUpperCase();

  const agMatch = full.match(/Agendamento\s+N[ºo°]?\s*(\d+)/i);
  if (agMatch) result.agendamento = agMatch[1];

  // ── Navio / Viagem ───────────────────────────────────────────────────────
  const navioCampoMatch = full.match(/Navio\s*\/\s*Viagem\s+(.+?)(?:\s+Programa[çc][ãa]o|\n|$)/i);
  if (navioCampoMatch) result.navioViagemCampo = cleanShip(navioCampoMatch[1]);

  // Regra: quando as Demais Observações trazem "NAVIO: X", esse é o navio real
  // (o campo Navio/Viagem pode vir com o navio-mãe errado, ex.: Maersk Cap Carmel)
  const obsSplit = full.split(/Demais Observa[çc][õo]es/i);
  const obsText = obsSplit.length > 1 ? obsSplit[obsSplit.length - 1].trim() : '';
  if (obsText) result.observacoes = obsText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();

  const navioObsMatch = obsText.match(/NAVIO\s*:?\s*([A-ZÀ-Ú][A-ZÀ-Ú0-9 .\-]*?\s*\/\s*[A-Z0-9]+)/i);
  if (navioObsMatch) {
    result.ship = cleanShip(navioObsMatch[1]);
    result.shipFromObs = true;
  } else {
    result.ship = result.navioViagemCampo;
    result.shipFromObs = false;
  }

  // ── Rota ─────────────────────────────────────────────────────────────────
  const polMatch = full.match(/POL\s+(\S+)\s+POD\s+(\S+)/i);
  if (polMatch) { result.pol = polMatch[1]; result.pod = polMatch[2]; }
  const destMatch = full.match(/Destino Final\s+(.+?)\s+Service/i);
  if (destMatch) result.destinoFinal = destMatch[1].trim().toUpperCase();
  const armadorMatch = full.match(/Armador\s+([^\n]+)/i);
  if (armadorMatch) result.armador = armadorMatch[1].trim().toUpperCase();

  // ── Cliente ──────────────────────────────────────────────────────────────
  const clienteMatch = full.match(/Cliente\s+(.{3,}?)\s+Embarcador/);
  if (clienteMatch && !/^(?:CNPJ|Endere)/i.test(clienteMatch[1])) {
    result.cliente = clienteMatch[1].trim().toUpperCase();
  }

  // ── Container / valores (linha da tabela após o cabeçalho) ───────────────
  for (const line of lines) {
    const m = line.match(/^(?:([A-Z]{4}\s?\d{7})\s+)?(\d{2})\s?(HC|DC|RF|RH|OT|FR|TK|GP|DV)\b\s+(.*)$/i);
    if (m) {
      if (m[1]) result.container = m[1].replace(/\s/g, '').toUpperCase();
      result.containerTipo = `${m[2]}${m[3].toUpperCase()}`;
      const tokens = m[4].split(/\s+/);
      // Container também pode vir depois do tipo na mesma linha
      if (!result.container) {
        const contTok = tokens.find(t => /^[A-Z]{4}\d{7}$/i.test(t));
        if (contTok) result.container = contTok.toUpperCase();
      }
      const nums = tokens.filter(t => /^[\d.]+,\d{2}$/.test(t));
      if (nums[0]) result.pesoCarga = nums[0];
      if (nums[1]) result.tara = nums[1];
      if (nums[2]) result.valorNf = nums[2];
      const aut = tokens.find(t => /^\d{4,}$/.test(t));
      if (aut) result.autColeta = aut;
      break;
    }
  }

  // ── Local Coleta ─────────────────────────────────────────────────────────
  const embMatch = full.match(/Embarcador\s+(.+?)\s+CNPJ\s+(\d{11,14})/);
  if (embMatch) {
    result.embarcador = embMatch[1].trim().toUpperCase();
    result.cnpjColeta = embMatch[2];
  }
  if (!result.cliente && result.embarcador) result.cliente = result.embarcador;

  const endMatch = full.match(/Endere[çc]o\s+([^\n]+)/i);
  if (endMatch) result.enderecoColeta = endMatch[1].trim().toUpperCase();
  const munMatch = full.match(/Munic[íi]pio\s+(.+?)\s+Uf\s+([A-Z]{2})/i);
  if (munMatch) { result.municipioColeta = munMatch[1].trim().toUpperCase(); result.ufColeta = munMatch[2]; }
  const bairroMatch = full.match(/Bairro\s+(.+?)\s+Cep\s+(\d{7,8})/i);
  if (bairroMatch) { result.bairroColeta = bairroMatch[1].trim().toUpperCase(); result.cepColeta = bairroMatch[2]; }
  const contatoMatch = full.match(/Contato\s+([^\n]*?)\s*Fone\s*([\d ()\-.]*)/i);
  if (contatoMatch) {
    const c = contatoMatch[1].trim();
    if (c) result.contato = c.toUpperCase();
    const f = contatoMatch[2].trim();
    if (f) result.foneColeta = f;
  }

  const mercMatch = full.match(/Mercadoria\s+(.+?)\s+Seguro/i);
  if (mercMatch) result.mercadoria = mercMatch[1].trim().toUpperCase();

  // ── Requerimento especial: descrição completa + senha da OC ──────────────
  // Ex.: "Geral | INFORMAR SENHA NA OC - 6500152549 // Embarque IN65-02904/26EX"
  const reqMatch = full.match(/Requerimento Especial\s+Descri[çc][ãa]o\s+(\S+)\s+(.+?)(?:\n|Programa[çc][ãa]o de Servi|$)/i);
  if (reqMatch) {
    result.requerimentoTipo = reqMatch[1].trim().toUpperCase();
    result.requerimentoDescricao = reqMatch[2].replace(/\s+/g, ' ').trim();
  }
  // Extrai TODO o campo após "INFORMAR SENHA NA OC" (senha + embarque),
  // não só o número — ex.: "6500152549 // Embarque IN65-02904/26EX"
  const senhaMatch = full.match(/SENHA NA OC\s*[-:]?\s*(.+?)(?:\n|Programa[çc][ãa]o de Servi|Retirar Vazio|$)/i);
  if (senhaMatch) {
    const campo = senhaMatch[1].replace(/\s+/g, ' ').trim().replace(/[-–]\s*$/, '').trim();
    result.senhaOc = campo;
    const numMatch = campo.match(/\d{6,}/);
    if (numMatch) result.senhaNumero = numMatch[0];
    // O campo completo vale como autorização de coleta quando informado
    result.autColeta = campo;
  }

  const normFull = norm(full);
  if (/CARGO PREMIUM/.test(normFull)) {
    result.padraoCarga = 'CARGO PREMIUM';
  } else if (/REEFER/.test(normFull)) {
    result.padraoCarga = 'REEFER';
  } else if (/ALIMENTO/.test(normFull)) {
    result.padraoCarga = 'PADRÃO ALIMENTO';
  } else {
    result.padraoCarga = 'CARGA GERAL';
  }

  // ── Programação de Serviços: data/hora da coleta ─────────────────────────
  for (const line of lines) {
    const m = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+\d+\s*$/);
    if (m) {
      result.dataColeta = `${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2, '0')}:${m[5]}`;
      break;
    }
  }

  // ── Faturamento / tipo de viagem ─────────────────────────────────────────
  const docRefMatch = full.match(/Doc refer[êe]ncia:\s*([^\n]+)/i);
  if (docRefMatch) result.docReferencia = docRefMatch[1].trim();

  const retMatch = full.match(/Retirar Vazio\s+(.+?)\s+Entregar Cheio\s+([^\n]+)/i);
  if (retMatch) {
    result.retirarVazio = retMatch[1].trim().toUpperCase();
    result.entregarCheio = retMatch[2].trim().toUpperCase();
  }

  return result;
}

/** Lê o PDF da OS e faz o parse. Retorna null se não for uma OS reconhecível. */
export async function parseAliancaOsPdf(file: File): Promise<ParsedAliancaOs | null> {
  const text = await extractTextFromPDF(file);
  return parseAliancaOsText(text);
}

// ── Matching contra cadastros do banco ───────────────────────────────────────

/** "20000,00" / "3.880,50" → "20000" / "3880.5" (kg como string numérica). */
export const normalizeKg = (v?: string): string | undefined => {
  if (!v) return undefined;
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? undefined : String(n);
};

export const normMatch = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Encontra o cliente cadastrado: CNPJ exato → raiz do CNPJ → nome. */
export function matchCustomer<T extends { cnpj?: string; name?: string; legalName?: string }>(
  customers: T[],
  parsed: ParsedAliancaOs
): T | undefined {
  const cnpj = parsed.cnpjColeta?.replace(/\D/g, '') || '';
  if (cnpj.length >= 8) {
    const exact = customers.find(c => (c.cnpj || '').replace(/\D/g, '') === cnpj);
    if (exact) return exact;
    const root = customers.find(c => (c.cnpj || '').replace(/\D/g, '').slice(0, 8) === cnpj.slice(0, 8));
    if (root) return root;
  }
  const target = normMatch(parsed.cliente || parsed.embarcador || '');
  if (!target) return undefined;
  return customers.find(c => {
    const n = normMatch(c.name || '');
    const l = normMatch(c.legalName || '');
    return (n.length > 3 && (target.includes(n) || n.includes(target)))
      || (l.length > 3 && (target.includes(l) || l.includes(target)));
  });
}

/** Encontra o tipo de viagem do banco a partir do "Doc referência" da OS. */
export function matchTipoViagem<T extends { id: string; name: string }>(
  options: T[],
  docReferencia?: string
): T | undefined {
  if (!docReferencia) return undefined;
  const doc = normMatch(docReferencia);
  const byKeyword = (kw: string) => options.find(o => normMatch(o.name).includes(kw));
  if (doc.includes('RODOVIARIO')) return byKeyword('RODOVIARIO');
  if (doc.includes('LONGO')) return byKeyword('LONGO');
  return options.find(o => {
    const n = normMatch(o.name);
    return n.includes(doc) || doc.includes(n);
  });
}

/**
 * Casa o tipo de operação da OS (Exportação/Coleta/Importação/Entrega) com um
 * dos tipos de operação cadastrados no banco (ex.: "COLETA CABOTAGEM",
 * "ENTREGA CABOTAGEM", "EXPORTAÇÃO", "IMPORTAÇÃO"). Retorna o nome cadastrado.
 */
export function matchOperationType<T extends { name?: string }>(
  options: T[],
  parsedType?: string
): T | undefined {
  const t = normMatch(parsedType || '');
  if (!t || options.length === 0) return undefined;
  // 1. Match exato
  const exact = options.find(o => normMatch(o.name || '') === t);
  if (exact) return exact;
  // 2. A palavra-chave da OS é a primeira palavra do tipo cadastrado
  //    ("COLETA" → "COLETA CABOTAGEM", "ENTREGA" → "ENTREGA CABOTAGEM")
  const byPrefix = options.find(o => {
    const n = normMatch(o.name || '');
    return n === t || n.startsWith(t + ' ') || n.split(' ')[0] === t;
  });
  if (byPrefix) return byPrefix;
  // 3. Contém em qualquer direção
  return options.find(o => {
    const n = normMatch(o.name || '');
    return n.includes(t) || t.includes(n);
  });
}

/** Match genérico por nome (portos/terminais, tipos de container...). */
export function matchByName<T extends { name?: string }>(list: T[], target?: string): T | undefined {
  const t = normMatch(target || '');
  if (!t) return undefined;
  let best: T | undefined;
  let bestScore = 0;
  for (const item of list) {
    const n = normMatch(item.name || '');
    if (!n) continue;
    if (t === n) return item;
    if (t.includes(n) || n.includes(t)) return item;
    const tokens = n.split(' ').filter(w => w.length > 3);
    if (tokens.length === 0) continue;
    const score = tokens.filter(w => t.includes(w)).length / tokens.length;
    if (score >= 0.5 && score > bestScore) { bestScore = score; best = item; }
  }
  return best;
}
