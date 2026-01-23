
import React, { useState, useMemo, useRef } from 'react';
import { Trip, User } from '../../types';
import { fileStorage } from '../../utils/fileStorage';
import { db } from '../../utils/storage';
import TripFolderCard from './docs/TripFolderCard';
import TripDocsOverviewModal from './docs/TripDocsOverviewModal';

interface DocumentsTabProps {
  userId: string;
  trips: Trip[];
  onUpdateTrip: (trip: Trip) => Promise<void>;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ userId, trips, onUpdateTrip }) => {
  const today = new Date().toLocaleDateString('en-CA');
  
  const [activeTab, setActiveTab] = useState<'pendentes' | 'concluidas' | 'canceladas'>('pendentes');
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchLogs, setBatchLogs] = useState<{ os: string, status: 'success' | 'error' | 'warning', message: string }[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const currentUser = useMemo(() => {
    const saved = sessionStorage.getItem('als_active_session');
    return saved ? JSON.parse(saved) as User : { id: userId, role: 'staff' } as User;
  }, [userId]);

  const processBatchFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingBatch(true);
    setBatchLogs([]);
    const filesArray = Array.from(files) as File[];
    const logs: typeof batchLogs = [];

    for (const file of filesArray) {
      const fileName = file.name.toUpperCase();
      const osMatch = fileName.match(/(\d*[A-Z]{2,3}\d*[A-Z]?)/);
      const detectedOS = osMatch ? osMatch[0] : null;

      if (!detectedOS) {
        logs.push({ os: file.name, status: 'error', message: 'OS não identificada no nome.' });
        continue;
      }

      const targetTrip = trips.find(t => t.os.toUpperCase() === detectedOS.toUpperCase());

      if (!targetTrip) {
        logs.push({ os: detectedOS, status: 'error', message: 'Viagem não localizada no sistema.' });
        continue;
      }

      // REGRA: Impedir duplicidade no lote
      if (targetTrip.completoDoc) {
        logs.push({ os: detectedOS, status: 'warning', message: 'Ignorado: Já possui documento vinculado.' });
        continue;
      }

      try {
        const url = await fileStorage.uploadTripDoc(file, targetTrip.os, 'COMPLETO');
        await onUpdateTrip({ 
          ...targetTrip, 
          completoDoc: { 
            id: `batch-${Date.now()}-${Math.random()}`, 
            type: 'COMPLETO', 
            url, 
            fileName: `DOSSIÊ - ${targetTrip.os}`, 
            uploadDate: new Date().toISOString() 
          } 
        });
        logs.push({ os: targetTrip.os, status: 'success', message: 'Documento vinculado com sucesso.' });
      } catch (err) {
        logs.push({ os: targetTrip.os, status: 'error', message: 'Erro no upload para o R2.' });
      }
    }

    setBatchLogs(logs);
    setIsProcessingBatch(false);
    if (batchInputRef.current) batchInputRef.current.value = '';
    window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
  };

  const filteredList = useMemo(() => {
    let list = trips;
    
    if (activeTab === 'pendentes') list = list.filter(t => t.status === 'Viagem concluída' && !t.completoDoc);
    else if (activeTab === 'concluidas') list = list.filter(t => t.status === 'Viagem concluída' && t.completoDoc);
    else list = list.filter(t => t.status === 'Viagem cancelada');

    if (startDate) list = list.filter(t => t.dateTime.substring(0, 10) >= startDate);
    if (endDate) list = list.filter(t => t.dateTime.substring(0, 10) <= endDate);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.os.toLowerCase().includes(q) || 
        t.driver.name.toLowerCase().includes(q) || 
        t.customer.name.toLowerCase().includes(q) ||
        (t.container && t.container.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
  }, [trips, activeTab, startDate, endDate, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between items-center gap-6">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit shrink-0">
          <button onClick={() => setActiveTab('pendentes')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pendentes' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Pendentes ({trips.filter(t => t.status === 'Viagem concluída' && !t.completoDoc).length})</button>
          <button onClick={() => setActiveTab('concluidas')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'concluidas' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Arquivados</button>
          <button onClick={() => setActiveTab('canceladas')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'canceladas' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Canceladas</button>
        </div>

        <div className="flex-1 w-full max-w-lg relative group">
           <input 
             type="text" 
             placeholder="BUSCAR NAS PASTAS (OS, MOTORISTA, CLIENTE)..." 
             className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
           <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
        </div>

        <div className="flex items-center gap-3 shrink-0">
           <div className="flex gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <input type="date" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
              <input type="date" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
           </div>
           
           <input type="file" multiple accept=".pdf" className="hidden" ref={batchInputRef} onChange={processBatchFiles} />
           <button 
             onClick={() => batchInputRef.current?.click()}
             disabled={isProcessingBatch}
             className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
             {isProcessingBatch ? 'Sincronizando...' : 'Importar Dossiês (Lote)'}
           </button>
        </div>
      </div>

      {batchLogs.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-500 shadow-2xl animate-in zoom-in-95">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Resultado da Importação</h3>
              <button onClick={() => setBatchLogs([])} className="text-slate-400 hover:text-red-500 font-black text-[10px] uppercase">Fechar Log</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
              {batchLogs.map((log, i) => (
                <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${log.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : log.status === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                   <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase truncate">{log.os}</p>
                      <p className="text-[7px] font-bold opacity-70 uppercase truncate">{log.message}</p>
                   </div>
                   {log.status === 'success' ? (
                     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                   ) : (
                     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M6 18L18 6M6 6l12 12"/></svg>
                   )}
                </div>
              ))}
           </div>
        </div>
      )}

      {/* GRID DE PASTAS OPERACIONAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredList.map(trip => (
          <TripFolderCard 
            key={trip.id} 
            trip={trip} 
            onClick={() => setSelectedTrip(trip)} 
          />
        ))}
        {filteredList.length === 0 && (
          <div className="col-span-full py-32 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/50">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2.5"/></svg>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhuma pasta localizada para o filtro atual</p>
          </div>
        )}
      </div>

      {selectedTrip && (
        <TripDocsOverviewModal 
          isOpen={!!selectedTrip} 
          onClose={() => setSelectedTrip(null)} 
          trip={selectedTrip} 
          user={currentUser} 
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
          }}
        />
      )}
    </div>
  );
};

export default DocumentsTab;
