
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface DelayedTripsProps {
  trips: Trip[];
}

const DelayedTrips: React.FC<DelayedTripsProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Calcula atrasos para Ontem, Hoje, Amanhã, Semana e Mês
  const delayedList = useMemo(() => {
    const now = new Date();
    
    // Início do Mês Atual (Local)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    // Até Amanhã Final do Dia
    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(now.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    return trips.filter(t => {
      if (!t.dateTime || t.status === 'Viagem cancelada') return false;
      
      const tripTime = new Date(t.dateTime).getTime();
      
      // Filtra apenas viagens do mês atual até amanhã
      if (tripTime < startOfMonth.getTime() || tripTime > endOfTomorrow.getTime()) return false;

      const arrivalEvents = t.statusHistory?.filter(h => h.status === 'Chegou no cliente') || [];
      const scheduled = new Date(t.dateTime).getTime();

      if (arrivalEvents.length === 0) {
        // Se ainda não chegou e o horário agendado já passou há mais de 10 min
        return new Date().getTime() > (scheduled + 600000);
      }

      // Pega a PRIMEIRA chegada registrada
      const firstArrival = [...arrivalEvents].sort((a, b) => a.dateTime.localeCompare(b.dateTime))[0];
      const actual = new Date(firstArrival.dateTime).getTime();
      
      return actual > (scheduled + 59000);
    }).sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [trips]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-8 rounded-[2.5rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-red-500 ring-4 ring-red-500/5' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest">Alerta de Atrasos</p>
            <div className="flex items-baseline gap-3 mt-2">
              <p className="text-6xl font-black text-red-600 tracking-tighter">{delayedList.length}</p>
              {delayedList.length > 0 && <div className="w-3 h-3 rounded-full bg-red-500 animate-ping shadow-[0_0_10px_red]"></div>}
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600'}`}>
            <svg className={`w-7 h-7 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <p className="mt-6 text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          {isOpen ? 'Recolher detalhes' : 'Ver ocorrências acumuladas'}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 8l4 4m0 0l-4 4m4-4H3" strokeWidth="3"/></svg>
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-slate-100 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.2)] z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[550px] flex flex-col">
          <div className="p-6 bg-red-50 border-b border-red-100 flex justify-between items-center">
            <span className="text-xs font-black text-red-700 uppercase tracking-widest ml-2">Histórico do Mês</span>
            <span className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase">{delayedList.length} Ocorrências</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-6 space-y-4">
            {delayedList.length > 0 ? delayedList.map(trip => {
              const arrival = trip.statusHistory?.find(h => h.status === 'Chegou no cliente');
              const diffMin = arrival ? Math.round((new Date(arrival.dateTime).getTime() - new Date(trip.dateTime).getTime()) / 60000) : 0;
              const date = new Date(trip.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
              
              return (
                <div key={trip.id} className="p-5 bg-white border border-slate-100 rounded-3xl border-l-[6px] border-l-red-500 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded-lg font-mono">{date}</span>
                       <p className="text-sm font-black text-slate-800 uppercase truncate">{trip.driver.name}</p>
                    </div>
                    <span className="text-xs font-black text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
                      {arrival ? `+${diffMin} min` : 'Em atraso'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">OS / Identificação</p>
                      <p className="text-xs font-black text-slate-700 mt-0.5">{trip.os} • {trip.driver.plateHorse}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Agendamento</p>
                      <p className="text-xs font-black text-blue-600 mt-0.5">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-20 text-center text-slate-300 font-black uppercase text-xs italic">Sem registros de atraso</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DelayedTrips;
