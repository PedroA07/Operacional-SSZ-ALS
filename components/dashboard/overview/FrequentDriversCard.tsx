import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip } from '../../../types';

interface FrequentDriversCardProps {
  trips: Trip[];
}

interface DriverStat {
  id: string;
  name: string;
  count: number;
  plate?: string;
}

const rankColors = ['bg-amber-400 text-white', 'bg-slate-300 text-slate-700', 'bg-orange-400 text-white'];

const FrequentDriversCard: React.FC<FrequentDriversCardProps> = ({ trips }) => {
  const [open, setOpen] = useState(false);

  const ranking = useMemo<DriverStat[]>(() => {
    const map = new Map<string, DriverStat>();
    trips.forEach(t => {
      const d = t.driver;
      if (!d || !d.name) return;
      const key = d.id || d.name;
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { id: key, name: d.name, count: 1, plate: d.plateHorse });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [trips]);

  const total = ranking.reduce((s, r) => s + r.count, 0);
  const top = ranking.slice(0, 5);
  const max = ranking[0]?.count || 1;

  const Row = ({ r, idx }: { r: DriverStat; idx: number }) => (
    <div className="flex items-center gap-3">
      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 ${idx < 3 ? rankColors[idx] : 'bg-slate-100 text-slate-500'}`}>{idx + 1}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black text-slate-700 uppercase truncate">{r.name}</span>
          <span className="text-[10px] font-black text-blue-600 shrink-0">{r.count}</span>
        </div>
        <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" style={{ width: `${Math.max(6, (r.count / max) * 100)}%` }} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div>
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Motoristas Frequentes</h3>
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Quem mais puxa viagens</p>
            </div>
          </div>
          {ranking.length > 5 && (
            <button onClick={() => setOpen(true)} className="text-[8px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-widest">Ver todos</button>
          )}
        </div>

        {top.length === 0 ? (
          <p className="text-[9px] font-bold text-slate-300 uppercase text-center py-8">Sem viagens registradas</p>
        ) : (
          <div className="space-y-3.5">
            {top.map((r, idx) => <Row key={r.id} r={r} idx={idx} />)}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{ranking.length} motoristas</span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{total} viagens</span>
        </div>
      </div>

      {open && createPortal(
        <div className="fixed inset-0 z-[9000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-7 py-5 bg-slate-900 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Ranking</p>
                <h3 className="text-sm font-black text-white uppercase">Motoristas por viagens</h3>
              </div>
              <button onClick={() => setOpen(false)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-3.5 overflow-y-auto custom-scrollbar">
              {ranking.map((r, idx) => <Row key={r.id} r={r} idx={idx} />)}
            </div>
            <div className="px-7 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{ranking.length} motoristas</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{total} viagens no total</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FrequentDriversCard;
