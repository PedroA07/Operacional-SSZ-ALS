export const config = { runtime: 'edge' };

const BASE_URL = 'http://www.embraportonline.com.br/Navios/Escala';

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
  'Referer': 'http://www.embraportonline.com.br/',
  'Cache-Control': 'no-cache',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function extractHiddenField(html: string, fieldName: string): string {
  const re1 = new RegExp(`<input[^>]+name="${fieldName}"[^>]+value="([^"]*)"`, 'i');
  const re2 = new RegExp(`<input[^>]+value="([^"]*)"[^>]+name="${fieldName}"`, 'i');
  const m = html.match(re1) || html.match(re2);
  return m ? decodeURIComponent(m[1].replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))) : '';
}

// ── Parse one page of the table ───────────────────────────────────────────────

function parseTable(html: string): any[] {
  const rows: any[] = [];

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

    // Column order (from Embraport site):
    // 0:Navio 1:Viagem 2:Visita 3:Armador 4:Serviço 5:Berço
    // 6:Chegada / Prev.Abertura Gate 7:Abertura Gate 8:Deadline
    // 9:Prev.Chegada 10:Prev.Atracação 11:Prev.Saída 12:Detalhes
    rows.push({
      terminal:      'EMBRAPORT',
      navio:         navio.toUpperCase(),
      situacao:      'Previsto',      // updated below via mapping in frontend
      viagem:        cells[1]  || '',
      rap:           cells[2]  || '',  // Visita/RAP code
      armador:       cells[3]  || '',
      servico:       cells[4]  || '',
      berco:         cells[5]  || '',
      gateDry:       cells[6]  || '',  // Chegada / Prev. Abertura Gate
      gateReefer:    cells[7]  || '',  // Abertura Gate (real)
      deadLineStr:   cells[8]  || '',
      dtPrevChegada: cells[9]  || '',
      dtPrevAtrac:   cells[10] || '',
      dtPrevSaida:   cells[11] || '',
      fetchedAt:     new Date().toISOString(),
    });
  }

  return rows;
}

// ── Fetch all pages via ASP.NET WebForms pagination ───────────────────────────

async function fetchAllPages(): Promise<{ rows: any[]; pages: number; error?: string }> {
  const allRows: any[] = [];
  let pagesCount = 0;

  try {
    // ── Page 1: GET ──────────────────────────────────────────────────────────
    const res1 = await fetch(BASE_URL, {
      method: 'GET',
      headers: HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });

    if (!res1.ok) {
      return { rows: [], pages: 0, error: `HTTP ${res1.status} ao buscar primeira página` };
    }

    let currentHtml = await res1.text();
    const firstPageRows = parseTable(currentHtml);
    allRows.push(...firstPageRows);
    pagesCount++;

    if (firstPageRows.length === 0) {
      // Possibly empty / blocked — return what we have
      return { rows: allRows, pages: pagesCount, error: 'Nenhum navio encontrado na primeira página' };
    }

    // ── Paginate: POST with ASP.NET __doPostBack ─────────────────────────────
    const MAX_PAGES = 60; // safety cap (60 × 10 = 600 ships max)
    let pageNum = 2;

    while (pageNum <= MAX_PAGES) {
      // Stop if there's no link to this page in the pagination strip
      if (!currentHtml.includes(`Page$${pageNum}`)) break;

      // Extract ASP.NET hidden fields from the CURRENT page response
      const viewState     = extractHiddenField(currentHtml, '__VIEWSTATE');
      const viewStateGen  = extractHiddenField(currentHtml, '__VIEWSTATEGENERATOR');
      const eventVal      = extractHiddenField(currentHtml, '__EVENTVALIDATION');

      if (!viewState) break; // page has no form state — stop

      // Find the grid control that handles pagination
      // Pattern: javascript:__doPostBack('ctl00$...','Page$N')
      const evtMatch = currentHtml.match(/javascript:__doPostBack\('([^']+)','Page\$\d+'\)/);
      if (!evtMatch) break;
      const eventTarget = evtMatch[1];

      // Build form body
      const formBody = new URLSearchParams();
      formBody.append('__EVENTTARGET',        eventTarget);
      formBody.append('__EVENTARGUMENT',      `Page$${pageNum}`);
      formBody.append('__VIEWSTATE',          viewState);
      if (viewStateGen) formBody.append('__VIEWSTATEGENERATOR', viewStateGen);
      if (eventVal)     formBody.append('__EVENTVALIDATION',    eventVal);

      const resN = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          ...HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'http://www.embraportonline.com.br',
        },
        body: formBody.toString(),
        redirect: 'follow',
        signal: AbortSignal.timeout(25000),
      });

      if (!resN.ok) break;

      currentHtml = await resN.text();
      const pageRows = parseTable(currentHtml);

      if (pageRows.length === 0) break; // empty page — we're done

      allRows.push(...pageRows);
      pagesCount++;
      pageNum++;
    }

    // Deduplicate by navio name (same ship may appear in multiple status tabs)
    const seen = new Set<string>();
    const unique = allRows.filter(r => {
      if (seen.has(r.navio)) return false;
      seen.add(r.navio);
      return true;
    });

    return { rows: unique, pages: pagesCount };
  } catch (e: any) {
    return { rows: allRows, pages: pagesCount, error: e?.message ?? String(e) };
  }
}

// ── Persist to Supabase ───────────────────────────────────────────────────────

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
      viagem:          r.viagem        || null,
      rap:             r.rap           || null,
      armador:         r.armador       || null,
      servico:         r.servico       || null,
      berco:           r.berco         || null,
      gate_dry:        r.gateDry       || null,
      gate_reefer:     r.gateReefer    || null,
      dead_line_str:   r.deadLineStr   || null,
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

// ── Edge handler ──────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST' },
    });
  }

  const supabaseUrl = (globalThis as any).VITE_SUPABASE_URL  ?? '';
  const supabaseKey = (globalThis as any).VITE_SUPABASE_ANON_KEY ?? '';

  const { rows: allRows, pages: pagesCount, error: fetchError } = await fetchAllPages();

  // Hard failure — nothing fetched and there was an error
  if (fetchError && allRows.length === 0) {
    return new Response(JSON.stringify({
      ok: false,
      error: fetchError,
      hint: 'O servidor da EMBRAPORT pode estar bloqueando requisições externas. Tente executar a partir de uma rede brasileira.',
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Save to Supabase if credentials available
  let saveResult: { saved: number; error?: string } = { saved: 0 };
  if (supabaseUrl && supabaseKey && allRows.length > 0) {
    saveResult = await saveToSupabase(allRows, supabaseUrl, supabaseKey);
  }

  return new Response(JSON.stringify({
    ok: true,
    total: allRows.length,
    pages: pagesCount,
    saved: saveResult.saved,
    vessels: allRows,
    errors:    fetchError  ? [fetchError]         : undefined,
    saveError: saveResult.error,
    fetchedAt: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
