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

// ── Find the "Todos" tab __doPostBack EventTarget ─────────────────────────────
// The Embraport page has tabs: Previstos | Em Operação | Desatracados | Detidos | Todos
// Default tab is "Previstos" which may be empty. We need to navigate to "Todos".
// ASP.NET WebForms tabs use __doPostBack('EventTarget','') anchors.

function findTodosTarget(html: string): { target: string; arg: string } | null {
  // Scan every __doPostBack href/onclick and check if "Todos" appears right after it (within 250 chars)
  const re = /(?:href|onclick)="javascript:__doPostBack\('([^']+)','([^']*)'\)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const after = html.slice(m.index, m.index + m[0].length + 250);
    if (/>\s*Todos\s*</i.test(after)) return { target: m[1], arg: m[2] };
  }
  // Reverse scan: "Todos" link text first, then __doPostBack within 250 chars before it
  const re2 = />\s*Todos\s*</gi;
  let m2;
  while ((m2 = re2.exec(html)) !== null) {
    const before = html.slice(Math.max(0, m2.index - 250), m2.index + m2[0].length);
    const pbMatch = before.match(/javascript:__doPostBack\('([^']+)','([^']*)'\)[^>]*$/i);
    if (pbMatch) return { target: pbMatch[1], arg: pbMatch[2] };
  }
  return null;
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

    // Column order (confirmed from site screenshot):
    // 0:Navio 1:Viagem 2:Visita 3:Armador 4:Serviço 5:Berço
    // 6:Chegada 7:Prev.Abertura Gate 8:Abertura Gate 9:Deadline(Armador)
    // 10:Prev.Chegada 11:Prev.Atracação 12:Prev.Saída 13:Detalhes
    rows.push({
      terminal:      'EMBRAPORT',
      navio:         navio.toUpperCase(),
      situacao:      'Previsto',
      viagem:        cells[1]  || '',
      rap:           cells[2]  || '',
      armador:       cells[3]  || '',
      servico:       cells[4]  || '',
      berco:         cells[5]  || '',
      dtChegada:     cells[6]  || '',  // Chegada real
      gateDry:       cells[8]  || '',  // Abertura Gate (real)
      deadLineStr:   cells[9]  || '',  // Deadline (Armador)
      dtPrevChegada: cells[10] || '',
      dtPrevAtrac:   cells[11] || '',
      dtPrevSaida:   cells[12] || '',
      fetchedAt:     new Date().toISOString(),
    });
  }

  return rows;
}

// ── POST helper ───────────────────────────────────────────────────────────────

async function postForm(html: string, eventTarget: string, eventArg: string): Promise<string | null> {
  const viewState    = extractHiddenField(html, '__VIEWSTATE');
  const viewStateGen = extractHiddenField(html, '__VIEWSTATEGENERATOR');
  const eventVal     = extractHiddenField(html, '__EVENTVALIDATION');

  if (!viewState) return null;

  const body = new URLSearchParams();
  body.append('__EVENTTARGET',   eventTarget);
  body.append('__EVENTARGUMENT', eventArg);
  body.append('__VIEWSTATE',     viewState);
  if (viewStateGen) body.append('__VIEWSTATEGENERATOR', viewStateGen);
  if (eventVal)     body.append('__EVENTVALIDATION',    eventVal);

  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'http://www.embraportonline.com.br',
      },
      body: body.toString(),
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ── Fetch all pages (GET → navigate to Todos → paginate) ─────────────────────

async function fetchAllPages(): Promise<{ rows: any[]; pages: number; error?: string }> {
  const allRows: any[] = [];
  let pagesCount = 0;

  try {
    // ── Step 1: GET initial page ─────────────────────────────────────────────
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

    // ── Step 2: Navigate to "Todos" tab ──────────────────────────────────────
    // The default tab "Previstos" may be empty if all ships already arrived.
    // Find the "Todos" tab's __doPostBack EventTarget and POST to switch to it.
    const todosInfo = findTodosTarget(currentHtml);
    if (todosInfo) {
      const todosHtml = await postForm(currentHtml, todosInfo.target, todosInfo.arg);
      if (todosHtml && todosHtml.length > 500) {
        currentHtml = todosHtml;
      }
    }

    // ── Step 3: Parse first page ─────────────────────────────────────────────
    const firstPageRows = parseTable(currentHtml);
    allRows.push(...firstPageRows);
    pagesCount++;

    if (firstPageRows.length === 0) {
      return { rows: allRows, pages: pagesCount, error: 'Nenhum navio encontrado na primeira página' };
    }

    // ── Step 4: Paginate via ASP.NET __doPostBack ────────────────────────────
    const MAX_PAGES = 60;
    let pageNum = 2;

    while (pageNum <= MAX_PAGES) {
      if (!currentHtml.includes(`Page$${pageNum}`)) break;

      const evtMatch = currentHtml.match(/javascript:__doPostBack\('([^']+)','Page\$\d+'\)/);
      if (!evtMatch) break;
      const eventTarget = evtMatch[1];

      const nextHtml = await postForm(currentHtml, eventTarget, `Page$${pageNum}`);
      if (!nextHtml) break;

      currentHtml = nextHtml;
      const pageRows = parseTable(currentHtml);
      if (pageRows.length === 0) break;

      allRows.push(...pageRows);
      pagesCount++;
      pageNum++;
    }

    // Deduplicate by navio+viagem
    const seen = new Set<string>();
    const unique = allRows.filter(r => {
      const key = `${r.navio}|${r.viagem}`;
      if (seen.has(key)) return false;
      seen.add(key);
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
    await fetch(`${supabaseUrl}/rest/v1/terminal_vessels?terminal=eq.EMBRAPORT`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

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
      dt_chegada:      r.dtChegada     || null,
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

  if (fetchError && allRows.length === 0) {
    return new Response(JSON.stringify({
      ok: false,
      error: fetchError,
      hint: 'Embraport pode estar bloqueando requisições ou a aba "Todos" não foi encontrada.',
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

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
    errors:    fetchError   ? [fetchError]        : undefined,
    saveError: saveResult.error,
    fetchedAt: new Date().toISOString(),
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
