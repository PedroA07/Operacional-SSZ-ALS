const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // Token lido do secret do Supabase — nunca vem do cliente
  const token = Deno.env.get('ROTAS_BRASIL_TOKEN');
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Secret ROTAS_BRASIL_TOKEN não configurado no Supabase.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const { origin, destination, axles, via } = await req.json();

    // Build waypoints string: origin [; via] ; destination
    const pontos = [origin, ...(via?.trim() ? [via.trim()] : []), destination].join(';');

    const params = new URLSearchParams({
      pontos,
      veiculo: 'caminhao',
      eixo: String(axles),
      paradas: 'true',
      token,
    });

    const url = `http://rotasbrasil.com.br/apiRotas/enderecos/?${params}`;
    console.log('[rotas-brasil-proxy]', url.replace(token, '***'));

    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ALSLogistica/1.0)' },
      signal: AbortSignal.timeout(20_000),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: `API retornou ${resp.status}`, detail: text.slice(0, 300) }),
        { status: resp.status, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Resposta inválida da API (não é JSON)', raw: text.slice(0, 500) }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('[rotas-brasil-proxy]', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
