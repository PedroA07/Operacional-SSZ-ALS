
import React, { useState, useEffect } from 'react';
import { SealBatch, SealRecord } from '../../types';
import { db } from '../../utils/storage';
import SealBatchModal from './lacres/SealBatchModal';
import SealDetailsView from './lacres/SealDetailsView';

const LacresTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [batches, setBatches] = useState<(SealBatch & { used: number, total: number })[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<SealBatch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadBatches = async () => {
    setIsLoading(true);
    try {
      const data = await db.getSealBatches();
      
      const batchesWithStats = await Promise.all(data.map(async (batch) => {
        const records = await db.getSealRecords(batch.id);
        const used = records.filter(r => r.containerNumber && r.containerNumber.trim() !== '').length;
        return {
          ...batch,
          used,
          total: records.length
        };
      }));

      setBatches(batchesWithStats);
    } catch (e) {
      console.error("Erro ao carregar lotes de lacres:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadBatches(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Excluir lote de lacres permanentemente?')) return;
    await db.deleteSealBatch(id);
    await loadBatches();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
         <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Controle de Lacres</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Equipamentos de Vedação</p>
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
               className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl transition-all group text-left relative overflow-hidden flex flex-col h-[320px]"
             >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2.5"/></svg>
                  </div>
                  <button onClick={(e) => handleDelete(batch.id, e)} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                </div>
                
                <div className="flex-1 space-y-4">
                   <div>
                      <h4 className="text-xl font-black text-slate-800 uppercase leading-none truncate">{batch.carrier}</h4>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Série: {batch.startNumber}</p>
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-end">
                         <span className="text-[9px] font-black text-slate-400 uppercase">Utilização</span>
                         <span className="text-[11px] font-black text-slate-700">{batch.used} / {batch.total}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                         <div 
                           className={`h-full transition-all duration-1000 ${batch.used === batch.total ? 'bg-amber-500' : 'bg-blue-600'}`}
                           style={{ width: `${(batch.used / batch.total) * 100}%` }}
                         ></div>
                      </div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase text-right">
                        {batch.total - batch.used} UNIDADES DISPONÍVEIS
                      </p>
                   </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-tighter">
                   <span>Abrir Lote</span>
                   <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                </div>
             </button>
           ))}
           {batches.length === 0 && !isLoading && (
             <div className="col-span-full py-32 text-center text-slate-300 font-black uppercase italic text-xs border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50">Nenhum lote de lacre registrado</div>
           )}
        </div>
      ) : (
        <SealDetailsView batch={selectedBatch} onBack={() => { setSelectedBatch(null); loadBatches(); }} userId={userId} />
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
