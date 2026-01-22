
import React, { useState, useEffect } from 'react';
import { SealBatch, SealRecord } from '../../types';
import { db } from '../../utils/storage';
import SealBatchModal from './lacres/SealBatchModal';
import SealDetailsView from './lacres/SealDetailsView';

const LacresTab: React.FC = () => {
  const [batches, setBatches] = useState<SealBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<SealBatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadBatches = async () => {
    setIsLoading(true);
    const data = await db.getSealBatches();
    setBatches(data);
    setIsLoading(false);
  };

  useEffect(() => { loadBatches(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir pasta de lacres permanentemente?')) return;
    await db.deleteSealBatch(id);
    await loadBatches();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
         <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Controle de Lacres</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Equipamentos por Armador</p>
         </div>
         {!selectedBatch && (
           <button 
             onClick={() => setIsModalOpen(true)}
             className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
           >
             Novo Lote de Lacres
           </button>
         )}
      </div>

      {!selectedBatch ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {batches.map(batch => (
             <button 
               key={batch.id} 
               onClick={() => setSelectedBatch(batch)}
               className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl transition-all group text-left relative overflow-hidden flex flex-col h-[280px]"
             >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2.5"/></svg>
                  </div>
                  <button onClick={(e) => handleDelete(batch.id, e)} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                </div>
                <div className="flex-1 space-y-2">
                   <h4 className="text-xl font-black text-slate-800 uppercase leading-none truncate">{batch.carrier}</h4>
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Sequência Gerada:</p>
                   <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-mono text-[10px] font-black text-slate-500">
                      {batch.startNumber} <br/> {batch.endNumber}
                   </div>
                </div>
                <div className="mt-4 flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                   <span>Pasta Ativa</span>
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                </div>
             </button>
           ))}
           {batches.length === 0 && !isLoading && (
             <div className="col-span-full py-32 text-center text-slate-300 font-black uppercase italic text-xs border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50">Nenhum lote registrado</div>
           )}
        </div>
      ) : (
        <SealDetailsView batch={selectedBatch} onBack={() => setSelectedBatch(null)} />
      )}

      <SealBatchModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); loadBatches(); }}
      />
    </div>
  );
};

export default LacresTab;
