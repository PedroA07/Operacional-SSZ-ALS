import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { OrgAuditEntry } from '../../types';
import { db, supabase } from '../../utils/storage';
import { formatDateTimePtBR } from '../../utils/dateHelpers';

const AREA_COLORS: Record<string, string> = {
  VIAGEM:        'bg-blue-50 text-blue-700 border-blue-200',
  FORMULARIO:    'bg-violet-50 text-violet-700 border-violet-200',
  CLIENTE:       'bg-purple-50 text-purple-700 border-purple-200',
  MOTORISTA:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  PORTO:         'bg-amber-50 text-amber-700 border-amber-200',
  'PRE-STACKING':'bg-cyan-50 text-cyan-700 border-cyan-200',
  COLETA:        'bg-blue-50 text-blue-700 border-blue-200',
  ENTREGA:       'bg-indigo-50 text-indigo-700 border-indigo-200',
  DEVOLUCAO:     'bg-amber-50 text-amber-700 border-amber-200',
  LIBERACAO:     'bg-slate-100 text-slate-700 border-slate-300',
};

const AuditoriaTab: React.FC = () => {
  const [entries, setEntries] = useState<OrgAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setEntries(await db.getOrgAuditLog(2000));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (!supabase) return;
    const ch = supabase
      .channel('auditoria-' + Math.random().toString(36).slice(2, 7))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'org_audit_log' }, () => load())
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [load]);

  // Áreas e responsáveis presentes no log (para os filtros)
  const areas = useMemo(() => Array.from(new Set(entries.map(e => e.area).filter(Boolean))).sort(), [entries]);
  const actors = useMemo(() => Array.from(new Set(entries.map(e => e.userName).filter(Boolean))).sort(), [entries]);

  const filtered = useMemo(() => {
    const term = search.trim().toUpperCase();
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00').getTime() : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59').getTime() : null;
    return entries.filter(e => {
      if (areaFilter && e.area !== areaFilter) return false;
      if (actorFilter && e.userName !== actorFilter) return false;
      if (from || to) {
        const t = new Date(e.createdAt).getTime();
        if (from && t < from) return false;
        if (to && t > to) return false;
      }
      if (!term) return true;
      return [e.entityLabel, e.userName, e.description, e.action, e.area].some(v => (v || '').toUpperCase().includes(term));
    });
  }, [entries, search, areaFilter, actorFilter, dateFrom, dateTo]);

  const inputCls = 'px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold uppercase outline-none focus:border-blue-500 bg-white';

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Auditoria</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Registro de quem criou ou alterou cada informação</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={load} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all" title="Atualizar">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por OS, responsável, descrição..." className={`w-full pl-10 ${inputCls} normal-case`} />
          </div>
          <select value={actorFilter} onChange={e => setActorFilter(e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">Todos responsáveis</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase">De
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
          </label>
          <label className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase">Até
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setAreaFilter('')} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${areaFilter === '' ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}>Todas</button>
          {areas.map(area => (
            <button key={area} onClick={() => setAreaFilter(area)} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border ${areaFilter === area ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600'}`}>{area}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
            {filtered.map(entry => (
              <div key={entry.id} className="px-6 py-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border ${AREA_COLORS[entry.area] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>{entry.area}</span>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{entry.action}</span>
                      {entry.entityLabel && <span className="text-[10px] font-black text-slate-800 uppercase">{entry.entityLabel}</span>}
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 mt-1">{entry.description}</p>
                    {entry.changes && entry.changes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {entry.changes.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 text-[9px] font-bold">
                            <span className="text-slate-400 uppercase tracking-wider shrink-0">{c.field}:</span>
                            <span className="text-red-400 line-through truncate max-w-[180px]">{c.from || '—'}</span>
                            <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                            <span className="text-emerald-600 truncate max-w-[180px]">{c.to || '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                      </div>
                      <span className="text-[9px] font-black text-slate-700 uppercase">{entry.userName}</span>
                    </div>
                    <p className="text-[8px] font-bold text-slate-400 mt-1">{formatDateTimePtBR(entry.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditoriaTab;
