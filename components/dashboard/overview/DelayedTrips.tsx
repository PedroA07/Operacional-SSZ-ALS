
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface DelayedTripsProps {
  trips: Trip[];
}

const DelayedTrips: React.FC<DelayedTripsProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);

  const delayedList = useMemo(() => {
    return trips.filter(t => {
      if (t.status === 'Viagem cancelada') return false;
      
      // Busca no histórico se houve o evento de chegada
      const arrivalEvent = t.statusHistory?.find(h => h.status === 'Chegou no cliente');
      if (!arrivalEvent) return false;

      const scheduled = new Date(t.dateTime);
      const actual = new Date(arrivalEvent.dateTime);
      
      // Atraso = Chegada > Programação
      return actual.getTime() > scheduled.getTime();
    }).sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [trips]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-6 rounded-[2.2rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-red-500 ring-4 ring-red-500/5' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Atrasos (KPI)</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-5xl font-black text-red-600 tracking-tighter">{delayedList.length}</p>
              {delayedList.length > 0 && <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>}
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <p className="mt-4 text-[9px] font-black uppercase text-red-600 tracking-tighter">
          {isOpen ? 'Ocultar Ocorrências' : 'Ver Ocorrências'}
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[400px] flex flex-col">
          <div className="p-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
            <span className="text-[9px] font-black text-red-700 uppercase tracking-widest ml-4">Chegadas Atrasadas</span>
            <span className="px-2 py-0.5 bg-red-600 text-white rounded text-[7px] font-black uppercase mr-4">{delayedList.length} Viagens</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3">
            {delayedList.length > 0 ? delayedList.map(trip => {
              const arrival = trip.statusHistory?.find(h => h.status === 'Chegou no cliente');
              const diff = arrival ? Math.round((new Date(arrival.dateTime).getTime() - new Date(trip.dateTime).getTime()) / 60000) : 0;
              
              return (
                <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-2xl border-l-4 border-l-red-500">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-slate-800 uppercase truncate flex-1">{trip.driver.name}</p>
                    <span className="text-[8px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded">+{diff} MIN</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50">
                    <div>
                      <p className="text-[7px] font-black text-slate-300 uppercase">Programado</p>
                      <p className="text-[9px] font-bold text-slate-500">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[7px] font-black text-slate-300 uppercase">Chegada Real</p>
                      <p className="text-[9px] font-black text-red-600">{arrival ? new Date(arrival.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '---'}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Nenhum atraso crítico</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DelayedTrips;
