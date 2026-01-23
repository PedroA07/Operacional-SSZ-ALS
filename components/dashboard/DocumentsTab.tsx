
import React, { useState, useMemo, useRef } from 'react';
import { Trip, TripDocument, User } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { fileStorage } from '../../utils/fileStorage';
import { db } from '../../utils/storage';
import FullDocManagerModal from './operations/FullDocManagerModal';

interface DocumentsTabProps {
  userId: string;
  trips: Trip[];
  onUpdateTrip: (trip: Trip) => Promise<void>;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ userId, trips, onUpdateTrip }) => {
  const today = new Date().toLocaleDateString('en-CA');
  
  const [activeTab, setActiveTab] = useState<'pendentes' | 'concluidas' | 'canceladas'>('pendentes');
  const [activeCategory, setActiveCategory] = useState<string>('GERAL');
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchLogs, setBatchLogs] = useState<{ os: string, status: 'success' | 'error' | 'warning', message: string }[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const [selectedTripForDoc, setSelectedTripForDoc] = useState<Trip | null>(null);

  const currentUser = useMemo(() => {
    const saved = sessionStorage.getItem('als_active_session');
    return saved ? JSON.parse(saved) as User : { id: userId, role: 'staff' } as User;
  }, [userId]);

  const categories = useMemo(() => {
    const cats = new Set(trips.map(t => t.category).filter(Boolean));
    return ['GERAL', ...Array.from(cats)];
  }, [trips]);

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

      // REGRA: Evitar duplicata se já existir documento
      if (targetTrip.completoDoc) {
        logs.push({ os: detectedOS, status: 'warning', message: 'Ignorado: Já possui documento vinculado.' });
        continue;
      }

      try {
        const url = await fileStorage.uploadTripDoc(file, targetTrip.os, 'COMPLETO');
        const doc: TripDocument = { 
          id: `batch-${Date.now()}-${Math.random()}`, 
          type: 'COMPLETO', 
          url: url, 
          fileName: `DOSSIÊ - ${targetTrip.os}`, 
          uploadDate: new Date().toISOString() 
        };
        
        await onUpdateTrip({ ...targetTrip, completoDoc: doc });
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

  const pendingTrips = useMemo(() => {
    let list = trips.filter(t => t.status === 'Viagem concluída' && !t.completoDoc);
    if (startDate) list = list.filter(t => t.dateTime.substring(0, 10) >= startDate);
    if (endDate) list = list.filter(t => t.dateTime.substring(0, 10) <= endDate);
    return list;
  }, [trips, startDate, endDate]);

  const finishedTrips = useMemo(() => {
    let list = trips.filter(t => t.status === 'Viagem concluída' && t.completoDoc);
    if (activeCategory !== 'GERAL') list = list.filter(t => t.category === activeCategory);
    if (startDate) list = list.filter(t => t.dateTime.substring(0, 10) >= startDate);
    if (endDate) list = list.filter(t => t.dateTime.substring(0, 10) <= endDate);
    return list;
  }, [trips, activeCategory, startDate, endDate]);

  const canceledTrips = useMemo(() => {
    let list = trips.filter(t => t.status === 'Viagem cancelada');
    if (startDate) list = list.filter(t => t.dateTime.substring(0, 10) >= startDate);
    if (endDate) list = list.filter(t => t.dateTime.substring(0, 10) <= endDate);
    return list;
  }, [trips, startDate, endDate]);

  const commonColumns = [
    { key: 'os', label: 'Nº OS', render: (t: Trip) => <span className="font-black text-blue-600">{t.os}</span> },
    { key: 'dateTime', label: 'Data Viagem', render: (t: Trip) => <span className="font-bold">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span> },
    { key: 'driver', label: 'Motorista', render: (t: Trip) => <span className="uppercase font-bold text-slate-700">{t.driver.name}</span> },
    { key: 'equipment', label: 'Equipamento', render: (t: Trip) => <span className="font-mono font-black">{t.container}</span> },
    { key: 'customer', label: 'Cliente', render: (t: Trip) => <span className="uppercase font-bold text-[9px]">{t.customer.name}</span> },
    { key: 'category', label: 'Categoria', render: (t: Trip) => <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-black uppercase">{t.category}</span> }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('pendentes')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pendentes' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Pendentes ({pendingTrips.length})</button>
          <button onClick={() => setActiveTab('concluidas')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'concluidas' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Arquivados ({finishedTrips.length})</button>
          <button onClick={() => setActiveTab('canceladas')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'canceladas' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Canceladas</button>
        </div>

        <div className="flex items-center gap-3">
           <input type="file" multiple accept=".pdf" className="hidden" ref={batchInputRef} onChange={processBatchFiles} />
           <button 
             onClick={() => batchInputRef.current?.click()}
             disabled={isProcessingBatch}
             className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
             {isProcessingBatch ? 'Sincronizando Lote...' : 'Importar Dossiês (OS)'}
           </button>
        </div>

        <div className="flex gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
           <div className="space-y-1">
              <label className="text-[7px] font-black text-slate-400 uppercase ml-1">De:</label>
              <input type="date" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold" value={startDate} onChange={e => setStartDate(e.target.value)} />
           </div>
           <div className="space-y-1">
              <label className="text-[7px] font-black text-slate-400 uppercase ml-1">Até:</label>
              <input type="date" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold" value={endDate} onChange={e => setEndDate(e.target.value)} />
           </div>
        </div>
      </div>

      {batchLogs.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-500 shadow-2xl animate-in zoom-in-95">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Relatório de Processamento</h3>
              <button onClick={() => setBatchLogs([])} className="text-slate-400 hover:text-red-500 font-black text-[10px] uppercase">Limpar Logs</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
              {batchLogs.map((log, i) => (
                <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${log.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : log.status === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                   <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase truncate">{log.os}</p>
                      <p className="text-[7px] font-bold opacity-70 uppercase truncate">{log.message}</p>
                   </div>
                   {log.status === 'success' ? (
                     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                   ) : log.status === 'warning' ? (
                     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                   ) : (
                     <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M6 18L18 6M6 6l12 12"/></svg>
                   )}
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'pendentes' && (
        <SmartOperationTable 
          userId={userId}
          componentId="docs-pending"
          title="Fila de Espera: Dossiês Finais"
          data={pendingTrips}
          columns={[
            ...commonColumns,
            { key: 'action', label: 'Vincular Agora', render: (t: Trip) => (
              <label className="flex items-center gap-3 px-4 py-2 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95 w-fit">
                <input type="file" className="hidden" accept=".pdf" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = await fileStorage.uploadTripDoc(file, t.os, 'COMPLETO');
                  await onUpdateTrip({ ...t, completoDoc: { id: `manual-${Date.now()}`, type: 'COMPLETO', url, fileName: `DOSSIÊ - ${t.os}`, uploadDate: new Date().toISOString() } });
                }} />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <span className="text-[8px] font-black uppercase">Anexar Manual</span>
              </label>
            )}
          ]}
        />
      )}

      {activeTab === 'concluidas' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-3 overflow-x-auto">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-4">Filtro por Divisão:</span>
             {categories.map(cat => (
               <button 
                 key={cat} 
                 onClick={() => setActiveCategory(cat)}
                 className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'}`}
               >
                 {cat}
               </button>
             ))}
          </div>
          <SmartOperationTable 
            userId={userId}
            componentId={`docs-finished-${activeCategory}`}
            title={`Histórico Digital de Dossiês - ${activeCategory}`}
            data={finishedTrips}
            onRowClick={(t) => setSelectedTripForDoc(t)}
            columns={[
              ...commonColumns,
              { key: 'view', label: 'Status Doc', render: (t: Trip) => (
                <div className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[8px] group-hover:underline">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Dossiê Vinculado
                </div>
              )}
            ]}
          />
        </div>
      )}

      {activeTab === 'canceladas' && (
        <SmartOperationTable userId={userId} componentId="docs-canceled" title="Registro de Viagens Canceladas" data={canceledTrips} columns={commonColumns} />
      )}

      {selectedTripForDoc && (
        <FullDocManagerModal 
          isOpen={!!selectedTripForDoc} 
          onClose={() => setSelectedTripForDoc(null)} 
          trip={selectedTripForDoc} 
          user={currentUser}
          onSuccess={() => {
            setSelectedTripForDoc(null);
            window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
          }}
        />
      )}
    </div>
  );
};

export default DocumentsTab;
