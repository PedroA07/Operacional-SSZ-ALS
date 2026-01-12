
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

    return trips.filter(t => {
      const d = new Date(t.dateTime);
      return d >= startOfWeek && d <= endOfWeek && t.status !== 'Viagem cancelada';
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips]);

  return (
    <div className="relative group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left bg-white p-6 rounded-[2.2rem] border transition-all duration-500 shadow-sm hover:shadow-xl ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/5' : 'border-slate-100'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Esta Semana</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-4xl font-black text-slate-800 tracking-tighter">{stats.length}</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl transition-all duration-500 ${isOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-50 text-indigo-600'}`}>
            <svg className={`w-6 h-6 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        <p className="mt-4 text-[9px] font-black uppercase text-indigo-600 tracking-tighter flex items-center gap-2">
          {isOpen ? 'Recolher Agenda' : 'Ver Semana'}
        </p>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[400px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Monitoramento Semanal</span>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[7px] font-black uppercase mr-4">{stats.length} Cargas</span>
          </div>
          <div className="overflow-y-auto custom-scrollbar p-4 space-y-2">
            {stats.length > 0 ? stats.map(trip => (
              <div key={trip.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all flex justify-between items-center">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-800 uppercase truncate">{trip.driver.name}</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{trip.customer.name}</p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-[8px] font-black text-indigo-600">{new Date(trip.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</p>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Sem programação semanal</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsThisWeek;
