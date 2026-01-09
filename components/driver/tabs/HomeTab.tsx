
import React, { useMemo, useState, useRef } from 'react';
import { Trip, User, TripStatus, DriverCapturedDoc } from '../../../types';
import ScannerModal from '../ScannerModal';
import { db } from '../../../utils/storage';
import ImageViewer from '../../shared/ImageViewer';
import DriverDocsGallery from '../DriverDocsGallery';
import StatusConfirmModal from '../StatusConfirmModal';

interface HomeTabProps {
  user: User;
  trips: Trip[];
  onRefresh: () => Promise<void>;
}

const DEFAULT_STATUSES: TripStatus[] = [
  'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
  'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 
  'Chegou no destino', 'Devolução do cheio', 'Viagem concluída'
];

const VW_CRAGEA_STATUSES: { label: string; value: TripStatus }[] = [
  { label: 'Retirou o Cheio', value: 'Retirada do cheio' },
  { label: 'Chegou no Cragea', value: 'Chegou no Cragea' },
  { label: 'Aguardando Carregar', value: 'Aguardando carregar' },
  { label: 'Saiu do Cragea', value: 'Saiu do Cragea' },
  { label: 'Chegou na Volkswagen', value: 'Chegou na Volkswagen' },
  { label: 'Saiu da Volkswagen', value: 'Saiu da Volkswagen' },
  { label: 'Container sobre Rodas', value: 'Container sobre rodas' },
  { label: 'Baixa Cragea', value: 'Viagem concluída' },
];

