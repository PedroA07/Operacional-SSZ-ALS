
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsYesterdayProps {
  trips: Trip[];
}

const TripsYesterday: React.FC<TripsYesterdayProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA');
  }, []);

  const yesterdayRaw = useMemo(() => {
    return trips.filter(t => {
      if (!t.dateTime) return false;
      return t.dateTime.substring(0, 10) === yesterdayStr;
    });
  }, [trips, yesterdayStr]);

  const stats = useMemo(() => {
    const active = yesterdayRaw.filter(t => t.status !== 'Viagem cancelada');
    const completed = yesterdayRaw.filter(t => t.status === 'Viagem concluída').length;
    const canceled = yesterdayRaw.filter(t => t.status === 'Viagem cancelada').length;
    
    const typeCounts: { [key: string]: number } = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const delays = active.filter(t => {
      const arrival = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      const scheduled = new Date(t.dateTime).getTime();
      if (arrival) return new Date(arrival.dateTime).getTime() > (scheduled + 59000);
      return t.status !== 'Viagem concluída'; // Se não concluiu ontem, já é considerado atraso/pendência
    }).length;

    return { total: active.length, completed, canceled, delays, typeCounts };
  }, [yesterdayRaw]);

  const allTypes = useMemo(() => Array.from(new Set(yesterdayRaw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [yesterdayRaw]);
  const allClients = useMemo(() => Array.from(new Set(yesterdayRaw.map(t => t.customer.name))).sort(), [yesterdayRaw]);

  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  
  const list = useMemo(() => {
    return yesterdayRaw.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchType = selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS');
      const matchClient = selClients.length === 0 || selClients.includes(t.customer.name);
      return matchType && matchClient;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [yesterdayRaw, selTypes, selClients]);

  return (
    <div className="relative" style={{ zIndex: isOpen ? 150 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-7 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl relative z-[70] flex flex-col h-full ${isOpen ? 'border-slate-400 ring-4 ring-slate-400/5 rounded-b-none' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start w-full">
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ontem</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-4xl font-black text-slate-800 tracking-tighter">{stats.total}</p>
                </div>
            </div>
            <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>
               <svg className={`w-5 h-5 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            </div>
        </div>

        <div className="mt-6 w-full space-y-4">
          <div className="flex flex-wrap gap-1.5 min-h-[30px]">
            {Object.entries(stats.typeCounts).map(([type, c]) => (
              <div key={type} className="bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 flex items-center gap-2">
                <span className="text-[7px] font-black text-slate-400 uppercase truncate">{type}</span>
                <span className="text-[9px] font-black text-slate-700">{c}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-red-50 p-2 rounded-xl text-center border border-red-100"><p className="text-[7px] font-black text-red-400 uppercase">Atr.</p><p className="text-sm font-black text-red-600 leading-none mt-1">{stats.delays}</p></div>
            <div className="bg-emerald-50 p-2 rounded-xl text-center border border-emerald-100"><p className="text-[7px] font-black text-emerald-400 uppercase">Concl.</p><p className="text-sm font-black text-emerald-600 leading-none mt-1">{stats.completed}</p></div>
            <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-200"><p className="text-[7px] font-black text-slate-400 uppercase">Canc.</p><p className="text-sm font-black text-slate-600 leading-none mt-1">{stats.canceled}</p></div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border border-slate-400 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2 shrink-0 relative z-[170]">
             <MultiCheckboxFilter label="Tipos" options={allTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <MultiCheckboxFilter label="Clientes" options={allClients} selectedOptions={selClients} onChange={setSelClients} />
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3 flex-1 bg-slate-50/30 min-h-[250px] rounded-b-[2.5rem]">
            {list.length > 0 ? list.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-3xl shadow-sm">
                <span className="text-xs font-black text-slate-400">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                <p className="text-[10px] font-black text-slate-800 uppercase mt-1 leading-none truncate">{trip.driver.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{trip.customer.name}</p>
                  <span className={`text-[8px] font-black ${trip.status === 'Viagem concluída' ? 'text-emerald-600' : 'text-blue-500'}`}>{trip.status}</span>
                </div>
              </div>
            )) : <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px]">Sem dados para exibir</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsYesterday;
