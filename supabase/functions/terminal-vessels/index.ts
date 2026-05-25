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
  const previsaoIdx   = findColIndex(headers, ['previs', 'eta', 'chegada', 'atrac', 'hora', 'inicio']);
  const bercoIdx      = findColIndex(headers, ['berco', 'berço', 'brc', 'dock', 'pier', 'cais']);
  const armadorIdx    = findColIndex(headers, ['armador', 'shipping', 'companhia', 'linha', 'agenc', 'agent']);
  const viagemIdx     = findColIndex(headers, ['viagem', 'voyage', 'trip', 'vg']);
  // BTP: "ABERTURA DE GATE DRY" / "ABERTURA DE GATE REEFER"
  // Santos Brasil: "Liberação do Dry" / "Liberação do Reefer" (priorizar coluna sem "prev")
  const gateDryIdx    = findColIndex(headers, ['abertura de gate dry', 'abertura gate d', 'abert. gate d', 'gate dry', 'liberacao do dry', 'liberação do dry']);
  const gateReeferIdx = findColIndex(headers, ['abertura de gate reefer', 'abertura gate r', 'abert. gate r', 'gate reefer', 'liberacao do reefer', 'liberação do reefer']);
  const deadLineIdx   = findColIndex(headers, ['dead-line', 'dead line', 'deadline', 'prazo', 'encerr']);

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

const BROWSER_HEADERS = (referer: string): Record<string, string> => ({
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  'Referer': referer,
  'Cache-Control': 'no-cache',
});

// ─── BTP ─────────────────────────────────────────────────────────────────────
// Página principal é JS-rendered. Tentamos o endpoint de dados que o
// frontend chama via AJAX (POST sem corpo retorna HTML parcial com a tabela).
async function fetchBTP(vesselFilter?: string): Promise<{ vessels: TerminalVessel[]; error?: string; terminal: string; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const referer = 'https://novo-tas.btp.com.br/';

  const attempts: Array<{ url: string; method: string; body?: string; ct?: string }> = [
    // Endpoint AJAX — retorna HTML parcial com a tabela já preenchida
    { url: 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacao', method: 'POST', body: '', ct: 'application/x-www-form-urlencoded; charset=UTF-8' },
    { url: 'https://novo-tas.btp.com.br/ConsultasLivres/GetListaAtracacao', method: 'POST', body: '{}', ct: 'application/json' },
    // Página completa — pode funcionar em alguns contextos sem JS completo
    { url: 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex', method: 'GET' },
  ];

  for (const { url, method, body, ct } of attempts) {
    try {
      const headers: Record<string, string> = {
        ...BROWSER_HEADERS(referer),
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (ct) headers['Content-Type'] = ct;

      const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? body : undefined,
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });

      if (!res.ok) continue;
      const html = await res.text();
      const trCount = (html.match(/<tr/gi) || []).length;
      if (trCount < 2) continue;

      const vessels = parseHtmlTable(html, 'BTP', vesselFilter);
      if (vessels.length > 0) return { vessels, terminal: 'BTP', fetchedAt };
    } catch { /* tenta próximo */ }
  }

  return { vessels: [], error: 'BTP: página JS-renderizada, endpoint de dados não acessível', terminal: 'BTP', fetchedAt };
}

// ─── ECOPORTO ─────────────────────────────────────────────────────────────────
// Retorna 403 para IPs fora do Brasil. Tentamos variações de URL e cabeçalhos.
async function fetchEcoporto(vesselFilter?: string): Promise<{ vessels: TerminalVessel[]; error?: string; terminal: string; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const urls = [
    'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
    'http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao',
    'https://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/',
    'http://ecoportosantos.com.br/externa/LineUpListaAtracacao/',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          ...BROWSER_HEADERS('http://op.ecoportosantos.com.br/'),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();
      const trCount = (html.match(/<tr/gi) || []).length;
      if (trCount < 2) continue;
      const vessels = parseHtmlTable(html, 'ECOPORTO', vesselFilter);
      if (vessels.length > 0) return { vessels, terminal: 'ECOPORTO', fetchedAt };
    } catch { /* tenta próximo */ }
  }

  return { vessels: [], error: 'ECOPORTO: HTTP 403 — servidor bloqueia IPs fora do Brasil', terminal: 'ECOPORTO', fetchedAt };
}

