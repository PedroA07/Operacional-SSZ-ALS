
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Trip, StatusHistoryEntry } from '../../../types';
import { reportGenerator, TableReportData } from '../../../utils/reportGenerator';

interface CopyAllStatusesActionProps {
  trips: Trip[];      
  allTrips: Trip[];   
}

interface IndividualTableEditorProps {
  initialData: TableReportData;
  onFinalChange: (data: TableReportData) => void;
  onMove: () => void;
  moveLabel: string;
}

const IndividualTableEditor = memo(({ initialData, onFinalChange, onMove, moveLabel }: IndividualTableEditorProps) => {
  const [localData, setLocalData] = useState<TableReportData>(initialData);

  const handleChange = (field: keyof TableReportData, value: string) => {
    const updated = { ...localData, [field]: value.toUpperCase() };
    setLocalData(updated);
    onFinalChange(updated);
  };

  const rows: { label: string, field: keyof TableReportData }[] = [
    { label: 'Motorista', field: 'motorista' },
    { label: 'Container', field: 'container' },
    { label: 'Retirada Cragea', field: 'retiradaCragea' },
    { label: 'Chegada Volks', field: 'chegadaVolks' },
    { label: 'Saida Volks', field: 'saidaVolks' },
    { label: 'Baixa Cragea', field: 'baixaCragea' }
  ];

  return (
    <div className="inline-block border border-black mb-10 bg-white shadow-md relative group">
      {/* Botão de Mover Coluna */}
      <button 
        onClick={onMove}
        className="absolute -right-4 top-1/2 -translate-y-1/2 translate-x-full bg-slate-900 text-white p-3 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-blue-600 active:scale-90"
        title={moveLabel}
      >
        <div className="flex flex-col items-center gap-1">
           <svg className={`w-4 h-4 ${moveLabel.includes('Andamento') ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
           <span className="text-[7px] font-black uppercase whitespace-nowrap">{moveLabel}</span>
        </div>
      </button>

      {rows.map((row) => (
        <div key={row.field} className="grid grid-cols-[140px_260px] border-b border-black last:border-b-0">
          <div className="bg-[#5b9bd5] text-black font-black text-[10px] p-2.5 border-r border-black text-center uppercase flex items-center justify-center select-none">
            {row.label}
          </div>
          {/* Alterado para textarea para suportar quebra de linha no editor */}
          <textarea 
            rows={row.field === 'baixaCragea' ? 2 : 1}
            className="p-2.5 text-[11px] font-black text-center outline-none focus:bg-blue-50 w-full uppercase resize-none overflow-hidden"
            style={{ textTransform: 'uppercase' }}
            value={localData[row.field]} 
            onChange={e => handleChange(row.field, e.target.value)} 
          />
        </div>
      ))}
    </div>
  );
});

const CopyAllStatusesAction: React.FC<CopyAllStatusesActionProps> = ({ trips }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeReportData, setActiveReportData] = useState<TableReportData[]>([]);
  const [finishedReportData, setFinishedReportData] = useState<TableReportData[]>([]);

  useEffect(() => {
    if (isPreviewOpen && activeReportData.length === 0 && finishedReportData.length === 0) {
      const mapTrip = (t: Trip): TableReportData => {
        const history = [...(t.statusHistory || [])].sort((a, b) => 
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );
        
        // Função para capturar a data formatada de termos específicos
        const getVal = (terms: string[]) => {
          const h = [...history].reverse().find(entry => 
            terms.some(term => entry.status.toLowerCase().trim() === term.toLowerCase().trim())
          );
          return h ? reportGenerator.formatFullDate(h.dateTime) : "";
        };

        const formatFullPrediction = (date: Date) => {
          const dd = String(date.getDate()).padStart(2, '0');
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const yyyy = date.getFullYear();
          const hh = String(date.getHours()).padStart(2, '0');
          const min = String(date.getMinutes()).padStart(2, '0');
          return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
        };

        // Lógica Baixa Cragea com Previsão de 45min a partir do horário ATUAL
        let baixaValue = "";
        const isFinished = t.status === 'Viagem concluída';
        
        if (isFinished) {
          baixaValue = getVal(['Viagem concluída']);
        } else if (t.status === 'Container sobre rodas' || t.status === 'Saiu da Volkswagen') {
          // Adiciona 45 min a partir do horário atual para a previsão
          const predTime = new Date(Date.now() + 45 * 60000); 
          baixaValue = `CONTAINER SOBRE RODAS | PREVISÃO BAIXA: ${formatFullPrediction(predTime)}`;
        }

        return {
          id: t.id,
          motorista: t.driver.name.toUpperCase(),
          container: (t.container || "A DEFINIR").toUpperCase(),
          // PRIORIDADE: Saiu do Cragea -> Chegou no Cragea -> Retirada do cheio
          retiradaCragea: getVal(['Saiu do Cragea', 'Chegou no Cragea', 'Retirada do cheio']),
          chegadaVolks: getVal(['Chegou na Volkswagen', 'Chegada na Volkswagen']),
          saidaVolks: getVal(['Saiu da Volkswagen', 'Saída da Volkswagen']),
          baixaCragea: baixaValue
        };
      };

      // Carregamento inicial baseado nos status reais
      setActiveReportData(trips.filter(t => 
        t.status !== 'Viagem concluída' && 
        t.status !== 'Viagem cancelada' &&
        t.status !== 'Container sobre rodas' &&
        t.status !== 'Saiu da Volkswagen'
      ).map(mapTrip));

      setFinishedReportData(trips.filter(t => 
        t.status === 'Viagem concluída' || 
        t.status === 'Container sobre rodas' ||
        t.status === 'Saiu da Volkswagen'
      ).map(mapTrip));
    }
  }, [isPreviewOpen, trips]);

  const handleUpdateActive = useCallback((index: number, newData: TableReportData) => {
    setActiveReportData(prev => {
      const copy = [...prev];
      copy[index] = newData;
      return copy;
    });
  }, []);

  const handleUpdateFinished = useCallback((index: number, newData: TableReportData) => {
    setFinishedReportData(prev => {
      const copy = [...prev];
      copy[index] = newData;
      return copy;
    });
  }, []);

  const moveTrip = (index: number, from: 'active' | 'finished') => {
    if (from === 'active') {
      const item = activeReportData[index];
      setActiveReportData(prev => prev.filter((_, i) => i !== index));
      setFinishedReportData(prev => [item, ...prev]);
    } else {
      const item = finishedReportData[index];
      setFinishedReportData(prev => prev.filter((_, i) => i !== index));
      setActiveReportData(prev => [item, ...prev]);
    }
  };

  const handleCopy = async () => {
    try {
      const active = activeReportData;
      const finished = finishedReportData;

      const html = reportGenerator.generateFullReportHTML(active, finished);
      const plain = reportGenerator.generatePlainText(active, finished);

      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plain], { type: 'text/plain' });
      
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })];
      await navigator.clipboard.write(data);
      
      setIsCopied(true);
      setTimeout(() => { setIsCopied(false); setIsPreviewOpen(false); }, 1500);
    } catch (err) {
      alert('Falha ao copiar.');
    }
  };

  const handleClose = () => {
    setIsPreviewOpen(false);
    setActiveReportData([]); 
    setFinishedReportData([]);
  };

  return (
    <>
      <button 
        onClick={() => setIsPreviewOpen(true)}
        disabled={trips.length === 0}
        className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95 shadow-xl border-2 bg-white border-slate-200 text-slate-700 hover:border-blue-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="3"/></svg>
        Copiar Relatório ({trips.length})
      </button>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[94vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <h3 className="text-xl font-black uppercase">Editor de Relatório Operacional</h3>
               <button onClick={handleClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
            </header>

            <div className="flex-1 overflow-hidden flex bg-[#f4f7fa] p-10 gap-10">
               <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-blue-600 pb-2">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Em Andamento ({activeReportData.length})</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-10">
                     {activeReportData.map((data, idx) => (
                       <IndividualTableEditor 
                         key={data.id || idx} 
                         initialData={data} 
                         onFinalChange={(val) => handleUpdateActive(idx, val)} 
                         onMove={() => moveTrip(idx, 'active')}
                         moveLabel="Para Finalizadas"
                       />
                     ))}
                  </div>
               </div>
               <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-emerald-600 pb-2">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Finalizadas / Container sobre rodas ({finishedReportData.length})</h4>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-10">
                     {finishedReportData.map((data, idx) => (
                       <IndividualTableEditor 
                         key={data.id || idx} 
                         initialData={data} 
                         onFinalChange={(val) => handleUpdateFinished(idx, val)} 
                         onMove={() => moveTrip(idx, 'finished')}
                         moveLabel="Para Andamento"
                       />
                     ))}
                  </div>
               </div>
            </div>

            <footer className="p-8 bg-white border-t border-slate-100 flex flex-col items-center gap-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dica: Passe o mouse sobre um card para movê-lo de coluna. Letras serão copiadas em MAIÚSCULO.</p>
                <button onClick={handleCopy} className={`px-24 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {isCopied ? '✓ Copiado com Sucesso!' : 'Copiar para Clipboard'}
                </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default CopyAllStatusesAction;
