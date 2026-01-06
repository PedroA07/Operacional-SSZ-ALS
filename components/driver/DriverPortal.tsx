
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Trip, Driver, TripStatus, TripDocument } from '../../types';
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
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{url: string, title: string} | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [allTrips, allDrivers] = await Promise.all([
        db.getTrips(),
        db.getDrivers()
      ]);

      // Filtra viagens pelo ID do motorista vinculado ao usuário e ordena por data decrescente (mais recente primeiro)
      const myTrips = allTrips
        .filter(t => t.driver.id === user.driverId)
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      
      setTrips(myTrips);

      const myData = allDrivers.find(d => d.id === user.driverId);
      if (myData) setDriver(myData);
    } catch (e) {
      console.error("Erro ao carregar dados do motorista:", e);
    } finally {
      setIsLoading(false);
    }
  }, [user.driverId]);

  useEffect(() => {
    loadData();
    // Refresh mais agressivo (30s) para captar novas viagens rapidamente
    const syncInterval = setInterval(loadData, 30000);
    const clockInterval = setInterval(() => {
      setSessionTime(timeUtils.calculateDuration(user.lastLogin));
    }, 1000);
    
    return () => {
      clearInterval(syncInterval);
      clearInterval(clockInterval);
    };
  }, [loadData, user.lastLogin]);

  const currentTrip = useMemo(() => {
    return trips.find(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
  }, [trips]);

  const allDocuments = useMemo(() => {
    const docs: {tripOs: string, doc: TripDocument}[] = [];
    trips.forEach(t => {
      if (t.osDoc) docs.push({ tripOs: t.os, doc: t.osDoc });
      if (t.agendamentoDoc) docs.push({ tripOs: t.os, doc: t.agendamentoDoc });
      if (t.cteDoc) docs.push({ tripOs: t.os, doc: t.cteDoc });
      if (t.completoDoc) docs.push({ tripOs: t.os, doc: t.completoDoc });
      if (t.cvaDoc) docs.push({ tripOs: t.os, doc: t.cvaDoc });
    });
    return docs;
  }, [trips]);

  const handleUpdateStatus = async (trip: Trip, nextStatus: TripStatus) => {
    if (isUpdatingStatus) return;
    if (!confirm(`Confirmar mudança de status para: ${nextStatus.toUpperCase()}?`)) return;

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
      alert("Erro ao sincronizar com a central. Verifique sua internet.");
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

  const openDoc = (url: string, title: string) => {
    setSelectedDoc({ url, title });
    setIsDocViewerOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617] text-white">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 animate-pulse">Sincronizando Frota ALS...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans select-none pb-28">
      {/* HEADER MOBILE ATUALIZADO COM PLACA DUPLA */}
      <header className="p-6 pt-12 flex justify-between items-center shrink-0 bg-slate-950/50 border-b border-white/5">
        <div>
           <div className="flex items-center gap-2 mb-1.5">
             <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sessionTime}</p>
           </div>
           <h1 className="text-xl font-black uppercase tracking-tight leading-none text-white">Olá, {user.displayName.split(' ')[0]}</h1>
           <div className="flex items-center gap-3 mt-2">
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter">Cavalo</span>
                <span className="text-[10px] font-mono font-black text-white leading-none">{driver?.plateHorse || '---'}</span>
              </div>
              <div className="w-[1px] h-4 bg-white/10"></div>
              <div className="flex flex-col">
                <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter">Carreta</span>
                <span className="text-[10px] font-mono font-black text-white leading-none">{driver?.plateTrailer || '---'}</span>
              </div>
           </div>
        </div>
        <div className="w-14 h-14 rounded-[1.3rem] bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-white/5">
          {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <span className="font-black text-blue-400 italic">ALS</span>}
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1 px-5 pt-8 overflow-y-auto custom-scrollbar">
        
        {activeTab === 'inicio' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* VIAGEM ATUAL EM DESTAQUE */}
            <section className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Viagem em Andamento</h2>
                {currentTrip && <span className="text-[7px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase animate-pulse">Monitorando</span>}
              </div>

              {currentTrip ? (
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl">
                  <div className="p-8 space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-4xl font-black tracking-tighter text-blue-500 leading-none">OS {currentTrip.os}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">{currentTrip.customer.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-black text-white">{currentTrip.container || '---'}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">{currentTrip.containerType}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-3xl p-5 border border-white/5 space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Local de Entrega</p>
                      <p className="text-sm font-black uppercase text-white leading-tight">{currentTrip.destination?.name || 'A DEFINIR'}</p>
                    </div>

                    <div className="bg-blue-600/10 rounded-3xl p-5 border border-blue-500/20 space-y-1">
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Status da Operação</p>
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
                            Avançar: {getNextStatus(currentTrip.status)}
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-20 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-10">
                   <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-600">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2"/></svg>
                   </div>
                   <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic leading-relaxed">Nenhuma viagem ativa.<br/>Aguarde nova programação.</p>
                </div>
              )}
            </section>

            {/* RESUMO RÁPIDO */}
            <section className="grid grid-cols-2 gap-4">
               <div className="bg-slate-900/50 p-6 rounded-[2.2rem] border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Total de Viagens</p>
                  <p className="text-3xl font-black text-white">{trips.length}</p>
               </div>
               <div className="bg-slate-900/50 p-6 rounded-[2.2rem] border border-white/5">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Docs Digitais</p>
                  <p className="text-3xl font-black text-blue-500">{allDocuments.length}</p>
               </div>
            </section>
          </div>
        )}

        {activeTab === 'viagens' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="flex justify-between items-center px-1">
                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Histórico de Programações</h2>
                <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Atualizado agora</p>
             </div>
             
             <div className="space-y-4">
                {trips.length > 0 ? trips.map((t, idx) => {
                  const isVeryRecent = idx === 0 && (new Date().getTime() - new Date(t.dateTime).getTime()) < 3600000;
                  
                  return (
                    <div key={t.id} className={`p-6 rounded-[2.2rem] border transition-all ${t.status === 'Viagem concluída' ? 'bg-slate-900/20 border-white/5 opacity-60' : isVeryRecent ? 'bg-blue-600/10 border-blue-500/50 ring-2 ring-blue-500/10' : 'bg-slate-900 border-white/10 shadow-lg'}`}>
                      <div className="flex justify-between items-start mb-4">
                         <div>
                           <div className="flex items-center gap-2">
                             <p className="text-lg font-black text-white uppercase">OS {t.os}</p>
                             {isVeryRecent && <span className="px-1.5 py-0.5 bg-blue-600 text-[6px] font-black text-white uppercase rounded">Nova</span>}
                           </div>
                           <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[180px]">{t.customer.name}</p>
                         </div>
                         <span className={`px-2.5 py-1 rounded-lg text-[7px] font-black uppercase ${t.status === 'Viagem concluída' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                           {t.status}
                         </span>
                      </div>
                      <div className="flex justify-between border-t border-white/5 pt-4">
                         <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-600 uppercase">Prog. Data</span>
                            <span className="text-[10px] font-bold text-slate-300">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
                         </div>
                         <div className="flex flex-col text-right">
                            <span className="text-[7px] font-black text-slate-600 uppercase">Equipamento</span>
                            <span className="text-[10px] font-mono font-bold text-blue-400">{t.container || '---'}</span>
                         </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-20 text-center text-slate-600 font-black uppercase text-[10px]">Nenhum registro encontrado</div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-10">
             <div className="text-center py-6">
                <h3 className="text-lg font-black uppercase">Meus Documentos</h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Acesso rápido aos arquivos das viagens</p>
             </div>
             
             <div className="space-y-3">
                {allDocuments.length > 0 ? allDocuments.map((item, idx) => (
                  <button 
                    key={`${item.doc.id}-${idx}`}
                    onClick={() => openDoc(item.doc.url, item.doc.fileName)}
                    className="w-full p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] flex items-center justify-between active:bg-blue-600 transition-all group"
                  >
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-blue-500 group-active:text-white">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2.5"/></svg>
                        </div>
                        <div className="text-left">
                          <p className="text-[11px] font-black text-white uppercase truncate max-w-[200px]">{item.doc.fileName}</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase group-active:text-blue-100">OS: {item.tripOs} • {new Date(item.doc.uploadDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                     </div>
                     <svg className="w-4 h-4 text-slate-700 group-active:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                  </button>
                )) : (
                  <div className="py-20 bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-white/5 text-center px-10">
                     <p className="text-[10px] font-black text-slate-600 uppercase italic">Nenhum arquivo digital disponível no momento.</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {activeTab === 'perfil' && (
           <div className="space-y-8 animate-in fade-in duration-500 pb-10">
              <div className="text-center space-y-4 pt-4">
                 <div className="relative inline-block">
                    <div className="w-28 h-28 rounded-[2.2rem] bg-slate-900 border border-white/10 mx-auto overflow-hidden shadow-2xl">
                       {user.photo ? <img src={user.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-blue-400 font-black text-4xl">{(user.displayName || user.username)[0]}</div>}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-[#020617] flex items-center justify-center">
                       <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                    </div>
                 </div>
                 <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">{user.displayName}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{user.role === 'motoboy' ? 'Motoboy Parceiro' : 'Motorista ALS'}</p>
                 </div>
              </div>

              <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-8 space-y-6 shadow-xl">
                 <div className="flex justify-between border-b border-white/5 pb-5">
                    <span className="text-[10px] font-black text-slate-500 uppercase">CPF</span>
                    <span className="text-[11px] font-bold text-white">{driver?.cpf || '---'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-5">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Cavalo</span>
                    <span className="text-[11px] font-black text-blue-500 font-mono uppercase">{driver?.plateHorse || '---'}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-5">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Carreta</span>
                    <span className="text-[11px] font-black text-blue-400 font-mono uppercase">{driver?.plateTrailer || '---'}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Status Portal</span>
                    <span className="text-[11px] font-black text-emerald-500 uppercase">Ativo / Conectado</span>
                 </div>
              </div>

              <div className="space-y-3 px-2">
                 <p className="text-[8px] font-black text-slate-600 uppercase text-center mb-6 leading-relaxed">
                   Problemas com seu acesso ou dados?<br/>Entre em contato com o suporte operacional da ALS.
                 </p>
                 <button onClick={onLogout} className="w-full py-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-3xl text-[10px] font-black uppercase tracking-widest active:bg-red-500 active:text-white transition-all shadow-lg">Encerrar Sessão no Dispositivo</button>
              </div>
           </div>
        )}

      </main>

      {/* NAVEGAÇÃO INFERIOR ESTILO IOS */}
      <nav className="fixed bottom-0 left-0 w-full h-24 bg-slate-950/90 backdrop-blur-3xl border-t border-white/10 flex items-center justify-around px-6 z-50 pb-4">
        <button onClick={() => setActiveTab('inicio')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'inicio' ? 'text-blue-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Início</span>
        </button>
        <button onClick={() => setActiveTab('viagens')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'viagens' ? 'text-blue-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Viagens</span>
        </button>
        <button onClick={() => setActiveTab('docs')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'docs' ? 'text-blue-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Docs</span>
        </button>
        <button onClick={() => setActiveTab('perfil')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'perfil' ? 'text-blue-500 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">Perfil</span>
        </button>
      </nav>

      {/* MODAL VISUALIZADOR DE DOCUMENTO */}
      {isDocViewerOpen && selectedDoc && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in duration-300">
           <div className="h-20 bg-slate-900 flex items-center justify-between px-6 shrink-0 border-b border-white/5">
              <div className="min-w-0">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest leading-none">Documento Digital</p>
                <p className="text-xs font-bold text-white uppercase truncate mt-1">{selectedDoc.title}</p>
              </div>
              <button 
                onClick={() => setIsDocViewerOpen(false)}
                className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white active:bg-red-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
           </div>
           <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center">
              {selectedDoc.url.startsWith('data:image') ? (
                <img src={selectedDoc.url} className="max-w-full max-h-full object-contain" />
              ) : (
                <iframe src={selectedDoc.url} className="w-full h-full border-none" title="Doc" />
              )}
           </div>
           <div className="p-6 bg-slate-900 border-t border-white/5 text-center">
              <p className="text-[9px] text-slate-500 font-black uppercase">ALS TRANSPORTES • DOSSIÊ DIGITAL SEGURO</p>
           </div>
        </div>
      )}
    </div>
  );
};

export default DriverPortal;
