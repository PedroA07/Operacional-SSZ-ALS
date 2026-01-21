
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Trip } from '../../../types';
import { reportGenerator, TableReportData } from '../../../utils/reportGenerator';

interface CopyAllStatusesActionProps {
  trips: Trip[];      
  allTrips: Trip[];   
}

interface IndividualTableEditorProps {
  initialData: TableReportData;
  onFinalChange: (data: TableReportData) => void;
}

const IndividualTableEditor = memo(({ initialData, onFinalChange }: IndividualTableEditorProps) => {
  const [localData, setLocalData] = useState<TableReportData>(initialData);

  const handleChange = (field: keyof TableReportData, value: string) => {
    const updated = { ...localData, [field]: value };
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
    <div className="inline-block border border-black mb-10 bg-white shadow-md">
      {rows.map((row) => (
        <div key={row.field} className="grid grid-cols-[140px_260px] border-b border-black last:border-b-0">
          <div className="bg-[#5b9bd5] text-black font-black text-[10px] p-2.5 border-r border-black text-center uppercase flex items-center justify-center select-none">
            {row.label}
          </div>
          <input 
            type="text"
            className="p-2.5 text-[11px] font-black text-center outline-none focus:bg-blue-50 w-full uppercase"
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
        
        const getVal = (terms: string[]) => {
          const h = [...history].reverse().find(entry => terms.some(term => entry.status.toLowerCase().includes(term.toLowerCase())));
          return h ? reportGenerator.formatFullDate(h.dateTime) : "";
        };

        const getCrageaRetiradaVal = () => {
          const removalCheio = history.find(h => h.status === 'Retirada do cheio');
          const arrivalCragea = history.find(h => h.status === 'Chegou no Cragea');

          if (!removalCheio) return "";

          const removalTime = new Date(removalCheio.dateTime).getTime();

          if (arrivalCragea) {
            const arrivalTime = new Date(arrivalCragea.dateTime).getTime();
            if (arrivalTime < removalTime) {
              return reportGenerator.formatFullDate(arrivalCragea.dateTime);
            }
          }

          return reportGenerator.formatFullDate(removalCheio.dateTime);
        };

        return {
          id: t.id,
          motorista: t.driver.name.toUpperCase(),
          container: (t.container || "A DEFINIR").toUpperCase(),
          retiradaCragea: getCrageaRetiradaVal(),
          chegadaVolks: getVal(['Chegou na Volkswagen', 'Chegada na Volkswagen']),
          saidaVolks: getVal(['Saiu da Volkswagen', 'Saída da Volkswagen']),
          baixaCragea: t.status === 'Container sobre rodas' ? "CONTAINER SOBRE RODAS" : getVal(['Viagem concluída', 'Baixa Cragea'])
        };
      };

      const hasSaidaVolks = (t: Trip) => {
        return (t.statusHistory || []).some(h => 
          h.status.toLowerCase().includes('saiu da volkswagen') || 
          h.status.toLowerCase().includes('saída da volkswagen')
        );
      };

      // FILTRO: Em Andamento (Exclui Concluídas, Canceladas e QUALQUER 'Container sobre rodas')
      setActiveReportData(trips.filter(t => 
        t.status !== 'Viagem concluída' && 
        t.status !== 'Viagem cancelada' && 
        t.status !== 'Container sobre rodas'
      ).map(mapTrip));

      // FILTRO: Finalizadas (Viagens Concluídas OU 'Container sobre rodas' QUE TENHA SAÍDA VOLKS)
      setFinishedReportData(trips.filter(t => {
        const isFinishedGeneral = t.status === 'Viagem concluída';
        const isSobreRodasComSaida = t.status === 'Container sobre rodas' && hasSaidaVolks(t);
        return isFinishedGeneral || isSobreRodasComSaida;
      }).map(mapTrip));
      
      // OBS: 'Container sobre rodas' SEM saída volks não entra em nenhuma lista.
    }
  }, [isPreviewOpen, trips, activeReportData.length, finishedReportData.length]);

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

  const handleCopy = async () => {
    try {
      const normalize = (list: TableReportData[]) => list.map(d => ({
        ...d,
        motorista: d.motorista.toUpperCase(),
        container: d.container.toUpperCase(),
        retiradaCragea: d.retiradaCragea.toUpperCase(),
        chegadaVolks: d.chegadaVolks.toUpperCase(),
        saidaVolks: d.saidaVolks.toUpperCase(),
        baixaCragea: d.baixaCragea.toUpperCase()
      }));

      const active = normalize(activeReportData);
      const finished = normalize(finishedReportData);

      const html = reportGenerator.generateFullReportHTML(active, finished);
      const plain = reportGenerator.generatePlainText(active, finished);

      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plain], { type: 'text/plain' });
      
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })];
      await navigator.clipboard.write(data);
      
      setIsCopied(true);
      setTimeout(() => { setIsCopied(false); setIsPreviewOpen(false); }, 1500);
    } catch (err) {
      alert('Falha ao acessar área de transferência.');
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
        Copiar Status ({trips.length})
      </button>

      {isPreviewOpen && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[94vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic text-xl">ALS</div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Cópia Operacional Inteligente</h3>
               </div>
               <button onClick={handleClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
            </header>

            <div className="flex-1 overflow-hidden flex bg-[#f4f7fa] p-10 gap-10">
               <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b-4 border-blue-600 pb-2">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Em Andamento</h4>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{activeReportData.length} Viagens</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                     {activeReportData.map((data, idx) => (
                       <IndividualTableEditor 
                         key={data.id || `active-${idx}`} 
                         initialData={data} 
                         onFinalChange={(val) => handleUpdateActive(idx, val)} 
                       />
                     ))}
                  </div>
               </div>

               <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex items-center justify-between border-b-4 border-emerald-600 pb-2">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Finalizadas / Rodas</h4>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{finishedReportData.length} Viagens</span>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                     {finishedReportData.map((data, idx) => (
                       <IndividualTableEditor 
                         key={data.id || `finished-${idx}`} 
                         initialData={data} 
                         onFinalChange={(val) => handleUpdateFinished(idx, val)} 
                       />
                     ))}
                  </div>
               </div>
            </div>

            <footer className="p-8 bg-white border-t border-slate-100 flex justify-center gap-6 items-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-xs leading-tight">Os campos acima podem ser editados manualmente antes de copiar para o WhatsApp.</p>
                <button onClick={handleCopy} className={`px-24 py-6 rounded-[2.5rem] text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/20 transition-all active:scale-95 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {isCopied ? '✓ Status Prontos!' : 'Copiar para Área de Transferência'}
                </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default CopyAllStatusesAction;
