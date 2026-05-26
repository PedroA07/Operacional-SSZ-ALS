export const config = { runtime: 'edge' };

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vessel {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseDateStr(s: string): Date | null {
  if (!s) return null;
  // "dd/mm/yyyy hh:mm" format
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    const [d, mo, y] = s.split(' ')[0].split('/');
    const time = s.split(' ')[1]?.slice(0, 5) ?? '00:00';
    const dt = new Date(`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}T${time}:00`);
    return isNaN(dt.getTime()) ? null : dt;
  }
  // "yyyy-mm-ddThh:mm" format
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function deriveSituacao(gateDry?: string, gateReefer?: string, deadline?: string): string {
  const gateStr = gateDry || gateReefer;
  const now = new Date();
  if (gateStr || deadline) {
    const gateDt = gateStr  ? parseDateStr(gateStr)  : null;
    const deadDt = deadline ? parseDateStr(deadline) : null;
    if (gateDt && gateDt > now)  return 'Gate Fechado';
    if (deadDt && deadDt > now)  return 'Gate Aberto';
    if ((gateDt && gateDt <= now) || (deadDt && deadDt <= now)) return 'Gate Encerrado';
  }
  return 'SEM PREVISÃO';
}

function str(v: unknown): string {
  if (!v) return '';
  return String(v).trim();
}

// Pega primeiro campo não-vazio de uma lista de keys num objeto
function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = str(obj[k]);
    if (v && v !== '-' && v !== '--') return v;
  }
  return '';
}

