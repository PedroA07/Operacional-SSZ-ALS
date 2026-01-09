
import React, { useMemo, useState, useCallback, useRef } from 'react';
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
  const [activePhoto, setActivePhoto] = useState<DriverCapturedDoc | null>(null);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TripStatus | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // REGRA: A operação atual deve ser a programação MAIS ANTIGA que não está concluída ou cancelada
  const activeTrip = useMemo(() => {
    const activeList = [...trips]
      .filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada')
      // Ordenação crescente por tempo (o menor timestamp = mais antigo = deve ser feito primeiro)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    
    return activeList[0];
  }, [trips]);

  const isVWCrageaTrip = useMemo(() => {
    if (!activeTrip) return false;
    const isVW = activeTrip.customer?.name?.toUpperCase().includes('VOLKSWAGEN');
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
    // A data retornada pelo modal já deve estar em ISO
    const eventISO = new Date(dateTime).toISOString();
    
    const updatedTrip: Trip = {
      ...activeTrip,
      status: pendingStatus,
      statusTime: eventISO,
      statusHistory: [
        { 
          status: pendingStatus, 
          dateTime: eventISO, 
          createdAt: nowISO 
        },
        ...(activeTrip.statusHistory || [])
      ]
    };

    try {
      const success = await db.saveTrip(updatedTrip, user);
      
      if (success) {
        await db.addNotification(user, 'STATUS_UPDATED', `OS ${activeTrip.os}: ${pendingStatus}`, `Posição atualizada para ${pendingStatus}.`, { os: activeTrip.os, motorista: user.displayName });
        setShowPicker(false);
        setIsConfirmModalOpen(false);
        setPendingStatus(null);
        await onRefresh();
      } else {
        alert("Falha ao sincronizar com o banco de dados.");
      }
    } catch (e) { 
      console.error("Erro ao atualizar status:", e);
      alert("Erro técnico ao salvar posição."); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const handleManualRefresh = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsUpdating(false), 1000);
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setScannerInitialImage(ev.target?.result as string);
        setIsScannerOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Minha Viagem Atual</h2>
        <button 
          onClick={handleManualRefresh} 
          disabled={isUpdating}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white/5 rounded-xl text-slate-400 active:scale-90 transition-all border border-white/5 ${isUpdating ? 'opacity-50' : ''}`}
        >
          <svg className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2.5"/></svg>
          <span className="text-[8px] font-black uppercase tracking-widest">{isUpdating ? 'Sincronizando...' : 'Atualizar Dados'}</span>
        </button>
      </div>

      {activeTrip ? (
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl p-7 space-y-6">
          <div className="flex justify-between items-start border-b border-white/5 pb-5">
            <div>
              <p className="text-3xl font-black tracking-tighter text-blue-500 leading-none">OS {activeTrip.os}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 leading-tight">{activeTrip.customer.name}</p>
            </div>
            <div className="text-right">
              {/* Exibição forçada de data e hora em fuso local brasileiro */}
              <p className="text-[10px] font-black text-white">{new Date(activeTrip.dateTime).toLocaleDateString('pt-BR')}</p>
              <p className="text-[11px] text-blue-400 font-black uppercase mt-1">
                {new Date(activeTrip.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button onClick={() => { setScannerInitialImage(null); setIsScannerOpen(true); }} className="py-5 bg-blue-600 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all shadow-xl">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2.5"/></svg>
                <span className="text-[8px] font-black uppercase text-white tracking-widest">Usar Câmera</span>
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="py-5 bg-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-95 transition-all border border-white/5 shadow-xl">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2.5"/></svg>
                <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest">Anexar Doc</span>
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleGalleryUpload} />
          </div>

          <div className="space-y-4 pt-2">
            <button 
              onClick={() => setShowPicker(!showPicker)}
              className="w-full bg-white/5 rounded-3xl p-5 border border-white/5 flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <div className="min-w-0 flex-1 pr-4 text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Posição Atual</p>
                <p className="text-sm font-black uppercase mt-1 truncate text-blue-400">{activeTrip.status}</p>
              </div>
              <div className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${showPicker ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-white/10 text-white group-hover:bg-slate-700'}`}>
                {showPicker ? 'Fechar' : 'Alterar'}
              </div>
            </button>
            
            {showPicker && (
              <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-4 duration-300">
                {(isVWCrageaTrip ? VW_CRAGEA_STATUSES : DEFAULT_STATUSES.map(s => ({label: s, value: s}))).map((st: any) => (
                  <button 
                    key={st.value} 
                    disabled={isUpdating} 
                    onClick={() => handleStatusSelect(st.value)} 
                    className={`py-4 px-2 rounded-2xl text-[8px] font-black uppercase tracking-tighter border transition-all ${activeTrip.status === st.value ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400 active:bg-blue-600 active:text-white'}`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-24 bg-slate-900/30 rounded-[2.5rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-center px-8">
           <svg className="w-12 h-12 text-slate-700 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2.5"/></svg>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">Nenhuma programação ativa localizada.</p>
           <button onClick={handleManualRefresh} className="mt-6 text-blue-500 font-bold text-[9px] uppercase hover:underline">Verificar agora</button>
        </div>
      )}

      {isScannerOpen && activeTrip && (
        <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onSuccess={onRefresh} trip={activeTrip} user={user} initialImage={scannerInitialImage} />
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

      {activePhoto && (
        <div className="fixed inset-0 z-[5000] bg-black flex flex-col animate-in fade-in">
           <header className="h-16 bg-slate-950 border-b border-white/10 flex items-center justify-between px-6 shrink-0 pt-4">
              <p className="text-[10px] font-black text-white uppercase tracking-widest">Visualizar Captura</p>
              <button onClick={() => setActivePhoto(null)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg></button>
           </header>
           <div className="flex-1 overflow-hidden p-4"><ImageViewer url={activePhoto.url} /></div>
        </div>
      )}
    </div>
  );
};

export default HomeTab;
