export const config = { runtime: 'edge' };

const DEFAULT_TERMINALS = [
  { id: 'ecoporto',      name: 'ECOPORTO',      url: 'https://www.ecoporto.com.br' },
  { id: 'santos_brasil', name: 'SANTOS BRASIL',  url: 'https://www.santosbrasil.com.br' },
  { id: 'embraport',     name: 'EMBRAPORT',      url: 'https://www.embraport.com.br' },
  { id: 'btp',           name: 'BTP',            url: 'https://www.btp.com.br' },
  { id: 'depot_record',  name: 'DEPOT RECORD',   url: 'https://www.depotrecord.com.br' },
];

export default async function handler(req: Request) {
  let terminals = DEFAULT_TERMINALS;

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      if (Array.isArray(body?.terminals) && body.terminals.length > 0) {
        terminals = body.terminals;
      }
    } catch { /* fall through to defaults */ }
  }

  const results = await Promise.allSettled(
    terminals.map(async (t) => {
      const start = Date.now();
      try {
        const res = await fetch(t.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(6000),
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ALS-Monitor/1.0)' },
        });
        const online = res.ok || (res.status >= 200 && res.status < 500);
        return { ...t, status: online ? 'online' : 'offline', responseMs: Date.now() - start, lastCheck: new Date().toISOString() };
      } catch {
        return { ...t, status: 'offline', responseMs: Date.now() - start, lastCheck: new Date().toISOString() };
      }
    })
  );

  const data = results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...terminals[i], status: 'offline', responseMs: 0, lastCheck: new Date().toISOString() }
  );

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}
