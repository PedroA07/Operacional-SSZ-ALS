
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
    
    // Até Amanhã Final do Dia
    const endOfTomorrow = new Date(now);
    endOfTomorrow.setDate(now.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    return trips.filter(t => {
      if (!t.dateTime || t.status === 'Viagem cancelada') return false;
      
      const tripTime = new Date(t.dateTime).getTime();
      
      // Filtra apenas viagens do intervalo solicitado (Mês atual até amanhã)
      if (tripTime < startOfMonth.getTime() || tripTime > endOfTomorrow.getTime()) return false;

      const arrivalEvents = t.statusHistory?.filter(h => h.status === 'Chegou no cliente') || [];
      if (arrivalEvents.length === 0) {
        // Se ainda não chegou e já passou do horário agendado há mais de 10 min
        return new Date().getTime() > (new Date(t.dateTime).getTime() + 600000);
      }

      // Pega a PRIMEIRA chegada registrada
      const firstArrival = [...arrivalEvents].sort((a, b) => a.dateTime.localeCompare(b.dateTime))[0];
      const scheduled = new Date(t.dateTime).getTime();
      const actual = new Date(firstArrival.dateTime).getTime();
      
      return actual > (scheduled + 59000);
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
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Monitor de Atrasos Geral</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-5xl font-black text-red-600 tracking-tighter">{delayedList.length}</p>
              {delayedList.length > 0 && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>}
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-red-600 text-white shadow-lg' : 'bg-red-50 text-red-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <p className="mt-4 text-[9px] font-black uppercase text-slate-400 tracking-widest">
          {isOpen ? 'Recolher detalhes' : 'Ver ocorrências do mês'}
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[450px] flex flex-col">
          <div className="p-5 bg-red-50 border-b border-red-100 flex justify-between items-center">
            <span className="text-[9px] font-black text-red-700 uppercase tracking-widest ml-2">Incidências Acumuladas</span>
            <span className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[8px] font-black uppercase">{delayedList.length} OS</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3">
            {delayedList.length > 0 ? delayedList.map(trip => {
              const arrival = trip.statusHistory?.find(h => h.status === 'Chegou no cliente');
              const diffMin = arrival ? Math.round((new Date(arrival.dateTime).getTime() - new Date(trip.dateTime).getTime()) / 60000) : 0;
              const date = new Date(trip.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'});
              
              return (
                <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-2xl border-l-4 border-l-red-500 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{date}</span>
                       <p className="text-[10px] font-black text-slate-800 uppercase truncate flex-1">{trip.driver.name}</p>
                    </div>
                    <span className="text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                      {arrival ? `+${diffMin}m` : 'Pendente'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-50">
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase">OS / Placa</p>
                      <p className="text-[10px] font-black text-slate-700">{trip.os} • {trip.driver.plateHorse}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Horário Programado</p>
                      <p className="text-[10px] font-black text-blue-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px] italic">Sem ocorrências</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DelayedTrips;
