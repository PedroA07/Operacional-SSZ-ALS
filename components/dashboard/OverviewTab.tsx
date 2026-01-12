
import React, { useState, useMemo } from 'react';
import { Trip, Driver } from '../../types';
import TripsToday from './overview/TripsToday';
import TripsTomorrow from './overview/TripsTomorrow';
import TripsThisWeek from './overview/TripsThisWeek';
import DriverStatusCards from './overview/DriverStatusCards';

interface OverviewTabProps {
  trips: Trip[];
  drivers: Driver[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trips, drivers }) => {
  const [filterType, setFilterType] = useState('TODOS');
  const [filterClient, setFilterClient] = useState('TODOS');
  const [filterDest, setFilterDest] = useState('TODOS');

  // Extração de opções únicas para os filtros
  const clients = useMemo(() => Array.from(new Set(trips.map(t => t.customer.name))).sort(), [trips]);
  const destinations = useMemo(() => Array.from(new Set(trips.map(t => t.destination?.name || t.scheduling?.location).filter(Boolean))).sort(), [trips]);
  const types = ['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA', 'CABOTAGEM'];

  // Aplicação dos filtros globais
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      const matchType = filterType === 'TODOS' || t.type === filterType;
      const matchClient = filterClient === 'TODOS' || t.customer.name === filterClient;
      const destName = t.destination?.name || t.scheduling?.location || '';
      const matchDest = filterDest === 'TODOS' || destName === filterDest;
      return matchType && matchClient && matchDest;
    });
  }, [trips, filterType, filterClient, filterDest]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* BARRA DE FILTROS DO DASHBOARD */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-wrap items-end gap-6">
        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Operação</label>
          <select 
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="TODOS">TODAS MODALIDADES</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar Cliente</label>
          <select 
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all"
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
          >
            <option value="TODOS">TODOS OS CLIENTES</option>
            {clients.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[200px] space-y-2">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino / Terminal</label>
          <select 
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all"
            value={filterDest}
            onChange={e => setFilterDest(e.target.value)}
          >
            <option value="TODOS">TODOS OS DESTINOS</option>
            {destinations.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <button 
          onClick={() => { setFilterType('TODOS'); setFilterClient('TODOS'); setFilterDest('TODOS'); }}
          className="px-6 py-3 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase hover:bg-red-50 hover:text-red-500 transition-all"
        >
          Limpar
        </button>
      </div>

      {/* Grid de Viagens Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TripsToday trips={filteredTrips} />
        <TripsTomorrow trips={filteredTrips} />
        <TripsThisWeek trips={filteredTrips} />
      </div>

      {/* Grid de Status de Frota */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <DriverStatusCards trips={trips} drivers={drivers} />
      </div>

      {/* Informativo de Rodapé */}
      <div className="bg-blue-50/30 p-6 rounded-3xl border border-blue-100/50 flex items-center gap-4">
         <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
         </div>
         <div>
            <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Painel de Controle Inteligente</p>
            <p className="text-[8px] text-blue-800 opacity-60 font-bold uppercase mt-0.5 tracking-tighter">Os cards acima refletem os filtros selecionados em tempo real.</p>
         </div>
      </div>
    </div>
  );
};

export default OverviewTab;
