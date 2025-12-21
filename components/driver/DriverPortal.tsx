
import React, { useState, useEffect } from 'react';
import { User, Driver, Trip } from '../../types';
import { db } from '../../utils/storage';

interface DriverPortalProps {
  user: User;
  onLogout: () => void;
}

const DriverPortal: React.FC<DriverPortalProps> = ({ user, onLogout }) => {
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDriverView = async () => {
      if (user.driverId) {
        const drivers = await db.getDrivers();
        const me = drivers.find(d => d.id === user.driverId);
        if (me) setDriverData(me);
        
        // Em um sistema real, buscaríamos as viagens do banco filtradas pelo driverId
        // Iniciando como array vazio para remover dados fictícios
        setMyTrips([]);
      }
      setIsLoading(false);
    };
    loadDriverView();
  }, [user]);

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-slate-50 font-black text-blue-600 animate-pulse">CARREGANDO ROTA...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <header className="bg-blue-700 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[10px] font-black uppercase opacity-70">Bem-vindo, Motorista</p>
            <h1 className="text-xl font-black uppercase truncate max-w-[200px]">{driverData?.name || '---'}</h1>
          </div>
          <button onClick={onLogout} className="p-2 bg-white/10 rounded-xl"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5"/></svg></button>
        </div>
        <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
           <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 flex-shrink-0">
             <p className="text-[8px] font-black uppercase">Placa Cavalo</p>
             <p className="text-sm font-black font-mono">{driverData?.plateHorse || '---'}</p>
           </div>
           <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 flex-shrink-0">
             <p className="text-[8px] font-black uppercase">Placa Carreta</p>
             <p className="text-sm font-black font-mono">{driverData?.plateTrailer || '---'}</p>
           </div>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Minhas Viagens de Hoje</h2>
        
        {myTrips.length > 0 ? myTrips.map(trip => (
          <div key={trip.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">{trip.type}</span>
                <h3 className="text-lg font-black text-slate-800 mt-1">{trip.os}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase">{trip.customerName}</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-blue-600">{trip.container}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95">Abrir Ordem de Coleta (PDF)</button>
              <button className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95">Minuta Cheio (PDF)</button>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <p className="text-[9px] font-black text-slate-300 uppercase mb-3">Status da Operação</p>
              <div className="space-y-3">
                 <button className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group">
                    <span className="text-[10px] font-black text-slate-500 uppercase">1. Chegada no Cliente</span>
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>
                 </button>
                 <button className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase">2. Container Carregado</span>
                    <div className="w-6 h-6 rounded-full border-2 border-slate-200"></div>
                 </button>
              </div>
            </div>
          </div>
        )) : (
          <div className="bg-white/50 p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center space-y-3">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Nenhuma viagem atribuída para hoje.</p>
          </div>
        )}

        {driverData?.whatsappGroupLink && (
          <a href={driverData.whatsappGroupLink} target="_blank" className="block w-full p-6 bg-emerald-500 text-white rounded-3xl text-center shadow-xl">
             <p className="text-[10px] font-black uppercase opacity-70">Link Rápido</p>
             <p className="text-sm font-black uppercase">Abrir WhatsApp do Grupo</p>
          </a>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-slate-200 text-center">
         <p className="text-[9px] font-bold text-slate-400 uppercase">ALS Profissional v3.0 &bull; Suporte Operacional</p>
      </footer>
    </div>
  );
};

export default DriverPortal;
