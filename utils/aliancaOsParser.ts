
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
  lacre?: string;               // lacre da tabela de container (OS de entrega)
  ctacBl?: string;              // CTAC/BL da tabela
  // Local Entrega (OS de entrega/importação)
  localEntregaNome?: string;
  localEntregaCnpj?: string;
  localEntregaEndereco?: string;
  localEntregaMunicipio?: string;
  localEntregaUf?: string;
  localEntregaBairro?: string;
  localEntregaCep?: string;
  localEntregaContato?: string;
  localEntregaFone?: string;
  retirarCheio?: string;        // onde retirar o cheio (OS de entrega — terminal/porto)
  entregarVazio?: string;       // depósito de devolução do vazio (OS de entrega)
  mercadoria?: string;
  faturarNome?: string;         // tomador do serviço (campo "FATURAR A" da OS)
  faturarCnpj?: string;
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

/** Parse do texto extraído do PDF da OS (Aliança/Maersk e Mercosul Line). */
export function parseAliancaOsText(text: string): ParsedAliancaOs | null {
  // Aliança: "Ordem de Serviço - ..."; Mercosul: "Ordem Serviço - ..."
  if (!/Ordem (?:de )?Servi/i.test(text)) return null;

  // OS Mercosul: a fonte dos campos insere um espaço após cada "M"
  // ("M ERCOSUL", "CM A CGM", "EM BALAGENS"). Não dá para distinguir todo caso
  // do espaço legítimo, então corrige só os inequívocos: "M" isolado no início
  // de palavra e prefixo de uma letra + M (EM/AM/CM/UM quebrados). Aplica só
  // na área de campos (o rodapé/observações usa fonte normal).
  if (/Ordem Servi[çc]o\s*[-–]/i.test(text) && /\bM [A-ZÀ-Ú]{2,}/.test(text)) {
    const cut = text.search(/REGISTRO DO CLIENTE|ATEN[ÇC][ÃA]O:/i);
    const head = cut >= 0 ? text.slice(0, cut) : text;
    const tail = cut >= 0 ? text.slice(cut) : '';
    text = head
      .replace(/\bM (?=[A-ZÀ-Ú]{2,})/g, 'M')                 // M ERCOSUL → MERCOSUL
      .replace(/\b([A-ZÀ-Ú])M ([A-ZÀ-Ú])/g, '$1M$2')         // CM A → CMA, EM BALAGENS → EMBALAGENS
      + tail;
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const full = lines.join('\n');
  const result: ParsedAliancaOs = {};

  // ── Identificação ────────────────────────────────────────────────────────
  // Nº pode vir com espaço no meio (Mercosul: "6SP 561482A") — padroniza sem espaço
  const osMatch = full.match(/N[ºo°]\s*([0-9][A-Z]{2,4}\s?[0-9]{4,}[A-Z]?)/)
    || full.match(/^([0-9]{1,2}[A-Z]{2,4}\s?[0-9]{4,}[A-Z]?)\s*$/m);
  if (osMatch) result.os = osMatch[1].replace(/\s+/g, '').toUpperCase();

  const tipoMatch = full.match(/Ordem (?:de )?Servi[çc]o\s*[-–]\s*([A-Za-zçãõÇÃÕ]+)/);
  if (tipoMatch) {
    const t = norm(tipoMatch[1]);
    const map: Record<string, string> = {
      'EXPORTACAO': 'EXPORTAÇÃO', 'IMPORTACAO': 'IMPORTAÇÃO', 'COLETA': 'COLETA',
      'ENTREGA': 'ENTREGA', 'CABOTAGEM': 'CABOTAGEM',
    };
    result.tipoOperacao = map[t] || t;
  }

  const bookingMatch = full.match(/Booking:?\s+([A-Z0-9-]+)/i);
  if (bookingMatch) result.booking = bookingMatch[1].toUpperCase();

  const agMatch = full.match(/Agendam(?:ento|\.)\s*N\.?[ºo°]?\.?:?\s*(\d+)/i);
  if (agMatch) result.agendamento = agMatch[1];

  // ── Navio / Viagem ───────────────────────────────────────────────────────
  const navioCampoMatch = full.match(/Navio\s*\/\s*Viagem:?\s+(.+?)(?:\s+Programa[çc][ãa]o|\s+Data emiss|\n|$)/i);
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
  const polMatch = full.match(/POL:?\s+(.+?)\s+POD:?\s+(\S+)/i);
  if (polMatch) { result.pol = polMatch[1].trim(); result.pod = polMatch[2]; }
  const destMatch = full.match(/Destino Final:?\s+(.+?)\s+(?:Service|Programa)/i);
  if (destMatch) result.destinoFinal = destMatch[1].trim().toUpperCase();
  const armadorMatch = full.match(/Armador\s+([^\n]+)/i);
  if (armadorMatch) result.armador = armadorMatch[1].trim().toUpperCase();

  // ── Cliente ──────────────────────────────────────────────────────────────
  const clienteMatch = full.match(/Cliente:?\s+(.{3,}?)\s+(?:Embarcador|Modal)/);
  if (clienteMatch && !/^(?:CNPJ|Endere)/i.test(clienteMatch[1])) {
    result.cliente = clienteMatch[1].trim().toUpperCase();
  }

  // ── Container / valores (linha da tabela após o cabeçalho) ───────────────
  // Colunas: Container | Tipo | Lacre | Peso Carga | Tara | CTAC/BL | NF |
  // Valor NF | IMO | Aut Coleta/Entrega | Reut. — parsing posicional pelos
  // números com vírgula (peso, tara, valor NF)
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
      const numIdx = tokens
        .map((t, i) => (/^[\d.]+,\d{2}$/.test(t) ? i : -1))
        .filter(i => i >= 0);
      if (numIdx.length >= 1) result.pesoCarga = tokens[numIdx[0]];
      if (numIdx.length >= 2) result.tara = tokens[numIdx[1]];
      if (numIdx.length >= 3) result.valorNf = tokens[numIdx[2]];
      // Lacre: entre o tipo e o peso da carga
      if (numIdx.length >= 1 && numIdx[0] > 0) {
        const lacreTok = tokens.slice(0, numIdx[0]).find(t => /^[A-Z0-9]{4,}$/i.test(t) && t.toUpperCase() !== result.container);
        if (lacreTok) result.lacre = lacreTok.toUpperCase();
      }
      // CTAC/BL: entre a tara e o valor NF
      if (numIdx.length >= 3 && numIdx[2] > numIdx[1] + 1) {
        const ctacTok = tokens.slice(numIdx[1] + 1, numIdx[2]).find(t => /^[A-Z0-9]{5,}$/i.test(t));
        if (ctacTok) result.ctacBl = ctacTok.toUpperCase();
      }
      // Aut. coleta/entrega: após o valor NF — pode ter letras E espaços
      // (ex.: MSKF000485, "AB 123456"). Remove as flags IMO/Reut (N/S) das
      // pontas e junta o restante; valores duplicados (Aut = Ped. Cliente)
      // viram um só.
      const tail = numIdx.length >= 3 ? [...tokens.slice(numIdx[2] + 1)] : [...tokens];
      while (tail.length && /^[NS]$/i.test(tail[0])) tail.shift();
      while (tail.length && /^[NS]$/i.test(tail[tail.length - 1])) tail.pop();
      const autTokens = tail.filter(t => /^[A-Z0-9./-]+$/i.test(t));
      if (autTokens.length) {
        const uniq = Array.from(new Set(autTokens.map(t => t.toUpperCase())));
        const aut = (uniq.length === 1 ? uniq[0] : autTokens.join(' ')).toUpperCase();
        if (aut.replace(/[^A-Z0-9]/gi, '').length >= 4) result.autColeta = aut;
      }
      break;
    }
  }

  // ── Local Coleta (escopo da seção; OS de coleta/exportação) ──────────────
  const coletaScope = full.split(/Local Coleta/i)[1]?.split(/Informa[çc][õo]es Sobre a Carga|Local Entrega|Mercadorias|PROGRAMA[ÇC][ÃA]O DE SERVI/i)[0] || full;
  // Nome pode quebrar em duas linhas — [\s\S] limitado + colapso de espaços
  const embMatch = coletaScope.match(/Embarcador:?\s+([\s\S]{3,90}?)\s+CNPJ:?\s+(\d{11,14})/)
    || full.match(/Embarcador:?\s+([\s\S]{3,90}?)\s+CNPJ:?\s+(\d{11,14})/);
  if (embMatch) {
    result.embarcador = embMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
    result.cnpjColeta = embMatch[2];
  }
  if (!result.cliente && result.embarcador) result.cliente = result.embarcador;

  const endMatch = coletaScope.match(/Endere[çc]o:?\s+([^\n]+)/i);
  if (endMatch) result.enderecoColeta = endMatch[1].trim().toUpperCase();
  const munMatch = coletaScope.match(/Munic[íi]pio:?\s+(.+?)\s+Uf:?\s+([A-Z]{2})/i);
  if (munMatch) { result.municipioColeta = munMatch[1].trim().toUpperCase(); result.ufColeta = munMatch[2]; }
  const bairroMatch = coletaScope.match(/Bairro:?\s+(.+?)\s+Cep:?\s+(\d{7,8})/i);
  if (bairroMatch) { result.bairroColeta = bairroMatch[1].trim().toUpperCase(); result.cepColeta = bairroMatch[2]; }
  const contatoMatch = coletaScope.match(/Contato:?\s+([^\n]*?)\s*Fone:?\s*([\d ()\-.]*)/i);
  if (contatoMatch) {
    const c = contatoMatch[1].trim();
    if (c && !/^-+$/.test(c)) result.contato = c.toUpperCase();
    const f = contatoMatch[2].trim();
    if (f) result.foneColeta = f;
  }

  // ── Local Entrega (OS de entrega/importação) ─────────────────────────────
  const entregaSplit = full.split(/Local Entrega/i);
  if (entregaSplit.length > 1) {
    const sec = entregaSplit[1].split(/Informa[çc][õo]es Sobre a Carga|Programa[çc][ãa]o de Servi/i)[0] || '';
    // Nome do destinatário pode quebrar em duas linhas
    const dMatch = sec.match(/Destinat[áa]rio:?\s+([\s\S]{3,90}?)\s+CNPJ:?\s+(\d{11,14})/);
    if (dMatch) {
      result.localEntregaNome = dMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
      result.localEntregaCnpj = dMatch[2];
    } else {
      // Fallback: primeiro CNPJ da seção + texto entre "Destinatário" e ele
      const cnpjSec = sec.match(/CNPJ:?\s+(\d{11,14})/i);
      if (cnpjSec) {
        result.localEntregaCnpj = cnpjSec[1];
        const antes = sec.slice(0, cnpjSec.index || 0).replace(/Destinat[áa]rio:?/i, '');
        const nome = antes.replace(/\s+/g, ' ').replace(/CNPJ:?\s*$/i, '').trim();
        if (nome.length >= 3) result.localEntregaNome = nome.toUpperCase();
      }
    }
    const eMatch = sec.match(/Endere[çc]o:?\s+([^\n]+)/i);
    if (eMatch) result.localEntregaEndereco = eMatch[1].trim().toUpperCase();
    const mMatch = sec.match(/Munic[íi]pio:?\s+(.+?)\s+Uf:?\s+([A-Z]{2})/i);
    if (mMatch) { result.localEntregaMunicipio = mMatch[1].trim().toUpperCase(); result.localEntregaUf = mMatch[2]; }
    const bMatch = sec.match(/Bairro:?\s+(.+?)\s+Cep:?\s+(\d{7,8})/i);
    if (bMatch) { result.localEntregaBairro = bMatch[1].trim().toUpperCase(); result.localEntregaCep = bMatch[2]; }
    const cMatch = sec.match(/Contato:?\s+([^\n]*?)\s*Fone:?\s*([\d ()\-.]*)/i);
    if (cMatch) {
      const c = cMatch[1].trim();
      if (c && !/^-+$/.test(c)) result.localEntregaContato = c.toUpperCase();
      if (cMatch[2].trim()) result.localEntregaFone = cMatch[2].trim();
    }
  }

  // ── Retirar Cheio / Entregar Vazio (OS de entrega/importação) ────────────
  const retCheioMatch = full.match(/Retirar Cheio:?\s+(.+?)\s+Entregar Vazio/i);
  if (retCheioMatch) result.retirarCheio = retCheioMatch[1].trim().toUpperCase();

  const vazioMatch = full.match(/Entregar Vazio:?\s+(.+?)(?:\s+Retirar Cheio.*)?$/im);
  if (vazioMatch) result.entregarVazio = vazioMatch[1].trim().toUpperCase();

  const mercMatch = full.match(/Mercadorias?:?\s+(.+?)(?:\s+Seguro|\n|$)/i);
  if (mercMatch) result.mercadoria = mercMatch[1].trim().toUpperCase();

  // ── Tomador do serviço ("FATURAR A" nas observações de faturamento) ──────
  const fatMatch = full.match(/FATURAR A\s*:?\s*(.+?)(?=\s+CNPJ|\n|$)/i);
  if (fatMatch) {
    result.faturarNome = fatMatch[1].trim().toUpperCase();
    const after = full.slice((fatMatch.index || 0) + fatMatch[0].length, (fatMatch.index || 0) + fatMatch[0].length + 200);
    const fatCnpj = after.match(/CNPJ\s*:?\s*(\d{11,14})/i);
    if (fatCnpj) result.faturarCnpj = fatCnpj[1];
  }

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
  // Mercosul traz o campo explícito "Padrão Alimento: SIM/NÃO" — ele decide
  const padraoAlimentoField = normFull.match(/PADRAO ALIMENTO:?\s*(SIM|NAO)/);
  if (padraoAlimentoField) {
    result.padraoCarga = padraoAlimentoField[1] === 'SIM' ? 'PADRÃO ALIMENTO' : 'CARGA GERAL';
  } else if (/CARGO PREMIUM/.test(normFull)) {
    result.padraoCarga = 'CARGO PREMIUM';
  } else if (/REEFER/.test(normFull)) {
    result.padraoCarga = 'REEFER';
  } else if (/ALIMENTO/.test(normFull)) {
    result.padraoCarga = 'PADRÃO ALIMENTO';
  } else {
    result.padraoCarga = 'CARGA GERAL';
  }

  // ── Programação de Serviços: data/hora da coleta ─────────────────────────
  // Aliança encerra a linha com um contador; Mercosul termina na hora (hh:mm)
  for (const line of lines) {
    const m = line.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?:\s+\d+)?\s*$/);
    if (m) {
      result.dataColeta = `${m[3]}-${m[2]}-${m[1]}T${m[4].padStart(2, '0')}:${m[5]}`;
      break;
    }
  }

  // ── Faturamento / tipo de viagem ─────────────────────────────────────────
  const docRefMatch = full.match(/Doc refer[êe]ncia:\s*([^\n]+)/i);
  if (docRefMatch) result.docReferencia = docRefMatch[1].trim();

  // Fallback: se não veio o campo "Doc referência", identifica a modalidade do
  // CT-e pelo texto (CTe Rodoviário → Rodoviário; CTe Longo Curso/Custo → Longo
  // Curso) para o tipo de viagem ser preenchido automaticamente com os cadastrados.
  if (!result.docReferencia) {
    const nf = norm(full);
    if (nf.includes('LONGO CUR') || nf.includes('LONGO CUS')) {
      result.docReferencia = 'Longo Curso';
    } else if (nf.includes('CTE RODOVIARIO') || nf.includes('CT-E RODOVIARIO') || nf.includes('CT E RODOVIARIO')) {
      result.docReferencia = 'Rodoviário';
    }
  }

  const retMatch = full.match(/Retirar Vazio:?\s+(.+?)\s+Entregar Cheio:?\s+([^\n]+)/i);
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

