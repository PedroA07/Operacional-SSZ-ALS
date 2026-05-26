export const config = { runtime: 'edge' };

// Diagnóstico: mostra o que cada terminal realmente retorna (status, headers, snippet do body)
// Acesse: GET /api/terminal-debug?t=btp   ou  ?t=sb   ou  ?t=embraport

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function probe(url: string, options: RequestInit = {}): Promise<Record<string, unknown>> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    });
    const text = await res.text();
    return {
      url,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get('content-type'),
      setCookie: res.headers.get('set-cookie')?.slice(0, 200),
      bodyLength: text.length,
      trCount: (text.match(/<tr/gi) ?? []).length,
      tdCount: (text.match(/<td/gi) ?? []).length,
      csrfToken: (text.match(/<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]{0,60})"/i) ?? [])[1] ?? null,
      bodySnippet: text.slice(0, 500).replace(/\s+/g, ' ').trim(),
      ms: Date.now() - start,
    };
  } catch (e: any) {
    return { url, error: e?.message ?? String(e), ms: Date.now() - start };
  }
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const t = url.searchParams.get('t') ?? 'all';

  const results: Record<string, unknown> = {};

  if (t === 'btp' || t === 'all') {
    results.btp_get = await probe('https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://novo-tas.btp.com.br/' },
    });

    // Tenta POST sem token
    results.btp_post_no_token = await probe('https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacao', {
      method: 'POST',
      headers: {
        'User-Agent': UA, 'Accept': '*/*', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
        'Origin': 'https://novo-tas.btp.com.br',
      },
      body: '',
    });

    // Se GET retornou token, tenta POST com ele
    const csrf = (results.btp_get as any).csrfToken;
    if (csrf) {
      results.btp_post_with_token = await probe('https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacao', {
        method: 'POST',
        headers: {
          'User-Agent': UA, 'Accept': '*/*', 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://novo-tas.btp.com.br/ConsultasLivres/ListaAtracacaoIndex',
          'Origin': 'https://novo-tas.btp.com.br',
          'Cookie': (results.btp_get as any).setCookie?.split(';')[0] ?? '',
        },
        body: `__RequestVerificationToken=${encodeURIComponent(csrf)}`,
      });
    }
  }

  if (t === 'sb' || t === 'all') {
    results.sb_pesquisa = await probe('https://www.santosbrasil.com.br/v2021/lista-de-atracacao/pesquisa?unidade=tecon-santos', {
      headers: {
        'User-Agent': UA, 'Accept': 'application/json, */*', 'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://www.santosbrasil.com.br/v2021/lista-de-atracacao?unidade=tecon-santos',
      },
    });
    results.sb_page = await probe('https://www.santosbrasil.com.br/v2021/lista-de-atracacao?unidade=tecon-santos', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://www.santosbrasil.com.br/' },
    });
  }

  if (t === 'embraport' || t === 'all') {
    results.embraport = await probe('http://www.embraportonline.com.br/Navios/Escala', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'http://www.embraportonline.com.br/' },
    });
  }

  if (t === 'eco' || t === 'all') {
    results.ecoporto = await probe('http://op.ecoportosantos.com.br/externa/LineUpListaAtracacao/', {
      headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'http://op.ecoportosantos.com.br/' },
    });
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
