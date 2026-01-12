
import React, { useState, useMemo } from 'react';
import { Trip } from '../../../types';

interface TripsTomorrowProps {
  trips: Trip[];
}

const TripsTomorrow: React.FC<TripsTomorrowProps> = ({ trips }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [fType, setFType] = useState('TODOS');
  const [fClient, setFClient] = useState('TODOS');
  
  const tomorrowTrips = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    // Fix: Removed unused tomorrowStr which referenced undefined 'now' and caused errors
    const realTomorrowStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return trips.filter(t => {
      const tripDate = t.dateTime.split('T')[0];
      const matchDate = tripDate === realTomorrowStr && t.status !== 'Viagem cancelada';
      const matchType = fType === 'TODOS' || t.type === fType;
      const matchClient = fClient === 'TODOS' || t.customer.name === fClient;
      return matchDate && matchType && matchClient;
    }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [trips, fType, fClient]);

  const clients = useMemo(() => Array.from(new Set(trips.map(t => t.customer.name))).sort(), [trips]);

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
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-4 duration-500 max-h-[600px] flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex gap-2">
            <select className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-[8px] font-black uppercase outline-none" value={fType} onChange={e => setFType(e.target.value)}>
              <option value="TODOS">MODALIDADE</option>
              {['EXPORTAÇÃO', 'IMPORTAÇÃO', 'COLETA', 'ENTREGA'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <select className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-[8px] font-black uppercase outline-none" value={fClient} onChange={e => setFClient(e.target.value)}>
              <option value="TODOS">CLIENTE</option>
              {clients.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
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
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{trip.customer.name}</p>
                  
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

                   {trip.scheduling && (
                     <div className="mt-2 p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                        <div>
                          <p className="text-[7px] font-black text-amber-600 uppercase tracking-widest">Agendamento Programado</p>
                          <p className="text-[10px] font-black text-amber-800 uppercase">{new Date(trip.scheduling.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})} - {trip.scheduling.location}</p>
                        </div>
                     </div>
                   )}
                </div>
              </div>
            )) : (
              <div className="py-12 text-center">
                <p className="text-[9px] font-black text-slate-300 uppercase italic">Vazio para amanhã</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsTomorrow;