/** Entrega/Importação (vs. Coleta/Exportação) — muda as regras de cliente/destino. */
export function isEntregaImportacao(tipoOperacao?: string): boolean {
  const t = normMatch(tipoOperacao || '');
  return /ENTREGA|IMPORTA/.test(t);
}

/**
 * Identifica o lado da operação pelas PARTES da OS (remetentes/destinatários):
 * - Com Destinatário (seção Local Entrega) → entrega/importação
 * - Só com Embarcador (seção Local Coleta) → coleta/exportação
 * O título da OS entra apenas como fallback quando nenhuma parte foi extraída.
 */
export function isEntregaImportacaoOs(p: ParsedAliancaOs): boolean {
  if (p.localEntregaNome || p.localEntregaCnpj) return true;
  if (p.embarcador || p.cnpjColeta) return false;
  return isEntregaImportacao(p.tipoOperacao);
}

/** Rótulo do tipo identificado pelas partes, para exibição. */
export function tipoOperacaoIdentificado(p: ParsedAliancaOs): string {
  return isEntregaImportacaoOs(p) ? 'ENTREGA / IMPORTAÇÃO' : 'COLETA / EXPORTAÇÃO';
}

export interface OsClienteDestino {
  clienteNome?: string;
  clienteOrigem: 'LOCAL COLETA' | 'LOCAL ENTREGA';
  clienteCnpj?: string;
  clienteEndereco?: string;
  clienteMunicipio?: string;
  clienteUf?: string;
  clienteBairro?: string;
  clienteCep?: string;
  clienteContato?: string;
  clienteFone?: string;
  destinoNome?: string;
  destinoOrigem: 'ENTREGAR CHEIO' | 'ENTREGAR VAZIO';
}

