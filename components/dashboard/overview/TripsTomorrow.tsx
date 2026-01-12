
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsTomorrowProps {
  trips: Trip[];
}

const TripsTomorrow: React.FC<TripsTomorrowProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('en-CA');
  }, []);

  const tomorrowTrips = useMemo(() => {
    return trips.filter(t => t.dateTime.split('T')[0] === tomorrowStr);
  }, [trips, tomorrowStr]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
      <div className="p-6 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amanhã</p>
            <p className="text-4xl font-black text-slate-800 mt-1">{tomorrowTrips.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 text-xl">🌅</div>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase text-amber-600 hover:text-amber-700 transition-colors group"
        >
          {isOpen ? 'Ocultar Detalhes' : 'Ver Programação'}
          <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-50 bg-slate-50/50 max-h-64 overflow-y-auto custom-scrollbar animate-in slide-in-from-top duration-300">
          {tomorrowTrips.length > 0 ? (
            <div className="p-4 space-y-2">
              {tomorrowTrips.map(trip => (
                <div key={trip.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1 mb-1">
                    <span className="text-[10px] font-black text-amber-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">OS: {trip.os}</span>
                  </div>
                  <p className="text-[9px] font-black text-slate-800 uppercase truncate">{trip.driver.name}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate mt-1">Cliente: {trip.customer.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-[9px] font-bold text-slate-400 uppercase italic">Nada agendado para amanhã</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripsTomorrow;
