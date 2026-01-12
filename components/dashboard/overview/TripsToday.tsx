
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsTodayProps {
  trips: Trip[];
}

const TripsToday: React.FC<TripsTodayProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const todayTrips = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    return trips.filter(t => {
      const tripDate = t.dateTime.split('T')[0];
      return tripDate === todayStr && t.status !== 'Viagem cancelada';
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-6 rounded-[2.2rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-blue-500 ring-4 ring-blue-500/5' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Viagens Hoje</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-5xl font-black text-slate-800 tracking-tighter">{todayTrips.length}</p>
              {todayTrips.length > 0 && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>}
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <p className="mt-4 text-[9px] font-black uppercase text-blue-600 tracking-tighter flex items-center gap-2">
          {isOpen ? 'Recolher Detalhes' : 'Ver Programação'}
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[500px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Listagem Detalhada Hoje</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[7px] font-black uppercase mr-4">{todayTrips.length} Cargas</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-3">
            {todayTrips.length > 0 ? todayTrips.map(trip => (
              <div key={trip.id} className="p-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-blue-600">{new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[7px] font-black uppercase tracking-widest">{trip.type}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-300 group-hover:text-blue-400 transition-colors">OS: {trip.os}</span>
                </div>

                <div className="space-y-2">
                   <div className="flex flex-col">
                      <p className="text-[10px] font-black text-slate-800 uppercase">{trip.driver.name}</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 truncate">{trip.customer.name}</p>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                      <div>
                        <p className="text-[7px] font-black text-slate-300 uppercase">Container / Booking</p>
                        <p className="text-[9px] font-mono font-black text-slate-700">{trip.container || 'A DEFINIR'}</p>
                        <p className="text-[8px] font-bold text-blue-500">{trip.booking || 'S/ BK'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[7px] font-black text-slate-300 uppercase">Navio / Destino</p>
                        <p className="text-[9px] font-black text-slate-700 uppercase truncate">{trip.ship || 'A DEFINIR'}</p>
                        <p className="text-[8px] font-bold text-emerald-600 uppercase truncate">{trip.destination?.name || trip.scheduling?.location || 'A DEFINIR'}</p>
                      </div>
                   </div>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Nenhuma viagem filtrada para hoje</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsToday;
