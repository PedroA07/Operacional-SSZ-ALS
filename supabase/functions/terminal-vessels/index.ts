const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TerminalVessel {
  navio: string;
  situacao: string;
  previsao?: string;
  berco?: string;
  armador?: string;
  viagem?: string;
  terminal: string;
  gateDry?: string;
  gateReefer?: string;
  deadLineStr?: string;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCells(row: string): string[] {
  const cells: string[] = [];
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  while ((match = cellRegex.exec(row)) !== null) {
    cells.push(stripTags(match[1]));
  }
  return cells;
}

function extractHeaderCells(row: string): string[] {
  const cells: string[] = [];
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let match;
  while ((match = thRegex.exec(row)) !== null) {
    cells.push(stripTags(match[1]).toLowerCase());
  }
  // fallback: tds na primeira linha
  if (cells.length === 0) {
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((match = tdRegex.exec(row)) !== null) {
      cells.push(stripTags(match[1]).toLowerCase());
    }
  }
  return cells;
}

function findColIndex(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (keywords.some(k => h.includes(k))) return i;
  }
  return -1;
}

// Heurística: célula que parece nome de navio (maiúsculas, não é só número/data)
function looksLikeVesselName(s: string): boolean {
  if (!s || s.length < 3) return false;
  if (/^\d+$/.test(s.trim())) return false;
  if (/^\d{2}\/\d{2}/.test(s.trim())) return false;
  return /[A-Z]{2,}/.test(s);
}

