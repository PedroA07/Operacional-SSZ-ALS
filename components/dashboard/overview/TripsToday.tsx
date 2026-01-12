
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsTodayProps {
  trips: Trip[];
}

const TripsToday: React.FC<TripsTodayProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const todayStr = new Date().toLocaleDateString('en-CA');

  const todayTrips = useMemo(() => {
    return trips.filter(t => t.dateTime.split('T')[0] === todayStr);
  }, [trips, todayStr]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
      <div className="p-6 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Viagens Hoje</p>
            <p className="text-4xl font-black text-slate-800 mt-1">{todayTrips.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600 text-xl">📅</div>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase text-blue-600 hover:text-blue-700 transition-colors group"
        >
          {isOpen ? 'Ocultar Detalhes' : 'Ver Programação'}
          <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-50 bg-slate-50/50 max-h-64 overflow-y-auto custom-scrollbar animate-in slide-in-from-top duration-300">
          {todayTrips.length > 0 ? (
            <div className="p-4 space-y-2">
              {todayTrips.map(trip => (
                <div key={trip.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1 mb-1">
                    <span className="text-[10px] font-black text-blue-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">OS: {trip.os}</span>
                  </div>
                  <p className="text-[9px] font-black text-slate-800 uppercase leading-none truncate">{trip.driver.name}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate mt-1">Cliente: {trip.customer.name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase truncate">Para: {trip.scheduling?.location || trip.destination?.name || 'A definir'}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-[9px] font-bold text-slate-400 uppercase italic">Nenhuma viagem para hoje</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripsToday;