/**
 * Regras de preenchimento por tipo de operação (identificado pelas partes):
 * - Coleta cabotagem / Exportação → cliente = Local Coleta; destino = Entregar Cheio
 * - Entrega cabotagem / Importação → cliente = Local Entrega; destino = Entregar Vazio
 */
export function resolveClienteDestino(p: ParsedAliancaOs): OsClienteDestino {
  if (isEntregaImportacaoOs(p)) {
    return {
      clienteNome: p.localEntregaNome,
      clienteOrigem: 'LOCAL ENTREGA',
      clienteCnpj: p.localEntregaCnpj,
      clienteEndereco: p.localEntregaEndereco,
      clienteMunicipio: p.localEntregaMunicipio,
      clienteUf: p.localEntregaUf,
      clienteBairro: p.localEntregaBairro,
      clienteCep: p.localEntregaCep,
      clienteContato: p.localEntregaContato,
      clienteFone: p.localEntregaFone,
      destinoNome: p.entregarVazio,
      destinoOrigem: 'ENTREGAR VAZIO',
    };
  }
  return {
    clienteNome: p.cliente || p.embarcador,
    clienteOrigem: 'LOCAL COLETA',
    clienteCnpj: p.cnpjColeta,
    clienteEndereco: p.enderecoColeta,
    clienteMunicipio: p.municipioColeta,
    clienteUf: p.ufColeta,
    clienteBairro: p.bairroColeta,
    clienteCep: p.cepColeta,
    clienteContato: p.contato,
    clienteFone: p.foneColeta,
    destinoNome: p.entregarCheio,
    destinoOrigem: 'ENTREGAR CHEIO',
  };
}

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
  // Cliente conforme o tipo de operação: coleta/exportação = Local Coleta;
  // entrega/importação = Local Entrega.
  const cd = resolveClienteDestino(parsed);
  const cnpj = cd.clienteCnpj?.replace(/\D/g, '') || '';
  if (cnpj.length >= 8) {
    const exact = customers.find(c => (c.cnpj || '').replace(/\D/g, '') === cnpj);
    if (exact) return exact;
    const root = customers.find(c => (c.cnpj || '').replace(/\D/g, '').slice(0, 8) === cnpj.slice(0, 8));
    if (root) return root;
  }
  const target = normMatch(cd.clienteNome || '');
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