// ─── BTP ─────────────────────────────────────────────────────────────────────
// O browser faz: GET ListaAtracacaoIndex (pega session cookie + CSRF token) →
//                POST ListaAtracacao com __RequestVerificationToken no body
async function scrapeBTP(): Promise<{ vessels: Vessel[]; error?: string }> {
  const base    = 'https://novo-tas.btp.com.br/ConsultasLivres/';
  const referer = 'https://novo-tas.btp.com.br/';
  const ua      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  // 1) GET para capturar cookies de sessão, CSRF token e tentar parsear o HTML inicial
  let sessionCookies = '';
  let csrfToken = '';
  let indexHtml = '';
  try {
    const init = await fetch(base + 'ListaAtracacaoIndex', {
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': referer,
      },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    indexHtml = await init.text();

    // Extrai cookies de sessão
    const rawCookie = init.headers.get('set-cookie') ?? '';
    sessionCookies = rawCookie.split(',')
      .map(c => c.trim().split(';')[0])
      .filter(Boolean)
      .join('; ');

    // Extrai token anti-CSRF do HTML (padrão ASP.NET MVC)
    const csrfMatch = indexHtml.match(/<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"/i)
      ?? indexHtml.match(/name="__RequestVerificationToken"\s+[^>]*value="([^"]+)"/i);
    if (csrfMatch) csrfToken = csrfMatch[1];

    // Tenta parsear a tabela da própria página GET (pode já conter os dados)
    const indexTrCount = (indexHtml.match(/<tr/gi) ?? []).length;
    if (indexTrCount >= 3) {
      const vessels = parseBTPHtmlTable(indexHtml);
      if (vessels.length > 0) return { vessels };
    }
  } catch { /* ignora, tenta POST */ }

  // 2) POST com token CSRF e cookies de sessão
  try {
    const headers: Record<string, string> = {
      'User-Agent': ua,
      'Accept': '*/*',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': base + 'ListaAtracacaoIndex',
      'Origin': 'https://novo-tas.btp.com.br',
    };
    if (sessionCookies) headers['Cookie'] = sessionCookies;

    const postBody = csrfToken
      ? `__RequestVerificationToken=${encodeURIComponent(csrfToken)}`
      : '';

    // Tenta dois endpoints: ListaAtracacao (padrão) e GetListaAtracacao (alternativo)
    let res: Response | null = null;
    for (const endpoint of ['ListaAtracacao', 'GetListaAtracacao']) {
      try {
        const r = await fetch(base + endpoint, {
          method: 'POST',
          headers: { ...headers, ...(endpoint === 'GetListaAtracacao' ? { 'Content-Type': 'application/json' } : {}) },
          body: endpoint === 'GetListaAtracacao' ? '{}' : postBody,
          signal: AbortSignal.timeout(20000),
          redirect: 'follow',
        });
        if (r.ok) { res = r; break; }
      } catch { /* tenta próximo */ }
    }
    if (!res) return { vessels: [], error: 'BTP: todos os endpoints POST falharam' };

    const text = await res.text();

    // BTP retorna JSON com formato: { Result, Records (HTML), TotalRecordCount, erro, msg }
    try {
      const json = JSON.parse(text) as Record<string, unknown>;

      // Formato específico do BTP
      if ('Records' in json || 'Result' in json) {
        if (json.erro === true) {
          return { vessels: [], error: `BTP: servidor retornou erro — ${json.msg ?? 'falha inesperada'} (IP bloqueado ou sessão inválida)` };
        }
        const records = String(json.Records ?? '');
        if (records.length > 0) {
          const vessels = parseBTPHtmlTable(records);
          if (vessels.length > 0) return { vessels };
        }
        if ((json.TotalRecordCount as number) === 0) {
          return { vessels: [], error: 'BTP: nenhum navio na programação no momento' };
        }
      }

      // Outros formatos JSON genéricos
      const list = (json.data ?? json.Data ?? json.vessels ?? json.rows ?? json.Items ?? json.items ?? []) as Record<string, unknown>[];
      if (Array.isArray(list) && list.length > 0) {
        return { vessels: list.map(mapBTPRow) };
      }
    } catch { /* não é JSON, tenta HTML direto */ }

    // Fallback: parse HTML direto
    const trCount = (text.match(/<tr/gi) ?? []).length;
    if (trCount >= 3) {
      const vessels = parseBTPHtmlTable(text);
      if (vessels.length > 0) return { vessels };
    }

    const snippet = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    return { vessels: [], error: `BTP: resposta sem dados reconhecíveis. Resp: ${snippet}` };
  } catch (e: any) {
    return { vessels: [], error: `BTP: ${e?.message ?? e}` };
  }
}

function mapBTPRow(r: Record<string, unknown>): Vessel {
  const navio      = pick(r, ['navio', 'Navio', 'NAVIO', 'vessel', 'name']);
  const viagem     = pick(r, ['viagem', 'Viagem', 'VIAGEM', 'voyage']);
  const armador    = pick(r, ['agencia', 'Agencia', 'agência', 'Agência', 'armador']);
  const berco      = pick(r, ['berco', 'Berco', 'berco', 'dock']);
  const gateDry    = pick(r, ['aberturaGateDry', 'AberturaGateDry', 'abert_gate_dry', 'gate_dry', 'gateDry']);
  const gateReefer = pick(r, ['aberturaGateReefer', 'AberturaGateReefer', 'abert_gate_reefer', 'gate_reefer', 'gateReefer']);
  const deadline   = pick(r, ['deadLine', 'DeadLine', 'dead_line', 'DEADLINE']);
  const previsao   = pick(r, ['dtPrevAtrac', 'DtPrevAtrac', 'prevAtracacao', 'dtPrevChegada']);
  return {
    terminal: 'BTP', navio,
    situacao: deriveSituacao(gateDry || undefined, gateReefer || undefined, deadline || undefined),
    previsao: previsao || undefined, berco: berco || undefined,
    armador: armador || undefined, viagem: viagem || undefined,
    gateDry: gateDry || undefined, gateReefer: gateReefer || undefined,
    deadLineStr: deadline || undefined,
  };
}

// Fallback: parse da tabela HTML do BTP (caso o endpoint retorne HTML parcial)
function parseBTPHtmlTable(html: string): Vessel[] {
  function stripTags(s: string) {
    return s.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
  }
  const rows: string[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = rowRe.exec(html)) !== null) rows.push(m[0]);

  let headers: string[] = [];
  let dataStart = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    const ths: string[] = [];
    while ((m = thRe.exec(rows[i])) !== null) ths.push(stripTags(m[1]).toLowerCase());
    if (ths.length >= 5) { headers = ths; dataStart = i + 1; break; }
  }

  const idx = (kws: string[]) => {
    for (let i = 0; i < headers.length; i++)
      if (kws.some(k => headers[i].includes(k))) return i;
    return -1;
  };

  const navIdx  = idx(['navio','vessel']);
  const viajIdx = idx(['viagem','voyage']);
  const agIdx   = idx(['agência','agencia','agent','armador']);
  const berIdx  = idx(['berco','berço','dock','pier']);
  const gdIdx   = idx(['gate dry','abertura de gate dry','abertura gate d']);
  const grIdx   = idx(['gate reefer','abertura de gate reefer','abertura gate r']);
  const dlIdx   = idx(['dead-line','dead line','deadline']);
  const paIdx   = idx(['dt. prev. atrac','prev. atrac','previsao atrac']);

  const vessels: Vessel[] = [];
  for (let i = dataStart; i < rows.length; i++) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    while ((m = tdRe.exec(rows[i])) !== null) cells.push(stripTags(m[1]));
    if (cells.length < 5) continue;
    const g = (idx: number) => idx >= 0 && idx < cells.length ? cells[idx].trim() : '';
    const navio = g(navIdx);
    if (!navio || navio === 'NAVIO') continue;
    const gateDry    = g(gdIdx) || undefined;
    const gateReefer = g(grIdx) || undefined;
    const deadline   = g(dlIdx) || undefined;
    vessels.push({
      terminal: 'BTP', navio,
      situacao: deriveSituacao(gateDry, gateReefer, deadline),
      previsao: g(paIdx) || undefined, berco: g(berIdx) || undefined,
      armador: g(agIdx) || undefined, viagem: g(viajIdx) || undefined,
      gateDry, gateReefer, deadLineStr: deadline,
    });
  }
  return vessels;
}

