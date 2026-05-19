export const config = { runtime: 'edge' };

const BASE_URL = 'http://www.embraportonline.com.br/Navios/Escala';

// Tabs to fetch → situacao label
const TABS = [
  { url: `${BASE_URL}?situacao=Previsto`,     situacao: 'Previsto'    },
  { url: `${BASE_URL}?situacao=EmOperacao`,   situacao: 'Em Operação' },
  { url: `${BASE_URL}?situacao=Desatracado`,  situacao: 'Desatracado' },
  { url: BASE_URL,                            situacao: 'Previsto'    }, // fallback
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
  'Referer': 'http://www.embraportonline.com.br/',
  'Cache-Control': 'no-cache',
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').trim();
}

function parseCells(row: string): string[] {
  const cells: string[] = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = re.exec(row)) !== null) cells.push(stripHtml(m[1]));
  return cells;
}

// Detects active tab name from the HTML to infer situacao
function detectActiveSituacao(html: string): string {
  // Look for active/selected button class
  const activeMatch = html.match(/class="[^"]*(?:active|selected|btn-primary)[^"]*"[^>]*>\s*(Previstos|Em Opera[çc][aã]o|Desatracados|Omitidos|Todos)/i);
  if (activeMatch) {
    const tab = activeMatch[1].toLowerCase();
    if (tab.includes('opera')) return 'Em Operação';
    if (tab.includes('desatrac')) return 'Desatracado';
    return 'Previsto';
  }
  return 'Previsto';
}

function parseTable(html: string, defaultSituacao: string): any[] {
  const rows: any[] = [];
  const situacao = detectActiveSituacao(html) || defaultSituacao;

  // Find the main data table
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return rows;

  const tbody = tbodyMatch[1];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRe.exec(tbody)) !== null) {
    const cells = parseCells(rowMatch[1]);
    if (cells.length < 10) continue;

    const navio = cells[0]?.trim();
    if (!navio || navio.toLowerCase() === 'navio') continue;

    // Column order (from screenshot):
    // 0:Navio 1:Viagem 2:Visita 3:Armador 4:Serviço 5:Berço
    // 6:Prev.Abertura Gate 7:Abertura Gate 8:Deadline 9:Prev.Chegada
    // 10:Prev.Atracação 11:Prev.Saída 12:Detalhes
    rows.push({
      terminal:       'EMBRAPORT',
      navio:          navio.toUpperCase(),
      situacao,
      viagem:         cells[1]  || '',
      rap:            cells[2]  || '', // Visita code
      armador:        cells[3]  || '',
      servico:        cells[4]  || '',
      berco:          cells[5]  || '',
      gateDry:        cells[6]  || '', // Prev. Abertura Gate
      gateReefer:     cells[7]  || '', // Abertura Gate (real)
      deadLineStr:    cells[8]  || '',
      dtPrevChegada:  cells[9]  || '',
      dtPrevAtrac:    cells[10] || '',
      dtPrevSaida:    cells[11] || '',
      fetchedAt:      new Date().toISOString(),
    });
  }

  return rows;
}

async function fetchTab(url: string, situacao: string): Promise<{ rows: any[]; error?: string }> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return { rows: [], error: `HTTP ${res.status} de ${url}` };
    const html = await res.text();
    return { rows: parseTable(html, situacao) };
  } catch (e: any) {
    return { rows: [], error: e?.message ?? String(e) };
  }
}

async function saveToSupabase(rows: any[], supabaseUrl: string, supabaseKey: string): Promise<{ saved: number; error?: string }> {
  if (rows.length === 0) return { saved: 0 };

  try {
    // Delete old EMBRAPORT rows first
    await fetch(`${supabaseUrl}/rest/v1/terminal_vessels?terminal=eq.EMBRAPORT`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Insert new rows
    const snakeRows = rows.map(r => ({
      terminal:        r.terminal,
      navio:           r.navio,
      situacao:        r.situacao,
      viagem:          r.viagem     || null,
      rap:             r.rap        || null,
      armador:         r.armador    || null,
      servico:         r.servico    || null,
      berco:           r.berco      || null,
      gate_dry:        r.gateDry    || null,
      gate_reefer:     r.gateReefer || null,
      dead_line_str:   r.deadLineStr|| null,
      dt_prev_chegada: r.dtPrevChegada || null,
      dt_prev_atrac:   r.dtPrevAtrac   || null,
      dt_prev_saida:   r.dtPrevSaida   || null,
      fetched_at:      r.fetchedAt,
    }));

    const insertRes = await fetch(`${supabaseUrl}/rest/v1/terminal_vessels`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(snakeRows),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      return { saved: 0, error: err };
    }

    return { saved: rows.length };
  } catch (e: any) {
    return { saved: 0, error: e?.message ?? String(e) };
  }
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST' } });
  }

  const supabaseUrl = (globalThis as any).VITE_SUPABASE_URL ?? '';
  const supabaseKey = (globalThis as any).VITE_SUPABASE_ANON_KEY ?? '';

  // Try the default page first (most reliable)
  const defaultResult = await fetchTab(BASE_URL, 'Previsto');

  // If the first fetch failed, return error immediately
  if (defaultResult.error && defaultResult.rows.length === 0) {
    return new Response(JSON.stringify({
      ok: false,
      error: defaultResult.error,
      hint: 'O servidor da EMBRAPORT pode estar bloqueando requisições externas. Tente executar a partir de uma rede brasileira.',
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Try additional tabs if first succeeded
  const allRows: any[] = [...defaultResult.rows];
  const errors: string[] = [];

  for (const tab of TABS.slice(0, 3)) {
    if (tab.url === BASE_URL) continue; // already fetched
    const result = await fetchTab(tab.url, tab.situacao);
    // Only add rows that aren't already in allRows (by navio name)
    const existing = new Set(allRows.map(r => r.navio));
    for (const row of result.rows) {
      if (!existing.has(row.navio)) {
        allRows.push(row);
        existing.add(row.navio);
      }
    }
    if (result.error) errors.push(result.error);
  }

  // Save to Supabase if credentials available
  let saveResult: { saved: number; error?: string } = { saved: 0 };
  if (supabaseUrl && supabaseKey) {
    saveResult = await saveToSupabase(allRows, supabaseUrl, supabaseKey);
  }

  return new Response(JSON.stringify({
    ok: true,
    total: allRows.length,
    saved: saveResult.saved,
    vessels: allRows,
    errors: errors.length > 0 ? errors : undefined,
    saveError: saveResult.error,
    fetchedAt: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