function parseHtmlTable(html: string, terminalName: string, vesselFilter?: string): TerminalVessel[] {
  const vessels: TerminalVessel[] = [];
  const rows: string[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    rows.push(match[0]);
  }
  if (rows.length === 0) return vessels;

  // Encontra a linha de cabeçalho nas primeiras 10 linhas
  let headers: string[] = [];
  let dataStart = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const h = extractHeaderCells(rows[i]);
    if (h.length >= 2) {
      headers = h;
      dataStart = i + 1;
      break;
    }
  }

  const navioIdx      = findColIndex(headers, ['navio', 'vessel', 'ship', 'embarca', 'nome']);
  const situacaoIdx   = findColIndex(headers, ['situa', 'status', 'estado', 'opera', 'condi']);
  const previsaoIdx   = findColIndex(headers, ['previs', 'eta', 'data', 'chegada', 'atrac', 'hora', 'inicio']);
  const bercoIdx      = findColIndex(headers, ['ber', 'dock', 'pier', 'cais', 'bco']);
  const armadorIdx    = findColIndex(headers, ['armador', 'shipping', 'companhia', 'linha', 'agenc', 'agent']);
  const viagemIdx     = findColIndex(headers, ['viagem', 'voyage', 'trip', 'num', 'vg']);
  const gateDryIdx    = findColIndex(headers, ['gate dry', 'dry', 'abertura gate d', 'abert. gate d']);
  const gateReeferIdx = findColIndex(headers, ['gate reefer', 'reefer', '40hr', 'abertura gate r', 'abert. gate r']);
  const deadLineIdx   = findColIndex(headers, ['dead', 'deadline', 'prazo', 'encerr']);

  for (let i = dataStart; i < rows.length; i++) {
    const cells = extractCells(rows[i]);
    if (cells.length < 2) continue;
    if (!cells.some(c => c.trim().length > 0)) continue;

    // Pega nome do navio: por índice se header encontrado, senão heurística
    let navio = '';
    if (navioIdx >= 0 && navioIdx < cells.length) {
      navio = cells[navioIdx];
    } else {
      navio = cells.find(looksLikeVesselName) ?? cells[0] ?? '';
    }
    if (!navio.trim()) continue;
    if (vesselFilter && !navio.toLowerCase().includes(vesselFilter.toLowerCase())) continue;

    // Situação: por índice ou segunda célula com conteúdo
    const situacao = situacaoIdx >= 0 && situacaoIdx < cells.length
      ? cells[situacaoIdx]
      : cells.find((c, ci) => ci !== cells.indexOf(navio) && c.trim() && !/^\d{2}\/\d{2}/.test(c)) ?? cells[1] ?? '';

    // Previsão: por índice ou primeira célula com padrão de data/hora
    const previsao = previsaoIdx >= 0 && previsaoIdx < cells.length
      ? cells[previsaoIdx]
      : cells.find(c => /\d{2}\/\d{2}|\d{2}:\d{2}/.test(c));

    const gateDry   = (gateDryIdx    >= 0 && gateDryIdx    < cells.length ? cells[gateDryIdx]    : undefined)?.trim() || undefined;
    const gateReefer = (gateReeferIdx >= 0 && gateReeferIdx < cells.length ? cells[gateReeferIdx] : undefined)?.trim() || undefined;
    const deadLine   = (deadLineIdx   >= 0 && deadLineIdx   < cells.length ? cells[deadLineIdx]   : undefined)?.trim() || undefined;

    // Deriva situacao das datas de gate quando não identificada via coluna
    // (ex: BTP sempre retorna "Desatracado" na coluna situacao)
    let finalSituacao = situacao.trim() || 'Desconhecido';
    const gateStr = gateDry || gateReefer;
    if (gateStr || deadLine) {
      const parseDateStr = (s: string): Date | null => {
        if (!s) return null;
        if (s.includes('/')) {
          const parts = s.split(' ');
          const [d, m, y] = parts[0].split('/');
          const time = parts[1]?.slice(0, 5) || '00:00';
          const dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${time}:00`);
          return isNaN(dt.getTime()) ? null : dt;
        }
        const dt = new Date(s);
        return isNaN(dt.getTime()) ? null : dt;
      };
      const gateDt  = gateStr  ? parseDateStr(gateStr)  : null;
      const deadDt  = deadLine ? parseDateStr(deadLine) : null;
      const now = new Date();
      if (gateDt || deadDt) {
        if (gateDt && gateDt > now)                       finalSituacao = 'Gate Fechado';
        else if (deadDt && deadDt > now)                  finalSituacao = 'Gate Aberto';
        else if ((gateDt && gateDt <= now) || (deadDt && deadDt <= now)) finalSituacao = 'Gate Encerrado';
      }
    }

    vessels.push({
      navio: navio.trim(),
      situacao: finalSituacao,
      previsao: previsao?.trim() || undefined,
      berco:    (bercoIdx   >= 0 && bercoIdx   < cells.length ? cells[bercoIdx]   : undefined)?.trim() || undefined,
      armador:  (armadorIdx >= 0 && armadorIdx < cells.length ? cells[armadorIdx] : undefined)?.trim() || undefined,
      viagem:   (viagemIdx  >= 0 && viagemIdx  < cells.length ? cells[viagemIdx]  : undefined)?.trim() || undefined,
      terminal: terminalName,
      gateDry,
      gateReefer,
      deadLineStr: deadLine,
    });
  }
  return vessels;
}

// ─── Configuração de terminais ────────────────────────────────────────────────
const TERMINAL_CONFIG: Record<string, {
  urls: string[];        // tentativas em ordem
  name: string;
  referer: string;
}> = {
  ecoporto: {
    urls: [
      'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
      'https://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
    ],
    name: 'ECOPORTO',
    referer: 'http://op.ecoportosantos.com.br/',
  },
  btp: {
    urls: [
      'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
      'https://portaldocliente.btp.com.br/sistemas/processos-logisticos/ConsultasLivres/listaatracacaoindex',
    ],
    name: 'BTP',
    referer: 'https://novo-tas.btp.com.br/',
  },
  santosbrasil: {
    urls: [
      'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp',
      'https://www.santosbrasil.com.br/v2021/lista-de-atracacao',
    ],
    name: 'SANTOS BRASIL',
    referer: 'https://www.santosbrasil.com.br/',
  },
};

const BROWSER_HEADERS = (referer: string) => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': referer,
  'Origin': new URL(referer).origin,
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
});

async function fetchTerminal(
  terminalKey: string,
  vesselFilter?: string
): Promise<{ vessels: TerminalVessel[]; error?: string; terminal: string; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const config = TERMINAL_CONFIG[terminalKey];
  if (!config) return { vessels: [], error: 'Terminal desconhecido', terminal: terminalKey, fetchedAt };

  let lastError = '';
  for (const url of config.urls) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: BROWSER_HEADERS(config.referer),
        redirect: 'follow',
      });

      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue; // tenta próxima URL
      }

      const html = await response.text();

      // Detecta se é SPA (poucos <tr> → provavelmente JS-rendered)
      const trCount = (html.match(/<tr/gi) || []).length;
      if (trCount < 2) {
        lastError = 'Página carregada via JavaScript (sem dados estáticos)';
        continue;
      }

      const vessels = parseHtmlTable(html, config.name, vesselFilter);
      return {
        vessels,
        error: vessels.length === 0 ? 'Nenhum navio encontrado na tabela' : undefined,
        terminal: config.name,
        fetchedAt,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Erro desconhecido';
    }
  }

  return { vessels: [], error: lastError || 'Terminal indisponível', terminal: config.name, fetchedAt };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    let body: { terminal?: string; vessel?: string } = {};
    try { body = await req.json(); } catch { /* empty body OK */ }

    const { terminal = 'all', vessel } = body;
    const fetchedAt = new Date().toISOString();

    if (terminal === 'all') {
      const [eco, btp, sb] = await Promise.allSettled([
        fetchTerminal('ecoporto', vessel),
        fetchTerminal('btp', vessel),
        fetchTerminal('santosbrasil', vessel),
      ]);

      const allVessels: TerminalVessel[] = [];
      const errors: string[] = [];

      for (const result of [eco, btp, sb]) {
        if (result.status === 'fulfilled') {
          allVessels.push(...result.value.vessels);
          if (result.value.error) errors.push(`${result.value.terminal}: ${result.value.error}`);
        } else {
          errors.push(String(result.reason));
        }
      }

      return new Response(
        JSON.stringify({ vessels: allVessels, error: errors.length ? errors.join(' | ') : undefined, terminal: 'all', fetchedAt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await fetchTerminal(terminal, vessel);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ vessels: [], error: err instanceof Error ? err.message : 'Erro interno', terminal: 'unknown', fetchedAt: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