// ─── SANTOS BRASIL ────────────────────────────────────────────────────────────
function parseSBHtmlTable(html: string): Vessel[] {
  function strip(s: string) {
    return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
  }
  const vessels: Vessel[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[] = [];
  let m;
  while ((m = rowRe.exec(html)) !== null) rows.push(m[0]);
  if (rows.length < 3) return vessels;

  let headers: string[] = [];
  let start = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    const ths: string[] = [];
    while ((m = thRe.exec(rows[i])) !== null) ths.push(strip(m[1]).toLowerCase());
    if (ths.length >= 3) { headers = ths; start = i + 1; break; }
    // fallback: primeira linha com tds se não tiver th
    if (i === 0) {
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      const tds: string[] = [];
      while ((m = tdRe.exec(rows[i])) !== null) tds.push(strip(m[1]).toLowerCase());
      if (tds.length >= 4 && tds.some(t => t.includes('navio') || t.includes('vessel'))) {
        headers = tds; start = 1; break;
      }
    }
  }

  const idx = (kws: string[]) => {
    for (let i = 0; i < headers.length; i++)
      if (kws.some(k => headers[i].includes(k))) return i;
    return -1;
  };
  const nIdx  = idx(['navio','vessel','embarca','nome']);
  const sIdx  = idx(['situa','status','opera','estado']);
  const bIdx  = idx(['berco','berço','dock','cais']);
  const aIdx  = idx(['armador','shipping','agenc','companhia']);
  const vIdx  = idx(['viagem','voyage']);
  const gdIdx = idx(['liberacao do dry','liberação do dry','gate dry','abertura de gate dry','abert. gate d']);
  const grIdx = idx(['liberacao do reefer','liberação do reefer','gate reefer','abertura de gate reefer','abert. gate r']);
  const dlIdx = idx(['dead-line','dead line','deadline','prazo']);
  const pIdx  = idx(['previs','chegada','atrac','eta']);

  for (let i = start; i < rows.length; i++) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    while ((m = tdRe.exec(rows[i])) !== null) cells.push(strip(m[1]));
    if (cells.length < 2) continue;
    const g = (i: number) => i >= 0 && i < cells.length ? cells[i].trim() : '';
    const navio = g(nIdx >= 0 ? nIdx : 0);
    if (!navio || navio.toLowerCase() === 'navio') continue;
    const gateDry    = g(gdIdx) || undefined;
    const gateReefer = g(grIdx) || undefined;
    const deadline   = g(dlIdx) || undefined;
    const situacao   = g(sIdx) || deriveSituacao(gateDry, gateReefer, deadline);
    vessels.push({
      terminal: 'SANTOS BRASIL', navio,
      situacao,
      previsao: g(pIdx) || undefined,
      berco: g(bIdx) || undefined,
      armador: g(aIdx) || undefined,
      viagem: g(vIdx) || undefined,
      gateDry, gateReefer, deadLineStr: deadline,
    });
  }
  return vessels;
}

