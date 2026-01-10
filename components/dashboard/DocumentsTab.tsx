
import React, { useState, useMemo } from 'react';
import { Trip, TripDocument } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';

interface DocumentsTabProps {
  userId: string;
  trips: Trip[];
  onUpdateTrip: (trip: Trip) => Promise<void>;
}

const DocumentsTab: React.FC<DocumentsTabProps> = ({ userId, trips, onUpdateTrip }) => {
  // Padrão ALS: Inicia filtros com a data de HOJE
  const today = new Date().toLocaleDateString('en-CA');
  
  const [activeTab, setActiveTab] = useState<'pendentes' | 'concluidas' | 'canceladas'>('pendentes');
  const [activeCategory, setActiveCategory] = useState<string>('GERAL');
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  const categories = useMemo(() => {
    const cats = new Set(trips.map(t => t.category).filter(Boolean));
    return ['GERAL', ...Array.from(cats)];
  }, [trips]);

  const handleFullPDFUpload = async (trip: Trip, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const doc: TripDocument = { 
        id: `full-pdf-${Date.now()}`, 
        type: 'COMPLETO', 
        url: reader.result as string, 
        fileName: file.name, 
        uploadDate: new Date().toISOString() 
      };
      const updated = { ...trip, completoDoc: doc };
      await onUpdateTrip(updated);
    };
    reader.readAsDataURL(file);
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
          <button onClick={() => setActiveTab('pendentes')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'pendentes' ? 'bg-white text-blue-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Pendentes ({pendingTrips.length})</button>
          <button onClick={() => setActiveTab('concluidas')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'concluidas' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Viagens Concluídas</button>
          <button onClick={() => setActiveTab('canceladas')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'canceladas' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-400 hover:bg-slate-200'}`}>Canceladas</button>
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
           {(startDate !== today || endDate !== today) && (
              <button onClick={() => { setStartDate(today); setEndDate(today); }} className="mt-4 text-[8px] font-black text-blue-600 uppercase hover:underline">Hoje</button>
           )}
        </div>
      </div>

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
