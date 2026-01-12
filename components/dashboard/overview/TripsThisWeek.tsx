
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsThisWeekProps {
  trips: Trip[];
}

const TripsThisWeek: React.FC<TripsThisWeekProps> = ({ trips }) => {
  const [fType, setFType] = useState('TODOS');
  const [fClient, setFClient] = useState('TODOS');
  const [fDest, setFDest] = useState('TODOS');

  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    return trips.filter(t => {
      const d = new Date(t.dateTime);
      const matchDate = d >= startOfWeek && d <= endOfWeek && t.status !== 'Viagem cancelada';
      const matchType = fType === 'TODOS' || t.type === fType;
      const matchClient = fClient === 'TODOS' || t.customer.name === fClient;
      const dName = t.destination?.name || t.scheduling?.location || '';
      const matchDest = fDest === 'TODOS' || dName === fDest;
      return matchDate && matchType && matchClient && matchDest;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips, fType, fClient, fDest]);

  const clients = useMemo(() => Array.from(new Set(trips.map(t => t.customer.name))).sort(), [trips]);
  const destinations = useMemo(() => Array.from(new Set(trips.map(t => t.destination?.name || t.scheduling?.location).filter(Boolean))).sort(), [trips]);

  return (
    <div className="space-y-6">
      {/* BARRA DE FILTROS INTERNA SEMANA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-400" value={fType} onChange={e => setFType(e.target.value)}>
          <option value="TODOS">TODAS MODALIDADES</option>
          {['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-400" value={fClient} onChange={e => setFClient(e.target.value)}>
          <option value="TODOS">FILTRAR CLIENTE</option>
          {clients.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[9px] font-black uppercase outline-none focus:border-indigo-400" value={fDest} onChange={e => setFDest(e.target.value)}>
          <option value="TODOS">FILTRAR DESTINO</option>
          {destinations.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.length > 0 ? stats.map(trip => (
          <div key={trip.id} className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-200 transition-all group shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded">
                  {new Date(trip.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                </span>
                <span className="text-[10px] font-bold text-slate-700">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
              </div>
              <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">OS: {trip.os}</span>
            </div>
            
            <div className="space-y-3">
              <div className="min-w-0">
                <p className="text-[11px] font-black text-slate-800 uppercase truncate">{trip.driver.name}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 truncate">{trip.customer.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                  <div>
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Container / BK</p>
                    <p className="text-[10px] font-mono font-black text-slate-700 truncate">{trip.container || '---'}</p>
                    <p className="text-[8px] font-bold text-indigo-500 truncate">{trip.booking || '---'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Destino</p>
                    <p className="text-[10px] font-black text-slate-700 uppercase truncate">{trip.destination?.name || trip.scheduling?.location || '---'}</p>
                  </div>
               </div>

               {trip.scheduling && (
                 <div className="mt-2 p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex items-center justify-between">
                    <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Agendado: {new Date(trip.scheduling.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                 </div>
               )}
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-100">
            <p className="text-[10px] font-black text-slate-300 uppercase italic">Vazio com estes filtros</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripsThisWeek;