async function scrapeSantosBrasil(): Promise<{ vessels: Vessel[]; error?: string }> {
  const ua      = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const referer = 'https://www.santosbrasil.com.br/';
  const pageUrl = 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao?unidade=tecon-santos';

  // 1) Endpoint legado ASP (sem reCAPTCHA — era o que funcionava antes)
  const legacyUrls = [
    'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp?unidade=tecon-santos',
    'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp',
  ];
  for (const url of legacyUrls) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Referer': referer,
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes('recaptcha') && (html.match(/<tr/gi) ?? []).length < 10) continue;
      const vessels = parseSBHtmlTable(html);
      if (vessels.length > 0) return { vessels };
    } catch { /* tenta próximo */ }
  }

  // 2) Busca cookies de sessão da página principal antes do endpoint JSON
  let sessionCookies = '';
  try {
    const pageInit = await fetch(pageUrl, {
      headers: { 'User-Agent': ua, 'Accept': 'text/html', 'Referer': referer },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    const rawCookie = pageInit.headers.get('set-cookie') ?? '';
    sessionCookies = rawCookie.split(',').map(c => c.trim().split(';')[0]).filter(Boolean).join('; ');
  } catch { /* ignora */ }

  const cookieHeader: Record<string, string> = sessionCookies ? { Cookie: sessionCookies } : {};

  // 3) Endpoints JSON modernos
  const jsonVariants = [
    'https://www.santosbrasil.com.br/v2021/lista-de-atracacao/pesquisa?unidade=tecon-santos',
    'https://www.santosbrasil.com.br/v2021/lista-de-atracacao/pesquisa?unidade=tecon-santos&pagina=1&itensPorPagina=200',
  ];

  const lastErrors: string[] = [];
  for (const url of jsonVariants) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': pageUrl,
          ...cookieHeader,
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!res.ok) { lastErrors.push(`HTTP ${res.status}`); continue; }
      const text = await res.text();
      let json: Record<string, unknown>;
      try { json = JSON.parse(text); } catch { lastErrors.push(`JSON inválido: ${text.slice(0, 60)}`); continue; }
      const list = (json.VAtracacao ?? json.vAtracacao ?? json.data ?? json.Data ?? json.items ?? []) as Record<string, unknown>[];
      if (!Array.isArray(list) || list.length === 0) { lastErrors.push(`Lista vazia`); continue; }
      return { vessels: list.map(mapSBRow) };
    } catch (e: any) { lastErrors.push(e?.message); }
  }

  return { vessels: [], error: `Santos Brasil: endpoint legado e /pesquisa inacessíveis (${lastErrors.join(', ')})` };
}

function mapSBRow(r: Record<string, unknown>): Vessel {
  const navio      = pick(r, ['Navio','navio','NomeNavio','Nome']);
  const berco      = pick(r, ['Berco','Berço','BercoId','Brc','NumBerco','berco']);
  const armador    = pick(r, ['Armador','armador','NomeArmador','ViagemArmador']);
  const viagem     = pick(r, ['Viagem','viagem','NumViagem','CodViagem']);
  const deadline   = pick(r, ['Deadline','DeadLine','deadline','DataDeadline','DtDeadline']);
  // Liberação do Dry = gate aberto (data real); Prev. Liberação = previsão
  const gateDry    = pick(r, ['LiberacaoDry','LiberacaoGateDry','GateDry','DtLiberacaoDry','liberacao_dry']);
  const gateReefer = pick(r, ['LiberacaoReefer','LiberacaoGateReefer','GateReefer','DtLiberacaoReefer','liberacao_reefer']);
  const previsao   = pick(r, ['PrevisaoChegada','DtPrevisaoChegada','PrevisaoAtracacao','DtPrevChegada']);
  return {
    terminal: 'SANTOS BRASIL', navio,
    situacao: deriveSituacao(gateDry || undefined, gateReefer || undefined, deadline || undefined),
    previsao: previsao || undefined, berco: berco || undefined,
    armador: armador || undefined, viagem: viagem || undefined,
    gateDry: gateDry || undefined, gateReefer: gateReefer || undefined,
    deadLineStr: deadline || undefined,
  };
}