// ─── SANTOS BRASIL ────────────────────────────────────────────────────────────
// Página v2021 exige reCAPTCHA. O endpoint legado atracacao-table.asp retorna
// dados sem CAPTCHA, mas precisa dos parâmetros corretos.
async function fetchSantosBrasil(vesselFilter?: string): Promise<{ vessels: TerminalVessel[]; error?: string; terminal: string; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const referer = 'https://www.santosbrasil.com.br/';

  const urls = [
    // Endpoint legado — retorna tabela HTML sem CAPTCHA
    'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp?unidade=tecon-santos',
    'https://www.santosbrasil.com.br/tecon-santos-sistemas/atracacao-table.asp',
    // Página moderna com query params corretos
    'https://www.santosbrasil.com.br/v2021/lista-de-atracacao?titulo=&unidade=tecon-santos&lista=recebimento-de-exportacao',
    'https://www.santosbrasil.com.br/v2021/lista-de-atracacao?unidade=tecon-santos',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          ...BROWSER_HEADERS(referer),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Descarta páginas de CAPTCHA ou login (poucas linhas de dados)
      const trCount = (html.match(/<tr/gi) || []).length;
      if (trCount < 3) continue;
      // Se a página menciona reCAPTCHA E tem menos de 10 linhas, é a tela de bloqueio
      if (html.includes('recaptcha') && trCount < 10) continue;

      const vessels = parseHtmlTable(html, 'SANTOS BRASIL', vesselFilter);
      if (vessels.length > 0) return { vessels, terminal: 'SANTOS BRASIL', fetchedAt };
    } catch { /* tenta próximo */ }
  }

  return { vessels: [], error: 'Santos Brasil: reCAPTCHA bloqueou o acesso', terminal: 'SANTOS BRASIL', fetchedAt };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
async function fetchTerminal(
  terminalKey: string,
  vesselFilter?: string
): Promise<{ vessels: TerminalVessel[]; error?: string; terminal: string; fetchedAt: string }> {
  if (terminalKey === 'btp')         return fetchBTP(vesselFilter);
  if (terminalKey === 'ecoporto')    return fetchEcoporto(vesselFilter);
  if (terminalKey === 'santosbrasil') return fetchSantosBrasil(vesselFilter);
  return { vessels: [], error: 'Terminal desconhecido', terminal: terminalKey, fetchedAt: new Date().toISOString() };
}

// ─── Persist vessels to Supabase ─────────────────────────────────────────────
async function saveVessels(vessels: TerminalVessel[], fetchedAt: string): Promise<{ saved: number; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !supabaseKey || vessels.length === 0) return { saved: 0 };

  const terminals = [...new Set(vessels.map(v => v.terminal))];

  // Delete stale rows for the fetched terminals
  const deleteRes = await fetch(
    `${supabaseUrl}/rest/v1/terminal_vessels?terminal=in.(${terminals.map(t => `"${t}"`).join(',')})`,
    {
      method: 'DELETE',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!deleteRes.ok) {
    const errText = await deleteRes.text();
    return { saved: 0, error: `DELETE failed: ${errText}` };
  }

  const rows = vessels.map(v => ({
    terminal:      v.terminal,
    navio:         v.navio,
    situacao:      v.situacao,
    previsao:      v.previsao      ?? null,
    berco:         v.berco         ?? null,
    armador:       v.armador       ?? null,
    viagem:        v.viagem        ?? null,
    gate_dry:      v.gateDry       ?? null,
    gate_reefer:   v.gateReefer    ?? null,
    dead_line_str: v.deadLineStr   ?? null,
    fetched_at:    fetchedAt,
  }));

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/terminal_vessels`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(rows),
  });

  if (!insertRes.ok) {
    const errText = await insertRes.text();
    return { saved: 0, error: `INSERT failed: ${errText}` };
  }

  return { saved: rows.length };
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

      const saveResult = await saveVessels(allVessels, fetchedAt);

      return new Response(
        JSON.stringify({
          vessels: allVessels,
          saved: saveResult.saved,
          saveError: saveResult.error,
          error: errors.length ? errors.join(' | ') : undefined,
          terminal: 'all',
          fetchedAt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await fetchTerminal(terminal, vessel);

    if (result.vessels.length > 0) {
      await saveVessels(result.vessels, fetchedAt);
    }

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
