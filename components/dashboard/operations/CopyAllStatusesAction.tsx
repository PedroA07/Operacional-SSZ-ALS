
import React, { useState, useEffect } from 'react';
import { Trip, StatusHistoryEntry, TripStatus } from '../../../types';
import { emailFormatter, ReportOverride } from '../../../utils/emailFormatter';
import { predictionService } from '../../../utils/predictionService';
import { statusService } from '../../../utils/statusService';

interface CopyAllStatusesActionProps {
  trips: Trip[];      
  allTrips: Trip[];   
}

const CopyAllStatusesAction: React.FC<CopyAllStatusesActionProps> = ({ trips, allTrips }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showCustomer, setShowCustomer] = useState(true);
  
  const [reportOverrides, setReportOverrides] = useState<Record<string, ReportOverride>>({});

  useEffect(() => {
    if (isPreviewOpen) {
      const initialOverrides: Record<string, ReportOverride> = {};
      
      trips.forEach(t => {
        const pred = predictionService.getNextStatusPrediction(t, allTrips);
        
        // Organiza histórico cronologicamente (do mais antigo ao mais novo para a edição)
        const history = [...(t.statusHistory || [])]
          .filter(h => h.status !== 'Pendente')
          .map(h => ({ ...h }))
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

        // Previsão com Data e Hora (Engine ALS)
        let finalPredLabel = pred?.label || 'Previsão de Chegada';
        let finalPredTime = pred?.time || '';

        // Garante que a previsão tenha data e hora completas
        if (finalPredTime && !finalPredTime.includes('/')) {
           const d = new Date();
           finalPredTime = `${d.toLocaleDateString('pt-BR')} ${finalPredTime}`;
        } else if (!finalPredTime) {
           const d = new Date();
           d.setHours(d.getHours() + 2);
           finalPredTime = emailFormatter.formatFullDate(d.toISOString());
        }

        initialOverrides[t.id] = {
          history,
          prediction: { label: finalPredLabel, time: finalPredTime }
        };
      });
      
      setReportOverrides(initialOverrides);
    }
  }, [isPreviewOpen, trips, allTrips]);

  const handleHistoryTimeChange = (tripId: string, entryIdx: number, val: string) => {
    setReportOverrides(prev => {
      const tripOverride = { ...prev[tripId] };
      const newHistory = [...tripOverride.history];
      newHistory[entryIdx] = { ...newHistory[entryIdx], dateTime: val };
      return { ...prev, [tripId]: { ...tripOverride, history: newHistory } };
    });
  };

  const handleHistoryLabelChange = (tripId: string, entryIdx: number, val: string) => {
    setReportOverrides(prev => {
      const tripOverride = { ...prev[tripId] };
      const newHistory = [...tripOverride.history];
      newHistory[entryIdx] = { ...newHistory[entryIdx], status: val as TripStatus };
      return { ...prev, [tripId]: { ...tripOverride, history: newHistory } };
    });
  };

  const handlePredictionChange = (tripId: string, field: 'label' | 'time', val: string) => {
    setReportOverrides(prev => {
      const tripOverride = { ...prev[tripId] };
      const newPred = tripOverride.prediction 
        ? { ...tripOverride.prediction, [field]: val }
        : { label: field === 'label' ? val : 'Previsão', time: field === 'time' ? val : '' };
      return { ...prev, [tripId]: { ...tripOverride, prediction: newPred } };
    });
  };

  const handleCopy = async () => {
    if (trips.length === 0) return;

    try {
      // Sincroniza estado showCustomer com o motor de formatação
      const html = emailFormatter.allTripsToRichText(trips, allTrips, reportOverrides, showCustomer);
      const plain = trips.map(t => emailFormatter.toPlainText(t, allTrips, reportOverrides[t.id], showCustomer)).join('\n');

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
          <div className="bg-white w-full max-w-7xl h-[94vh] rounded-[3.5rem] shadow-2xl flex flex-col border border-white/20 overflow-hidden animate-in zoom-in-95 duration-500">
            
            <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic text-xl shadow-lg">ALS</div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight leading-none">Revisão do Relatório Operacional</h3>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-2">Layout em Duas Colunas (Andamento vs Concluídas)</p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 bg-white/5 px-5 py-2.5 rounded-2xl border border-white/10">
                     <span className="text-[10px] font-black uppercase text-slate-400">Exibir Cliente</span>
                     <button 
                       onClick={() => setShowCustomer(!showCustomer)}
                       className={`w-11 h-6.5 rounded-full transition-all relative ${showCustomer ? 'bg-blue-600' : 'bg-slate-700'}`}
                     >
                       <div className={`absolute top-1 w-4.5 h-4.5 bg-white rounded-full transition-all ${showCustomer ? 'left-5.5' : 'left-1'}`}></div>
                     </button>
                  </div>
                  <button onClick={() => setIsPreviewOpen(false)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
                  </button>
               </div>
            </header>

            <div className="flex-1 overflow-hidden flex bg-slate-50">
               {/* LADO 1: EM ANDAMENTO */}
               <div className="flex-1 flex flex-col border-r border-slate-200">
                  <div className="p-6 bg-blue-600/5 border-b border-blue-100 flex items-center justify-between">
                     <span className="text-[11px] font-black text-blue-700 uppercase tracking-widest">Viagens em Andamento ({activeTrips.length})</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                     {activeTrips.map(t => {
                       const ovr = reportOverrides[t.id];
                       const statusOptions = statusService.getOptions(t);

                       return (
                        <div key={t.id} className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6 relative group/card">
                            <div className="bg-slate-900 rounded-[1.8rem] p-5 text-white shadow-lg">
                               <div className="flex items-center gap-3">
                                  <h4 className="text-xl font-black uppercase">OS: {t.os}</h4>
                                  <span className="text-sm font-mono font-black text-blue-100 bg-blue-500/20 px-2.5 py-1 rounded-lg border border-blue-500/30">{t.container || 'A DEFINIR'}</span>
                               </div>
                               <p className="text-[10px] font-black uppercase text-slate-200 mt-2">
                                 Motorista: <span className="text-blue-400">{t.driver.name}</span>
                               </p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Histórico Cronológico (Data + Hora)</label>
                                <div className="space-y-2">
                                  {ovr?.history.map((entry, idx) => (
                                      <div key={idx} className="flex items-center gap-2 group">
                                          <select 
                                              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-700 uppercase outline-none focus:border-blue-500"
                                              value={entry.status}
                                              onChange={(e) => handleHistoryLabelChange(t.id, idx, e.target.value)}
                                          >
                                              {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                          </select>
                                          <input 
                                              type="datetime-local"
                                              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 outline-none focus:border-blue-500"
                                              value={entry.dateTime.slice(0, 16)}
                                              onChange={(e) => handleHistoryTimeChange(t.id, idx, e.target.value)}
                                          />
                                      </div>
                                  ))}
                                </div>
                            </div>

                            <div className="p-5 bg-blue-600/5 rounded-3xl border border-blue-100 space-y-4">
                                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block px-1">🚀 Próxima Previsão (Data + Hora)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="text" placeholder="Título" className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-[10px] font-black text-blue-700 outline-none" value={ovr?.prediction?.label || ''} onChange={(e) => handlePredictionChange(t.id, 'label', e.target.value)} />
                                    <input type="text" placeholder="DD/MM/AAAA HH:MM" className="w-full px-4 py-3 bg-white border border-blue-100 rounded-xl text-[10px] font-black text-blue-700 outline-none" value={ovr?.prediction?.time || ''} onChange={(e) => handlePredictionChange(t.id, 'time', e.target.value)} />
                                </div>
                            </div>
                            {showCustomer && <p className="text-[8px] font-bold text-slate-300 uppercase absolute top-4 right-8 italic truncate max-w-[150px]">{t.customer.name}</p>}
                        </div>
                       );
                     })}
                  </div>
               </div>

               {/* LADO 2: CONCLUÍDAS */}
               <div className="flex-1 flex flex-col">
                  <div className="p-6 bg-emerald-600/5 border-b border-emerald-100 flex items-center justify-between">
                     <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Viagens Concluídas ({finishedTrips.length})</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                     {finishedTrips.map(t => (
                       <div key={t.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm opacity-80">
                          <div className="flex justify-between items-center">
                             <div>
                                <p className="text-[12px] font-black text-slate-800 uppercase">OS: {t.os}</p>
                                <p className="text-[9px] font-mono font-bold text-slate-400 mt-1">{t.container}</p>
                                {showCustomer && <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 italic">{t.customer.name}</p>}
                                <p className="text-[9px] font-black text-slate-400 uppercase mt-1">MOT: {t.driver.name}</p>
                             </div>
                             <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-2">✓ Concluída</span>
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>

            <footer className="p-8 bg-white border-t border-slate-100 flex justify-between items-center shrink-0">
               <p className="text-[10px] font-bold text-slate-400 uppercase max-w-md">O relatório será gerado em layout de duas colunas, formatando todos os eventos com data e hora completa.</p>
               <div className="flex gap-4">
                  <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-3xl text-[11px] font-black uppercase hover:bg-slate-200 transition-all">Descartar</button>
                  <button onClick={handleCopy} className={`px-12 py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-4 shadow-2xl active:scale-95 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    {isCopied ? 'Relatório Copiado!' : 'Gerar e Copiar Layout'}
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