const HomeTab: React.FC<HomeTabProps> = ({ user, trips, onRefresh }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [scannerInitialImage, setScannerInitialImage] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TripStatus | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seleciona a viagem ativa mais próxima
  const activeTrip = useMemo(() => {
    const sorted = [...trips]
      .filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    return sorted[0];
  }, [trips]);

  const safeFormatDate = (isoString: string) => {
    if (!isoString) return "--/--/----";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--/--/----";
    return d.toLocaleDateString('pt-BR');
  };

  const safeFormatTime = (isoString: string) => {
    if (!isoString) return "--:--";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--";
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const isVWCrageaTrip = useMemo(() => {
    if (!activeTrip) return false;
    const isVW = activeTrip.customer?.name?.toUpperCase().includes('VOLKSWAGEN') || 
                 activeTrip.customer?.legalName?.toUpperCase().includes('VOLKSWAGEN');
    const isCragea = activeTrip.destination?.name?.toUpperCase().includes('CRAGEA') || 
                     activeTrip.scheduling?.location?.toUpperCase().includes('CRAGEA');
    return isVW && isCragea;
  }, [activeTrip]);

  const handleStatusSelect = (status: TripStatus) => {
    if (isUpdating || activeTrip?.status === status) return;
    setPendingStatus(status);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmUpdate = async (dateTime: string) => {
    if (!activeTrip || !pendingStatus) return;

    setIsUpdating(true);
    const nowISO = new Date().toISOString();
    
    const updatedTrip: Trip = {
      ...activeTrip,
      status: pendingStatus,
      statusTime: dateTime,
      statusHistory: [
        { status: pendingStatus, dateTime: dateTime, createdAt: nowISO },
        ...(activeTrip.statusHistory || [])
      ]
    };

    try {
      const success = await db.saveTrip(updatedTrip, user);
      if (success) {
        await db.addNotification(user, 'STATUS_UPDATED', `OS ${activeTrip.os}: ${pendingStatus}`, `Posição atualizada via Portal Motorista.`, { os: activeTrip.os, motorista: user.displayName });
        setShowPicker(false);
        setIsConfirmModalOpen(false);
        setPendingStatus(null);
        await onRefresh();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsUpdating(true);
    await onRefresh();
    setTimeout(() => setIsUpdating(false), 1000);
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setScannerInitialImage(result);
        setIsScannerOpen(true);
      };
      reader.readAsDataURL(file);
    }
    // Reseta o input para permitir selecionar o mesmo arquivo novamente se necessário
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Programação em Curso</h2>
        <button onClick={handleManualRefresh} disabled={isUpdating} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-slate-400 active:scale-90 transition-all border border-white/5">
          <svg className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2.5"/></svg>
          <span className="text-[8px] font-black uppercase">Atualizar</span>
        </button>
      </div>

      {activeTrip ? (
        <div className="bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden">
          
          {/* TOPO: IDENTIFICAÇÃO E DATA */}
          <div className="p-8 pb-6 flex justify-between items-start border-b border-white/5 bg-slate-950/30">
            <div>
              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1.5">{activeTrip.type}</p>
              <h1 className="text-4xl font-black tracking-tighter text-white leading-none">OS {activeTrip.os}</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-white">{safeFormatDate(activeTrip.dateTime)}</p>
              <p className="text-[11px] text-blue-400 font-black mt-1.5 uppercase tracking-[0.2em]">
                {safeFormatTime(activeTrip.dateTime)}
              </p>
            </div>
          </div>

          {/* EQUIPAMENTO: CONTAINER EM DESTAQUE (IGUAL OPERACIONAL) */}
          <div className="px-8 py-8 bg-blue-600/10 border-y border-white/10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] block">Container Alocado</span>
              <p className="text-5xl font-mono font-black text-white leading-none tracking-tight">
                {activeTrip.container || 'A DEFINIR'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">
                {activeTrip.containerType || '40HC'}
              </span>
              {activeTrip.tara && <span className="text-[9px] font-bold text-slate-500 uppercase">Tara: {activeTrip.tara}</span>}
            </div>
          </div>

          {/* DOSSIÊ DO CLIENTE */}
          <div className="p-8 space-y-7">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Razão Social do Cliente</span>
                <p className="text-sm font-black text-white uppercase leading-tight">{activeTrip.customer.legalName || activeTrip.customer.name}</p>
              </div>

              {activeTrip.customer.legalName && activeTrip.customer.name !== activeTrip.customer.legalName && (
                <div className="space-y-1.5 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Nome Fantasia</span>
                  <p className="text-sm font-bold text-slate-200 uppercase italic leading-tight">{activeTrip.customer.name}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Localidade da Operação</span>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-blue-500 shadow-inner">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" strokeWidth="2.5"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>
                   </div>
                   <p className="text-xs font-black text-slate-300 uppercase tracking-tighter">
                     {activeTrip.customer.city} — {activeTrip.customer.state || 'SP'}
                   </p>
                </div>
              </div>
            </div>

            {/* AÇÕES DE CAMPO */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button onClick={() => { setScannerInitialImage(null); setIsScannerOpen(true); }} className="py-6 bg-blue-600 rounded-[2rem] flex flex-col items-center justify-center gap-3 active:scale-95 transition-all shadow-[0_20px_40px_rgba(37,99,235,0.3)]">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="3"/></svg>
                  <span className="text-[9px] font-black uppercase text-white tracking-[0.2em]">Câmera</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="py-6 bg-slate-800 rounded-[2rem] flex flex-col items-center justify-center gap-3 active:scale-95 transition-all border border-white/10 shadow-xl">
                  <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="3"/></svg>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Anexar</span>
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleGalleryUpload} />
            </div>

            {/* SELETOR DE STATUS OPERACIONAL */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <button 
                onClick={() => setShowPicker(!showPicker)}
                className="w-full bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all"
              >
                <div className="min-w-0 flex-1 pr-4 text-left">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Situação Operacional</p>
                  <p className="text-sm font-black uppercase mt-1.5 truncate text-blue-400">{activeTrip.status}</p>
                </div>
                <div className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase border transition-all ${showPicker ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-white/10 text-white hover:bg-slate-700'}`}>
                  {showPicker ? 'Recolher' : 'Atualizar'}
                </div>
              </button>
              
              {showPicker && (
                <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 duration-300">
                  {(isVWCrageaTrip ? VW_CRAGEA_STATUSES : DEFAULT_STATUSES.map(s => ({label: s, value: s}))).map((st: any) => (
                    <button 
                      key={st.value} 
                      disabled={isUpdating} 
                      onClick={() => handleStatusSelect(st.value)} 
                      className={`py-5 px-3 rounded-2xl text-[8px] font-black uppercase border transition-all ${activeTrip.status === st.value ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-inner' : 'bg-white/5 border-white/10 text-slate-400 active:bg-blue-600 active:text-white'}`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-32 bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-10">
           <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="3"/></svg>
           </div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Nenhuma programação localizada para hoje.</p>
           <button onClick={handleManualRefresh} className="mt-8 text-blue-500 font-black text-[10px] uppercase tracking-widest hover:underline px-8 py-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">Verificar Novamente</button>
        </div>
      )}

      {isScannerOpen && activeTrip && (
        <ScannerModal isOpen={isScannerOpen} onClose={() => { setIsScannerOpen(false); setScannerInitialImage(null); }} onSuccess={onRefresh} trip={activeTrip} user={user} initialImage={scannerInitialImage} />
      )}

      {isGalleryOpen && activeTrip && (
        <DriverDocsGallery isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} docs={activeTrip.driver_docs || []} os={activeTrip.os} />
      )}

      {isConfirmModalOpen && pendingStatus && (
        <StatusConfirmModal 
          isOpen={isConfirmModalOpen} 
          onClose={() => { setIsConfirmModalOpen(false); setPendingStatus(null); }}
          onConfirm={handleConfirmUpdate}
          status={pendingStatus}
          isSaving={isUpdating}
        />
      )}
    </div>
  );
};

export default HomeTab;
