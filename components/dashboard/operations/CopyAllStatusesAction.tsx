
import React, { useState, useMemo, useEffect } from 'react';
import { Trip } from '../../../types';
import { emailFormatter } from '../../../utils/emailFormatter';
import { predictionService } from '../../../utils/predictionService';

interface CopyAllStatusesActionProps {
  trips: Trip[];      
  allTrips: Trip[];   
}

const CopyAllStatusesAction: React.FC<CopyAllStatusesActionProps> = ({ trips, allTrips }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [editedPredictions, setEditedPredictions] = useState<Record<string, string>>({});

  // Inicializa previsões sugeridas quando o modal abre
  useEffect(() => {
    if (isPreviewOpen) {
      const initial: Record<string, string> = {};
      trips.forEach(t => {
        const pred = predictionService.getNextStatusPrediction(t, allTrips);
        initial[t.id] = pred ? pred.time : '';
      });
      setEditedPredictions(initial);
    }
  }, [isPreviewOpen, trips, allTrips]);

  const handlePredictionChange = (tripId: string, val: string) => {
    setEditedPredictions(prev => ({ ...prev, [tripId]: val }));
  };

  const handleCopy = async () => {
    if (trips.length === 0) return;

    try {
      const html = emailFormatter.allTripsToRichText(trips, allTrips, editedPredictions);
      const plain = trips.map(t => emailFormatter.toPlainText(t, allTrips, editedPredictions[t.id])).join('\n');

      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plain], { type: 'text/plain' });
      
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobPlain
      })];

      await navigator.clipboard.write(data);
      
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setIsPreviewOpen(false);
      }, 1500);
    } catch (err) {
      console.error('Falha ao copiar:', err);
      alert('Erro ao copiar para a área de transferência.');
    }
  };

  const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
  const finishedTrips = trips.filter(t => t.status === 'Viagem concluída');

  return (
    <>
      <button 
        onClick={() => setIsPreviewOpen(true)}
        disabled={trips.length === 0}
        className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95 shadow-xl border-2 bg-white border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600 disabled:opacity-30"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copiar Status ({trips.length})
      </button>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-7xl h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col border border-white/20 overflow-hidden animate-in zoom-in-95">
            
            {/* Header */}
            <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic text-xl shadow-lg">ALS</div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Revisão de Status Operacional</h3>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Ajuste as previsões antes de compartilhar o relatório</p>
                  </div>
               </div>
               <button onClick={() => setIsPreviewOpen(false)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                 <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
               </button>
            </header>

            {/* Conteúdo em Duas Colunas */}
            <div className="flex-1 overflow-hidden flex bg-slate-50">
               
               {/* Coluna 1: Em Andamento */}
               <div className="flex-1 flex flex-col border-r border-slate-200">
                  <div className="p-6 bg-blue-600/5 border-b border-blue-100 flex items-center justify-between">
                     <span className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Em Andamento ({activeTrips.length})</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                     {activeTrips.map(t => (
                       <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex justify-between items-start">
                             <div>
                                <p className="text-[12px] font-black text-slate-800 uppercase">OS: {t.os}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{t.customer.name}</p>
                             </div>
                             <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[8px] font-black uppercase border border-blue-100">{t.status}</span>
                          </div>
                          <div className="pt-3 border-t border-slate-50">
                             <label className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1.5 block">Previsão da Próxima Etapa</label>
                             <input 
                               type="text"
                               className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                               placeholder="Ex: 14:30h / Aguardando janela..."
                               value={editedPredictions[t.id] || ''}
                               onChange={(e) => handlePredictionChange(t.id, e.target.value)}
                             />
                          </div>
                       </div>
                     ))}
                     {activeTrips.length === 0 && <p className="text-center py-20 text-slate-300 font-bold uppercase text-[10px]">Sem viagens ativas</p>}
                  </div>
               </div>

               {/* Coluna 2: Finalizadas */}
               <div className="flex-1 flex flex-col">
                  <div className="p-6 bg-emerald-600/5 border-b border-emerald-100 flex items-center justify-between">
                     <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Finalizadas ({finishedTrips.length})</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                     {finishedTrips.map(t => (
                       <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm opacity-80 group">
                          <div className="flex justify-between items-center">
                             <div>
                                <p className="text-[11px] font-black text-slate-700 uppercase">OS: {t.os}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{t.customer.name}</p>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-emerald-600 uppercase">✓ CONCLUÍDA</span>
                             </div>
                          </div>
                       </div>
                     ))}
                     {finishedTrips.length === 0 && <p className="text-center py-20 text-slate-300 font-bold uppercase text-[10px]">Nenhuma viagem concluída hoje</p>}
                  </div>
               </div>

            </div>

            {/* Footer de Ação */}
            <footer className="p-8 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
               <p className="text-[10px] font-bold text-slate-400 uppercase max-w-md">O texto formatado incluirá os nomes dos clientes, placas e todo o histórico cronológico de cada viagem.</p>
               <div className="flex gap-4">
                  <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all">Cancelar</button>
                  <button 
                    onClick={handleCopy}
                    className={`px-12 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-4 shadow-2xl active:scale-95 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                  >
                    {isCopied ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                        Área de Transferência OK!
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                        Gerar e Copiar Relatório
                      </>
                    )}
                  </button>
               </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default CopyAllStatusesAction;
