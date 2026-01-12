
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsTomorrowProps {
  trips: Trip[];
}

const TripsTomorrow: React.FC<TripsTomorrowProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const tomorrowTrips = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const tomorrowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    return trips.filter(t => {
      const tripDate = t.dateTime.split('T')[0];
      return tripDate === tomorrowStr && t.status !== 'Viagem cancelada';
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-6 rounded-[2.2rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-amber-500 ring-4 ring-amber-500/5' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amanhã</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{tomorrowTrips.length}</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-50 text-amber-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <p className="mt-4 text-[9px] font-black uppercase text-amber-600 tracking-tighter flex items-center gap-2">
          {isOpen ? 'Recolher Lista' : 'Ver Programação'}
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[500px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Cargas Agendadas Amanhã</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[7px] font-black uppercase mr-4">{tomorrowTrips.length} Cargas</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3">
            {tomorrowTrips.length > 0 ? tomorrowTrips.map(trip => (
              <div key={trip.id} className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-amber-200 transition-all group">
                <div className="flex justify-between items-start mb-3">
                   <span className="text-sm font-black text-amber-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                   <span className="text-[9px] font-black text-slate-300">OS: {trip.os}</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-800 uppercase leading-none">{trip.driver.name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase truncate">{trip.customer.name}</p>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-[7px] font-black text-slate-300 uppercase">Container / BK</p>
                        <p className="text-[9px] font-mono font-black text-slate-700">{trip.container || '---'}</p>
                        <p className="text-[8px] font-bold text-amber-600">{trip.booking || '---'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-slate-300 uppercase">Destino</p>
                        <p className="text-[9px] font-black text-slate-700 uppercase truncate">{trip.destination?.name || trip.scheduling?.location || 'A DEFINIR'}</p>
                      </div>
                   </div>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Nada para amanhã com estes filtros</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsTomorrow;
