
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsThisWeekProps {
  trips: Trip[];
}

const TripsThisWeek: React.FC<TripsThisWeekProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const filtered = trips.filter(t => {
      const d = new Date(t.dateTime);
      return d >= startOfWeek && d <= endOfWeek;
    }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    return filtered;
  }, [trips]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden transition-all duration-500">
      <div className="p-6 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esta Semana</p>
            <p className="text-4xl font-black text-slate-800 mt-1">{stats.length}</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 text-xl">🗓️</div>
        </div>
        
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-700 transition-colors group"
        >
          {isOpen ? 'Ocultar Detalhes' : 'Ver Semana'}
          <svg className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-slate-50 bg-slate-50/50 max-h-64 overflow-y-auto custom-scrollbar animate-in slide-in-from-top duration-300">
          {stats.length > 0 ? (
            <div className="p-4 space-y-2">
              {stats.map(trip => (
                <div key={trip.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-1 mb-1">
                    <span className="text-[9px] font-black text-indigo-600">
                      {new Date(trip.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})} - {new Date(trip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                    </span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">{trip.os}</span>
                  </div>
                  <p className="text-[9px] font-black text-slate-800 uppercase truncate">{trip.driver.name}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase truncate mt-0.5">{trip.customer.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-[9px] font-bold text-slate-400 uppercase italic">Nenhuma programação para esta semana</div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripsThisWeek;
