export const config = { runtime: 'edge' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function extractCells(row: string): string[] {
  const cells: string[] = [];
  const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let m;
  while ((m = re.exec(row)) !== null) cells.push(stripHtml(m[1]));
  return cells;
}

function extractHeaderCells(row: string): string[] {
  const cells: string[] = [];
  const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  let m;
  while ((m = thRe.exec(row)) !== null) cells.push(stripHtml(m[1]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  if (cells.length === 0) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    while ((m = tdRe.exec(row)) !== null) cells.push(stripHtml(m[1]).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''));
  }
  return cells;
}

function findCol(headers: string[], keywords: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    if (keywords.some(k => headers[i].includes(k))) return i;
  }
  return -1;
}

function looksLikeVessel(s: string): boolean {
  if (!s || s.length < 3) return false;
  if (/^\d+$/.test(s)) return false;
  if (/^\d{2}\/\d{2}/.test(s)) return false;
  return /[A-Z]{2,}/.test(s);
}

function parseDateStr(s: string): Date | null {
  if (!s) return null;
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, mo, y] = s.split(' ')[0].split('/');
    const time = s.split(' ')[1]?.slice(0, 5) ?? '00:00';
    const dt = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${time}:00`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

function deriveSituacao(gateDry?: string, gateReefer?: string, deadline?: string): string {
  const gateStr = gateDry || gateReefer;
  const now = new Date();
  if (gateStr || deadline) {
    const gateDt  = gateStr  ? parseDateStr(gateStr)  : null;
    const deadDt  = deadline ? parseDateStr(deadline) : null;
    if (gateDt && gateDt > now)  return 'Gate Fechado';
    if (deadDt && deadDt > now)  return 'Gate Aberto';
    if ((gateDt && gateDt <= now) || (deadDt && deadDt <= now)) return 'Gate Encerrado';
  }
  return 'SEM PREVISÃO';
}

interface ParsedVessel {
  terminal: string;
  navio: string;
  situacao: string;
  previsao?: string;
  berco?: string;
  armador?: string;
  viagem?: string;
  gateDry?: string;
  gateReefer?: string;
  deadLineStr?: string;
}

function parseTable(html: string, terminalName: string): ParsedVessel[] {
  const vessels: ParsedVessel[] = [];
  const rows: string[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) rows.push(m[0]);
  if (rows.length === 0) return vessels;

  let headers: string[] = [];
  let dataStart = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const h = extractHeaderCells(rows[i]);
    if (h.length >= 3) { headers = h; dataStart = i + 1; break; }
  }

  const navioIdx    = findCol(headers, ['navio', 'vessel', 'ship', 'nome']);
  const situacaoIdx = findCol(headers, ['situa', 'status', 'estado', 'opera', 'condi']);
  const bercoIdx    = findCol(headers, ['berco', 'berço', 'brc', 'dock', 'pier', 'cais']);
  const armadorIdx  = findCol(headers, ['armador', 'shipping', 'agenc', 'agent', 'companhia']);
  const viagemIdx   = findCol(headers, ['viagem', 'voyage']);
  const previsaoIdx = findCol(headers, ['prev. atrac', 'previsao de atrac', 'dt. prev. atrac', 'previsao chegada', 'prev chegada']);
  // BTP: "ABERTURA DE GATE DRY" | Santos Brasil: "LIBERACAO DO DRY"
  const gateDryIdx    = findCol(headers, ['abertura de gate dry', 'abertura gate dry', 'gate dry', 'liberacao do dry', 'liberação do dry', 'liberacoes dry']);
  const gateReeferIdx = findCol(headers, ['abertura de gate reefer', 'abertura gate reefer', 'gate reefer', 'liberacao do reefer', 'liberação do reefer']);
  const deadLineIdx   = findCol(headers, ['dead-line', 'dead line', 'deadline', 'prazo']);

  for (let i = dataStart; i < rows.length; i++) {
    const cells = extractCells(rows[i]);
    if (cells.length < 2) continue;

    let navio = navioIdx >= 0 && navioIdx < cells.length
      ? cells[navioIdx]
      : (cells.find(looksLikeVessel) ?? '');
    navio = navio.trim();
    if (!navio || navio.length < 2) continue;

    const situacao = situacaoIdx >= 0 && situacaoIdx < cells.length ? cells[situacaoIdx] : '';
    const gateDry    = (gateDryIdx    >= 0 ? cells[gateDryIdx]    : undefined)?.trim() || undefined;
    const gateReefer = (gateReeferIdx >= 0 ? cells[gateReeferIdx] : undefined)?.trim() || undefined;
    const deadLine   = (deadLineIdx   >= 0 ? cells[deadLineIdx]   : undefined)?.trim() || undefined;

    const finalSituacao = situacao.trim() || deriveSituacao(gateDry, gateReefer, deadLine);

    vessels.push({
      terminal:    terminalName,
      navio,
      situacao:    finalSituacao,
      previsao:    (previsaoIdx >= 0 ? cells[previsaoIdx] : undefined)?.trim() || undefined,
      berco:       (bercoIdx    >= 0 ? cells[bercoIdx]    : undefined)?.trim() || undefined,
      armador:     (armadorIdx  >= 0 ? cells[armadorIdx]  : undefined)?.trim() || undefined,
      viagem:      (viagemIdx   >= 0 ? cells[viagemIdx]   : undefined)?.trim() || undefined,
      gateDry,
      gateReefer,
      deadLineStr: deadLine,
    });
  }
  return vessels;
}

// ─── Fetchers por terminal ────────────────────────────────────────────────────
const HEADERS = (referer: string): Record<string, string> => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
  'Referer': referer,
  'Cache-Control': 'no-cache',
});

async function fetchHtml(url: string, options?: RequestInit): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'follow', ...options });
    if (!res.ok) return null;
    const html = await res.text();
    if ((html.match(/<tr/gi) || []).length < 3) return null;
    return html;
  } catch { return null; }
}

async function scrapeBTP(): Promise<{ vessels: ParsedVessel[]; error?: string }> {
  const referer = 'https://novo-tas.btp.com.br/';
  // O botão "Pesquisar" sem filtros faz POST para a action de dados
  const html = await fetchHtml('https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacao', {
    method: 'POST',
    headers: { ...HEADERS(referer), 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
    body: '',
  }) ?? await fetchHtml('https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex', { headers: HEADERS(referer) });

  if (!html) return { vessels: [], error: 'BTP: página JS-renderizada, sem acesso ao endpoint de dados' };
  const vessels = parseTable(html, 'BTP');
  return vessels.length > 0 ? { vessels } : { vessels: [], error: 'BTP: tabela encontrada mas sem navios' };
}

async function scrapeEcoporto(): Promise<{ vessels: ParsedVessel[]; error?: string }> {
  const referer = 'http://op.ecoportosantos.com.br/';
  const urls = [
    'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
    'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao',
    'https://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  ];
  for (const url of urls) {
    const html = await fetchHtml(url, { headers: HEADERS(referer) });
    if (!html) continue;
    const vessels = parseTable(html, 'ECOPORTO');
    if (vessels.length > 0) return { vessels };
  }
  return { vessels: [], error: 'ECOPORTO: HTTP 403 — servidor bloqueia o acesso' };
}

async function scrapeSantosBrasil(): Promise<{ vessels: ParsedVessel[]; error?: string }> {
  const referer = 'https://www.santosbrasil.com.br/';
  const urls = [
    'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp?unidade=tecon-santos',
    'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp',
    'https://www.santosbrasil.com.br/v2021/lista-de-atracacao?titulo=&unidade=tecon-santos&lista=recebimento-de-exportacao',
  ];
  for (const url of urls) {
    const html = await fetchHtml(url, { headers: HEADERS(referer) });
    if (!html) continue;
    if (html.includes('recaptcha') && (html.match(/<tr/gi) || []).length < 10) continue;
    const vessels = parseTable(html, 'SANTOS BRASIL');
    if (vessels.length > 0) return { vessels };
  }
  return { vessels: [], error: 'Santos Brasil: reCAPTCHA ou endpoint indisponível' };
}

// ─── Salvar no Supabase ───────────────────────────────────────────────────────
async function saveToSupabase(
  vessels: ParsedVessel[],
  supabaseUrl: string,
  supabaseKey: string,
  fetchedAt: string,
): Promise<{ saved: number; error?: string }> {
  if (!vessels.length) return { saved: 0 };

  const terminals = [...new Set(vessels.map(v => v.terminal))];
  // Apaga registros antigos dos terminais obtidos
  for (const t of terminals) {
    await fetch(`${supabaseUrl}/rest/v1/terminal_vessels?terminal=eq.${encodeURIComponent(t)}`, {
      method: 'DELETE',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
    });
  }

  const rows = vessels.map(v => ({
    terminal:      v.terminal,
    navio:         v.navio,
    situacao:      v.situacao,
    previsao:      v.previsao      || null,
    berco:         v.berco         || null,
    armador:       v.armador       || null,
    viagem:        v.viagem        || null,
    gate_dry:      v.gateDry       || null,
    gate_reefer:   v.gateReefer    || null,
    dead_line_str: v.deadLineStr   || null,
    fetched_at:    fetchedAt,
  }));

  const res = await fetch(`${supabaseUrl}/rest/v1/terminal_vessels`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json', Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) return { saved: 0, error: await res.text() };
  return { saved: rows.length };
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST' } });
  }

  const supabaseUrl = (globalThis as any).VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) || '';
  const supabaseKey = (globalThis as any).VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) || '';
  const fetchedAt = new Date().toISOString();

  const [btpRes, ecoRes, sbRes] = await Promise.allSettled([
    scrapeBTP(),
    scrapeEcoporto(),
    scrapeSantosBrasil(),
  ]);

  const allVessels: ParsedVessel[] = [];
  const errors: string[] = [];

  for (const r of [btpRes, ecoRes, sbRes]) {
    if (r.status === 'fulfilled') {
      allVessels.push(...r.value.vessels);
      if (r.value.error) errors.push(r.value.error);
    } else {
      errors.push(String(r.reason));
    }
  }

  let saveResult: { saved: number; error?: string } = { saved: 0 };
  if (supabaseUrl && supabaseKey) {
    saveResult = await saveToSupabase(allVessels, supabaseUrl, supabaseKey, fetchedAt);
  }

  return new Response(JSON.stringify({
    ok: true,
    total: allVessels.length,
    saved: saveResult.saved,
    vessels: allVessels,
    errors: errors.length ? errors : undefined,
    saveError: saveResult.error,
    fetchedAt,
  }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