// ─── ECOPORTO ─────────────────────────────────────────────────────────────────
// HTTP 403 para IPs externos — mantido como tentativa, provavelmente vai falhar
async function scrapeEcoporto(): Promise<{ vessels: Vessel[]; error?: string }> {
  const urls = [
    'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
    'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao',
  ];
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': ua, 'Accept': 'text/html', 'Referer': 'http://op.ecoportosantos.com.br/' },
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const vessels = parseEcoportoTable(html);
      if (vessels.length > 0) return { vessels };
    } catch { /* tenta próxima */ }
  }
  return { vessels: [], error: 'ECOPORTO: HTTP 403 — servidor bloqueia IPs externos' };
}

function parseEcoportoTable(html: string): Vessel[] {
  function strip(s: string) {
    return s.replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
  }
  const vessels: Vessel[] = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[] = [];
  let m;
  while ((m = rowRe.exec(html)) !== null) rows.push(m[0]);
  if (rows.length < 3) return vessels;

  let headers: string[] = [];
  let start = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const thRe = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    const ths: string[] = [];
    while ((m = thRe.exec(rows[i])) !== null) ths.push(strip(m[1]).toLowerCase());
    if (ths.length >= 3) { headers = ths; start = i + 1; break; }
  }

  const idx = (kws: string[]) => {
    for (let i = 0; i < headers.length; i++)
      if (kws.some(k => headers[i].includes(k))) return i;
    return -1;
  };
  const nIdx = idx(['navio','vessel','ship','nome']);
  const sIdx = idx(['situa','status','estado','opera']);
  const bIdx = idx(['berco','berço','dock','cais']);
  const aIdx = idx(['armador','shipping','agenc']);
  const vIdx = idx(['viagem','voyage']);
  const pIdx = idx(['previs','chegada','atrac']);

  for (let i = start; i < rows.length; i++) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    while ((m = tdRe.exec(rows[i])) !== null) cells.push(strip(m[1]));
    if (cells.length < 2) continue;
    const g = (i: number) => i >= 0 && i < cells.length ? cells[i].trim() : '';
    const navio = g(nIdx);
    if (!navio) continue;
    const situacao = g(sIdx) || 'SEM PREVISÃO';
    vessels.push({
      terminal: 'ECOPORTO', navio, situacao,
      previsao: g(pIdx) || undefined, berco: g(bIdx) || undefined,
      armador: g(aIdx) || undefined, viagem: g(vIdx) || undefined,
    });
  }
  return vessels;
}

// ─── Salvar no Supabase ───────────────────────────────────────────────────────
async function saveToSupabase(
  vessels: Vessel[],
  supabaseUrl: string,
  supabaseKey: string,
  fetchedAt: string,
): Promise<{ saved: number; error?: string }> {
  if (!vessels.length) return { saved: 0 };

  const terminals = [...new Set(vessels.map(v => v.terminal))];
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

  const supabaseUrl = (globalThis as any).VITE_SUPABASE_URL
    || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_URL : '') || '';
  const supabaseKey = (globalThis as any).VITE_SUPABASE_ANON_KEY
    || (typeof process !== 'undefined' ? process.env?.VITE_SUPABASE_ANON_KEY : '') || '';
  const fetchedAt = new Date().toISOString();

  const [btpRes, ecoRes, sbRes] = await Promise.allSettled([
    scrapeBTP(),
    scrapeEcoporto(),
    scrapeSantosBrasil(),
  ]);

  const allVessels: Vessel[] = [];
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
