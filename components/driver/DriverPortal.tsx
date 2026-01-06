
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Driver, TripStatus } from '../../types';
import { db } from '../../utils/storage';
import { timeUtils } from '../../utils/timeUtils';

interface DriverPortalProps {
  user: User;
  onLogout: () => void;
}

const DriverPortal: React.FC<DriverPortalProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'inicio' | 'viagens' | 'docs' | 'perfil'>('inicio');
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTime, setSessionTime] = useState('00:00:00');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const loadData = useCallback(async () => {
    const [allTrips, allDrivers] = await Promise.all([
      db.getTrips(),
      db.getDrivers()
    ]);

    // Filtra viagens destinadas a este motorista
    const myTrips = allTrips.filter(t => t.driver.id === user.driverId);
    setTrips(myTrips);

    // Busca dados cadastrais do motorista
    const myData = allDrivers.find(d => d.id === user.driverId);
    if (myData) setDriver(myData);

    setIsLoading(false);
  }, [user.driverId]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      setSessionTime(timeUtils.calculateDuration(user.lastLogin));
    }, 1000);
    return () => clearInterval(interval);
  }, [loadData, user.lastLogin]);

  // Identifica a viagem atual (a primeira que não está concluída ou cancelada)
  const currentTrip = useMemo(() => {
    return trips.find(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
  }, [trips]);

  const handleUpdateStatus = async (trip: Trip, nextStatus: TripStatus) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    
    try {
      const now = new Date().toISOString();
      const updatedTrip: Trip = {
        ...trip,
        status: nextStatus,
        statusTime: now,
        statusHistory: [
          { status: nextStatus, dateTime: now },
          ...(trip.statusHistory || [])
        ]
      };

      await db.saveTrip(updatedTrip, user);
      await loadData();
    } catch (e) {
      alert("Erro ao atualizar status. Tente novamente.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getNextStatus = (current: TripStatus): TripStatus | null => {
    const flow: TripStatus[] = [
      'Pendente', 
      'Retirada de vazio', 
      'Em viagem', 
      'Chegou no cliente', 
      'Pegou NF', 
      'Saiu do cliente', 
      'Chegou no destino', 
      'Devolução do cheio', 
      'Viagem concluída'
    ];
    const idx = flow.indexOf(current);
    if (idx !== -1 && idx < flow.length - 1) return flow[idx + 1];
    return null;
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse text-blue-500">Sincronizando Rota...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans select-none pb-32">
      {/* HEADER FIXO */}
      <header className="p-6 pt-10 flex justify-between items-start shrink-0">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
             <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Sessão Ativa: {sessionTime}</p>
           </div>
           <h1 className="text-2xl font-black uppercase tracking-tight leading-tight">Olá, {user.displayName.split(' ')[0]}</h1>
           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Placa: {driver?.plateHorse || '---'}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
          {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <span className="font-black text-blue-400 italic">ALS</span>}
        </div>
      </header>

      {/* CONTEÚDO DINÂMICO POR ABAS */}
      <main className="flex-1 px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {activeTab === 'inicio' && (
          <>
            {/* CARD DE VIAGEM ATUAL */}
            <section className="space-y-4">
              <div className="flex justify-between items-end">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Viagem Atual</h2>
                {currentTrip && <span className="text-[8px] font-black bg-blue-600 text-white px-3 py-1 rounded-full uppercase">Em Andamento</span>}
              </div>

              {currentTrip ? (
                <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-4xl font-black tracking-tighter text-blue-500">OS {currentTrip.os}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{currentTrip.customer.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-black text-white">{currentTrip.container || '---'}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase">{currentTrip.containerType || '40HC'}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status Atual</p>
                      <p className="text-lg font-black uppercase text-white">{currentTrip.status}</p>
                    </div>

                    {getNextStatus(currentTrip.status) && (
                      <button 
                        disabled={isUpdatingStatus}
                        onClick={() => handleUpdateStatus(currentTrip, getNextStatus(currentTrip.status)!)}
                        className="w-full py-6 bg-blue-600 text-white rounded-[1.8rem] text-xs font-black uppercase tracking-widest shadow-[0_15px_30px_rgba(37,99,235,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3"
                      >
                        {isUpdatingStatus ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <>
                            Avançar para: {getNextStatus(currentTrip.status)}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  <div className="bg-slate-950 p-6 flex justify-between items-center border-t border-white/5">
                    <div>
                       <p className="text-[8px] font-black text-slate-500 uppercase">Destino</p>
                       <p className="text-[11px] font-bold text-white uppercase">{currentTrip.destination?.name || 'A Definir'}</p>
                    </div>
                    <button className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-500">
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2"/></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-20 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-10">
                   <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2"/></svg>
                   </div>
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Aguardando nova programação da central</p>
                </div>
              )}
            </section>

            {/* ATALHOS RÁPIDOS */}
            <section className="grid grid-cols-2 gap-4">
               <button onClick={() => setActiveTab('viagens')} className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 text-left active:bg-blue-600 transition-colors group">
                 <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-active:bg-white/20">
                   <svg className="w-5 h-5 text-blue-500 group-active:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeWidth="2.5"/></svg>
                 </div>
                 <p className="text-[11px] font-black uppercase leading-tight">Ver Todas<br/>Viagens</p>
                 <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase group-active:text-blue-100">{trips.length} Total</p>
               </button>
               <button onClick={() => setActiveTab('docs')} className="bg-slate-900 p-6 rounded-[2rem] border border-white/5 text-left active:bg-emerald-600 transition-colors group">
                 <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center mb-4 group-active:bg-white/20">
                   <svg className="w-5 h-5 text-emerald-500 group-active:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
                 </div>
                 <p className="text-[11px] font-black uppercase leading-tight">Central de<br/>Documentos</p>
                 <p className="text-[8px] font-bold text-slate-500 mt-1 uppercase group-active:text-emerald-100">PDFs Disponíveis</p>
               </button>
            </section>
          </>
        )}

        {activeTab === 'viagens' && (
          <div className="space-y-6">
             <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Histórico de Viagens</h2>
             <div className="space-y-4">
                {trips.map(t => (
                  <div key={t.id} className={`p-6 rounded-[2rem] border ${t.status === 'Viagem concluída' ? 'bg-slate-900/30 border-white/5 opacity-60' : 'bg-slate-900 border-blue-500/20 shadow-lg'} flex flex-col gap-4`}>
                    <div className="flex justify-between items-start">
                       <div>
                         <p className="text-lg font-black text-white uppercase">OS {t.os}</p>
                         <p className="text-[9px] font-bold text-slate-400 uppercase">{t.customer.name}</p>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${t.status === 'Viagem concluída' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                         {t.status}
                       </span>
                    </div>
                    <div className="flex justify-between border-t border-white/5 pt-4">
                       <p className="text-[9px] font-bold text-slate-500 uppercase">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</p>
                       <p className="text-[9px] font-mono text-slate-300">{t.container}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6 text-center pt-10">
             <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-blue-500 mb-6 border border-white/5">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2"/></svg>
             </div>
             <h3 className="text-lg font-black uppercase">Documentação Digital</h3>
             <p className="text-xs text-slate-500 leading-relaxed px-10">Os arquivos das suas viagens (OC e Minutas) são gerados pela central e aparecerão aqui automaticamente após a emissão.</p>
             <div className="space-y-3 pt-6">
                {trips.filter(t => t.ocFormData).map(t => (
                  <div key={t.id} className="p-4 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-between">
                     <div className="text-left">
                       <p className="text-[10px] font-black text-white uppercase">Ordem de Coleta - OS {t.os}</p>
                       <p className="text-[8px] text-slate-500 uppercase">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</p>
                     </div>
                     <button className="text-blue-500 font-black text-[9px] uppercase border border-blue-500/20 px-3 py-1.5 rounded-lg">Abrir</button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'perfil' && (
           <div className="space-y-8 pt-6">
              <div className="text-center space-y-4">
                 <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-white/10 mx-auto overflow-hidden">
                    {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-400 font-black text-3xl">{(user.displayName || user.username)[0]}</div>}
                 </div>
                 <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">{user.displayName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{user.role === 'motoboy' ? 'Motoboy Parceiro' : 'Motorista Profissional'}</p>
                 </div>
              </div>

              <div className="bg-slate-900/50 rounded-[2rem] border border-white/5 p-8 space-y-6">
                 <div className="flex justify-between border-b border-white/5 pb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase">CPF</span>
                    <span className="text-[10px] font-bold text-white">{driver?.cpf || '---'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Placa Cavalo</span>
                    <span className="text-[10px] font-bold text-blue-500 font-mono">{driver?.plateHorse || '---'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase">WhatsApp</span>
                    <span className="text-[10px] font-bold text-white">{driver?.phone || '---'}</span>
                 </div>
              </div>

              <button onClick={onLogout} className="w-full py-5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest active:bg-red-500 active:text-white transition-all">Sair do Portal</button>
           </div>
        )}

      </main>

      {/* NAVEGAÇÃO INFERIOR */}
      <nav className="fixed bottom-0 left-0 w-full h-24 bg-slate-950/80 backdrop-blur-2xl border-t border-white/5 flex items-center justify-around px-8 z-50">
        <button onClick={() => setActiveTab('inicio')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'inicio' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Início</span>
        </button>
        <button onClick={() => setActiveTab('viagens')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'viagens' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Viagens</span>
        </button>
        <button onClick={() => setActiveTab('docs')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'docs' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Docs</span>
        </button>
        <button onClick={() => setActiveTab('perfil')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'perfil' ? 'text-blue-500' : 'text-slate-600'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Perfil</span>
        </button>
      </nav>
    </div>
  );
};

export default DriverPortal;
