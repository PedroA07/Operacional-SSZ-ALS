
import React, { useState, useMemo, useRef } from 'react';
import { Trip, TripDocument } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { fileStorage } from '../../utils/fileStorage';
import { db } from '../../utils/storage';

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
  
  // Estados para Processamento em Lote
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchLogs, setBatchLogs] = useState<{ os: string, status: 'success' | 'error', message: string }[]>([]);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const cats = new Set(trips.map(t => t.category).filter(Boolean));
    return ['GERAL', ...Array.from(cats)];
  }, [trips]);

  const handleFullPDFUpload = async (trip: Trip, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const url = await fileStorage.uploadTripDoc(file, trip.os, 'COMPLETO');
      const doc: TripDocument = { 
        id: `full-pdf-${Date.now()}`, 
        type: 'COMPLETO', 
        url: url, 
        fileName: `DOSSIÊ - ${trip.os}`, 
        uploadDate: new Date().toISOString() 
      };
      const updated = { ...trip, completoDoc: doc };
      await onUpdateTrip(updated);
    } catch (err) {
      alert("Falha ao subir arquivo para o R2.");
    }
  };

  const processBatchFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingBatch(true);
    setBatchLogs([]);
    // Added explicit type cast to fix errors on lines 62, 69, 81 where file was being treated as unknown
    const filesArray = Array.from(files) as File[];
    const logs: typeof batchLogs = [];

    for (const file of filesArray) {
      // Fix for line 62: Accessing name property on File instead of unknown
      const fileName = file.name.toUpperCase();
      // Regex para encontrar padrões de OS comuns: números seguidos de ALC ou SP e sufixo A
      // Ex: 123ALC456A ou apenas a parte central
      const osMatch = fileName.match(/(\d*[A-Z]{2,3}\d*[A-Z]?)/);
      const detectedOS = osMatch ? osMatch[0] : null;

      if (!detectedOS) {
        // Fix for line 69: Accessing name property on File instead of unknown
        logs.push({ os: file.name, status: 'error', message: 'OS não identificada no nome do arquivo.' });
        continue;
      }

      const targetTrip = trips.find(t => t.os.toUpperCase().includes(detectedOS) || detectedOS.includes(t.os.toUpperCase()));

      if (!targetTrip) {
        logs.push({ os: detectedOS, status: 'error', message: 'Viagem não localizada no sistema.' });
        continue;
      }

      try {
        // Fix for line 81: Passing file as File type instead of unknown
        const url = await fileStorage.uploadTripDoc(file, targetTrip.os, 'COMPLETO');
        const doc: TripDocument = { 
          id: `batch-pdf-${Date.now()}-${Math.random()}`, 
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
    
    // Força um refresh global para atualizar as listas
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
          <button onClick={() => setActiveTab('concluidas')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'concluidas' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Viagens Concluídas</button>
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
             {isProcessingBatch ? 'Processando Lote...' : 'Anexar Dossiês (OS)'}
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

      {/* MODAL DE LOGS DO BATCH */}
      {batchLogs.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-blue-500 shadow-2xl animate-in zoom-in-95">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Resultado da Importação</h3>
              <button onClick={() => setBatchLogs([])} className="text-slate-400 hover:text-red-500 font-black text-[10px] uppercase">Fechar Log</button>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1 bg-slate-50 rounded-2xl custom-scrollbar">
              {batchLogs.map((log, i) => (
                <div key={i} className={`p-3 rounded-xl border flex items-center justify-between ${log.status === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
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

      {activeTab === 'pendentes' && (
        <SmartOperationTable 
          userId={userId}
          componentId="docs-pending"
          title="Aguardando Documentação Completa (PDF)"
          data={pendingTrips}
          columns={[
            ...commonColumns,
            { key: 'action', label: 'Anexar Documento', render: (t: Trip) => (
              <label className="flex items-center gap-3 px-4 py-2 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95 w-fit">
                <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleFullPDFUpload(t, e)} />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <span className="text-[8px] font-black uppercase">Anexar PDF Completo</span>
              </label>
            )}
          ]}
        />
      )}

      {activeTab === 'concluidas' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-3 overflow-x-auto">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-4">Categorias:</span>
             {categories.map(cat => (
               <button 
                 key={cat} 
                 onClick={() => setActiveCategory(cat)}
                 className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-200'}`}
               >
                 {cat}
               </button>
             ))}
          </div>
          <SmartOperationTable 
            userId={userId}
            componentId={`docs-finished-${activeCategory}`}
            title={`Dossiês Finalizados - ${activeCategory}`}
            data={finishedTrips}
            columns={[
              ...commonColumns,
              { key: 'view', label: 'Documento', render: (t: Trip) => {
                const doc = t.completoDoc;
                return doc ? (
                  <button onClick={() => window.open(doc.url, '_blank')} className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[8px] hover:underline">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    Visualizar PDF
                  </button>
                ) : null;
              }}
            ]}
          />
        </div>
      )}

      {activeTab === 'canceladas' && (
        <div className="space-y-6">
          <SmartOperationTable 
            userId={userId}
            componentId="docs-canceled"
            title="Registro Histórico de Viagens Canceladas"
            data={canceledTrips}
            columns={commonColumns}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentsTab;
