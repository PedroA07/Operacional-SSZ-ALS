
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';
import { statsCalculator } from '../../../utils/statsCalculator';
import RichEntityFilter from './RichEntityFilter';
import MultiCheckboxFilter from '../../shared/MultiCheckboxFilter';

interface TripsTodayProps {
  trips: Trip[];
}

const TripsToday: React.FC<TripsTodayProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selClients, setSelClients] = useState<string[]>([]);
  const [selDrivers, setSelDrivers] = useState<string[]>([]);

  const todayStr = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
  const todayRaw = useMemo(() => {
    return trips.filter(t => t.dateTime && t.dateTime.substring(0, 10) === todayStr);
  }, [trips, todayStr]);

  const filteredBase = useMemo(() => {
    return todayRaw.filter(t => selTypes.length === 0 || selTypes.includes(t.type?.toUpperCase() || 'OUTROS'));
  }, [todayRaw, selTypes]);

  const clientStats = useMemo(() => statsCalculator.calculateFullDashboardStats(filteredBase, 'client'), [filteredBase]);
  const driverStats = useMemo(() => statsCalculator.calculateFullDashboardStats(filteredBase, 'driver'), [filteredBase]);

  const stats = useMemo(() => {
    const active = filteredBase.filter(t => t.status !== 'Viagem cancelada');
    const canceled = filteredBase.filter(t => t.status === 'Viagem cancelada').length;
    const completed = active.filter(t => t.status === 'Viagem concluída').length;
    const delays = active.filter(t => statsCalculator.isDelayed(t)).length;
    const typeCounts: Record<string, number> = {};
    active.forEach(t => {
      const type = t.type?.toUpperCase() || 'OUTROS';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    return { total: active.length, typeCounts, canceled, delays, completed };
  }, [filteredBase]);

  const displayTrips = useMemo(() => {
    return filteredBase.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      const matchC = selClients.length === 0 || selClients.includes(t.customer.name);
      const matchD = selDrivers.length === 0 || selDrivers.includes(t.driver.name);
      return matchC && matchD;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [filteredBase, selClients, selDrivers]);

  const allOpTypes = useMemo(() => Array.from(new Set(todayRaw.map(t => t.type?.toUpperCase() || 'OUTROS'))).sort(), [todayRaw]);

  // Função auxiliar para definir a cor do item na lista de hoje
  const getTripItemStyle = (status: string) => {
    if (status === 'Viagem concluída') return 'bg-emerald-50/50 border-emerald-100 text-emerald-700';
    if (['Em viagem', 'Chegou no cliente', 'Saiu do cliente'].includes(status)) return 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm';
    return 'bg-amber-50/30 border-amber-100 text-amber-700'; // Pendentes
  };

  return (
    <div className="relative" style={{ zIndex: isOpen ? 500 : 10 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left p-7 rounded-[2.5rem] border-2 transition-all duration-500 shadow-xl relative z-[70] flex flex-col h-full ${
          isOpen 
          ? 'bg-blue-600 border-blue-400 ring-4 ring-blue-500/10 rounded-b-none' 
          : 'bg-gradient-to-br from-blue-50 to-white border-blue-200 hover:border-blue-400'
        }`}
      >
        <div className="flex justify-between items-start w-full">
            <div>
                <p className={`text-[11px] font-black uppercase tracking-widest ${isOpen ? 'text-blue-100' : 'text-blue-400'}`}>Operação Hoje</p>
                <p className={`text-5xl font-black tracking-tighter mt-1 ${isOpen ? 'text-white' : 'text-blue-600'}`}>{stats.total}</p>
            </div>
            <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-white/20 text-white' : 'bg-blue-600 text-white shadow-lg'}`}>
               <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
        </div>

        <div className="mt-8 w-full space-y-5">
          <div className="flex flex-wrap gap-2 min-h-[30px]">
            {Object.entries(stats.typeCounts).slice(0, 3).map(([type, c]) => (
              <div key={type} className={`px-3 py-2 rounded-xl border flex items-center gap-3 ${isOpen ? 'bg-white/10 border-white/10 text-white' : 'bg-white border-blue-100 text-blue-800'}`}>
                <span className={`text-[10px] font-black uppercase ${isOpen ? 'text-blue-200' : 'text-blue-400'}`}>{type.substring(0,5)}</span>
                <span className="text-sm font-black">{c}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-2.5 rounded-xl text-center border ${isOpen ? 'bg-red-500/20 border-red-500/20 text-white' : 'bg-red-50 border-red-100 text-red-600'}`}><p className="text-[9px] font-black uppercase">Atr.</p><p className="text-lg font-black mt-1">{stats.delays}</p></div>
            <div className={`p-2.5 rounded-xl text-center border ${isOpen ? 'bg-emerald-500/20 border-emerald-500/20 text-white' : 'bg-emerald-50 border-emerald-100 text-emerald-600'}`}><p className="text-[9px] font-black uppercase">Concl.</p><p className="text-lg font-black mt-1">{stats.completed}</p></div>
            <div className={`p-2.5 rounded-xl text-center border ${isOpen ? 'bg-white/10 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><p className="text-[9px] font-black uppercase">Canc.</p><p className="text-lg font-black mt-1">{stats.canceled}</p></div>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%-1px)] left-0 right-0 bg-white border-2 border-blue-400 rounded-b-[2.5rem] shadow-2xl z-[160] animate-in slide-in-from-top-1 duration-300 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-2 shrink-0 relative z-[170]">
             <MultiCheckboxFilter label="Modalidades" options={allOpTypes} selectedOptions={selTypes} onChange={setSelTypes} />
             <RichEntityFilter label="Performance Clientes" stats={clientStats} selectedItems={selClients} onChange={setSelClients} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeWidth="2"/></svg>} />
             <RichEntityFilter label="Performance Equipe" stats={driverStats} selectedItems={selDrivers} onChange={setSelDrivers} icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2"/></svg>} />
          </div>
          <div className="overflow-y-auto custom-scrollbar p-5 space-y-3 flex-1 bg-slate-50/30 min-h-[300px] rounded-b-[2.5rem]">
            {displayTrips.map(trip => (
              <div key={trip.id} className={`p-4 border rounded-[2rem] shadow-sm flex items-center justify-between transition-all ${getTripItemStyle(trip.status)}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                     <div className={`w-1 h-1 rounded-full ${trip.status === 'Viagem concluída' ? 'bg-emerald-400' : 'bg-blue-400'}`}></div>
                  </div>
                  <h4 className="text-[11px] font-black uppercase truncate leading-none mt-1">{trip.driver.name}</h4>
                  <p className="text-[9px] font-bold opacity-60 uppercase mt-0.5 truncate">{trip.customer.name}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                   <span className="bg-slate-900 text-white px-2 py-1 rounded text-[9px] font-mono font-bold uppercase shadow-sm">{trip.driver.plateHorse}</span>
                   <span className="text-[8px] font-black uppercase mt-1.5 opacity-80">{trip.status}</span>
                </div>
              </div>
            ))}
            {displayTrips.length === 0 && (
              <div className="py-20 text-center opacity-30">
                 <p className="text-[10px] font-black uppercase tracking-widest">Sem viagens no filtro atual</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsToday;
