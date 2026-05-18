export const config = { runtime: 'edge' };

const TERMINALS = [
  { id: 'ecoporto',      name: 'ECOPORTO',      url: 'https://www.ecoporto.com.br' },
  { id: 'santos_brasil', name: 'SANTOS BRASIL',  url: 'https://www.santosbrasil.com.br' },
  { id: 'embraport',     name: 'EMBRAPORT',       url: 'https://www.embraport.com.br' },
  { id: 'btp',           name: 'BTP',             url: 'https://www.btp.com.br' },
  { id: 'depot_record',  name: 'DEPOT RECORD',    url: 'https://www.depotrecord.com.br' },
];

export default async function handler(req: Request) {
  const results = await Promise.allSettled(
    TERMINALS.map(async (t) => {
      const start = Date.now();
      try {
        const res = await fetch(t.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        return { ...t, status: res.ok || res.status < 500 ? 'online' : 'offline', responseMs: Date.now() - start, lastCheck: new Date().toISOString() };
      } catch {
        return { ...t, status: 'offline', responseMs: Date.now() - start, lastCheck: new Date().toISOString() };
      }
    })
  );
  const data = results.map(r => r.status === 'fulfilled' ? r.value : { ...TERMINALS[0], status: 'offline' });
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
