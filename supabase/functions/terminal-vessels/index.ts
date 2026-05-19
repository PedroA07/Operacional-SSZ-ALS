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
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let match;
  while ((match = thRegex.exec(row)) !== null) {
    cells.push(stripTags(match[1]).toLowerCase());
  }
  if (cells.length === 0) {
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

function parseHtmlTable(html: string, terminalName: string, vesselFilter?: string): TerminalVessel[] {
  const vessels: TerminalVessel[] = [];

  // Extract all rows
  const rows: string[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    rows.push(match[0]);
  }

  if (rows.length === 0) return vessels;

  // Find header row
  let headers: string[] = [];
  let dataStartIndex = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const h = extractHeaderCells(rows[i]);
    if (h.length > 0) {
      headers = h;
      dataStartIndex = i + 1;
      break;
    }
  }

  // If no proper headers found, try to infer from first data row
  if (headers.length === 0 && rows.length > 0) {
    const firstCells = extractCells(rows[0]);
    if (firstCells.length > 0) {
      // use positional guessing: col 0 = navio, col 1 = situacao, etc.
      headers = firstCells.map((_, idx) => `col${idx}`);
      dataStartIndex = 1;
    }
  }

  const navioIdx = findColIndex(headers, ['navio', 'vessel', 'ship', 'embarcação', 'embarcacao']);
  const situacaoIdx = findColIndex(headers, ['situaç', 'situac', 'status', 'estado', 'operaç', 'operac']);
  const previsaoIdx = findColIndex(headers, ['previsão', 'previsao', 'eta', 'data', 'chegada', 'prevista']);
  const bercoIdx = findColIndex(headers, ['berço', 'berco', 'dock', 'píer', 'pier', 'atracação', 'atracacao']);
  const armadorIdx = findColIndex(headers, ['armador', 'shipping', 'companhia', 'linha', 'agencia', 'agência']);
  const viagemIdx = findColIndex(headers, ['viagem', 'voyage', 'trip', 'navio/viagem']);

  for (let i = dataStartIndex; i < rows.length; i++) {
    const cells = extractCells(rows[i]);
    if (cells.length === 0) continue;

    // Skip rows that are all empty
    const hasContent = cells.some(c => c.trim().length > 0);
    if (!hasContent) continue;

    const navio = navioIdx >= 0 && navioIdx < cells.length ? cells[navioIdx] : (cells[0] || '');
    if (!navio || navio.length === 0) continue;

    // Apply vessel filter if provided
    if (vesselFilter && !navio.toLowerCase().includes(vesselFilter.toLowerCase())) continue;

    const situacao = situacaoIdx >= 0 && situacaoIdx < cells.length ? cells[situacaoIdx] : (cells[1] || '');
    const previsao = previsaoIdx >= 0 && previsaoIdx < cells.length ? cells[previsaoIdx] : undefined;
    const berco = bercoIdx >= 0 && bercoIdx < cells.length ? cells[bercoIdx] : undefined;
    const armador = armadorIdx >= 0 && armadorIdx < cells.length ? cells[armadorIdx] : undefined;
    const viagem = viagemIdx >= 0 && viagemIdx < cells.length ? cells[viagemIdx] : undefined;

    vessels.push({
      navio: navio.trim(),
      situacao: situacao.trim() || 'Desconhecido',
      previsao: previsao?.trim() || undefined,
      berco: berco?.trim() || undefined,
      armador: armador?.trim() || undefined,
      viagem: viagem?.trim() || undefined,
      terminal: terminalName,
    });
  }

  return vessels;
}

const TERMINAL_CONFIG: Record<string, { url: string; name: string }> = {
  ecoporto: {
    url: 'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
    name: 'ECOPORTO',
  },
  btp: {
    url: 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
    name: 'BTP',
  },
  santosbrasil: {
    url: 'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp',
    name: 'SANTOS BRASIL',
  },
};

async function fetchTerminal(
  terminalKey: string,
  vesselFilter?: string
): Promise<{ vessels: TerminalVessel[]; error?: string; terminal: string; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const config = TERMINAL_CONFIG[terminalKey];

  if (!config) {
    return { vessels: [], error: 'Terminal desconhecido', terminal: terminalKey, fetchedAt };
  }

  try {
    const response = await fetch(config.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return { vessels: [], error: `Terminal indisponível (HTTP ${response.status})`, terminal: config.name, fetchedAt };
    }

    const html = await response.text();
    const vessels = parseHtmlTable(html, config.name, vesselFilter);
    return { vessels, terminal: config.name, fetchedAt };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return { vessels: [], error: `Terminal indisponível: ${message}`, terminal: config.name, fetchedAt };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: { terminal?: string; vessel?: string } = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    const { terminal = 'all', vessel } = body;
    const fetchedAt = new Date().toISOString();

    if (terminal === 'all') {
      const results = await Promise.allSettled([
        fetchTerminal('ecoporto', vessel),
        fetchTerminal('btp', vessel),
        fetchTerminal('santosbrasil', vessel),
      ]);

      const allVessels: TerminalVessel[] = [];
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          allVessels.push(...result.value.vessels);
          if (result.value.error) errors.push(`${result.value.terminal}: ${result.value.error}`);
        } else {
          errors.push(String(result.reason));
        }
      }

      return new Response(
        JSON.stringify({
          vessels: allVessels,
          error: errors.length > 0 ? errors.join('; ') : undefined,
          terminal: 'all',
          fetchedAt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await fetchTerminal(terminal, vessel);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return new Response(
      JSON.stringify({ vessels: [], error: message, terminal: 'unknown', fetchedAt: new Date().toISOString() }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
