
import React, { useState, useEffect } from 'react';
import { Trip } from '../../../types';
import { reportGenerator, TableReportData } from '../../../utils/reportGenerator';

interface CopyAllStatusesActionProps {
  trips: Trip[];      
  allTrips: Trip[];   
}

const CopyAllStatusesAction: React.FC<CopyAllStatusesActionProps> = ({ trips }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Armazena os dados no formato da tabela 2x6
  const [activeReportData, setActiveReportData] = useState<TableReportData[]>([]);
  const [finishedReportData, setFinishedReportData] = useState<TableReportData[]>([]);

  useEffect(() => {
    if (isPreviewOpen) {
      const mapTrip = (t: Trip): TableReportData => {
        const history = t.statusHistory || [];
        const getVal = (terms: string[]) => {
          const h = history.find(entry => terms.some(term => entry.status.toLowerCase().includes(term.toLowerCase())));
          return h ? reportGenerator.formatFullDate(h.dateTime) : "";
        };

        return {
          motorista: t.driver.name.toUpperCase(),
          container: (t.container || "A DEFINIR").toUpperCase(),
          retiradaCragea: getVal(['Cragea', 'Retirada do cheio']),
          chegadaVolks: getVal(['Chegou na Volkswagen', 'Chegada na Volkswagen']),
          saidaVolks: getVal(['Saiu da Volkswagen', 'Saída da Volkswagen']),
          baixaCragea: getVal(['Viagem concluída', 'Baixa Cragea'])
        };
      };

      setActiveReportData(trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada').map(mapTrip));
      setFinishedReportData(trips.filter(t => t.status === 'Viagem concluída').map(mapTrip));
    }
  }, [isPreviewOpen, trips]);

  const updateField = (section: 'active' | 'finished', index: number, field: keyof TableReportData, value: string) => {
    const setter = section === 'active' ? setActiveReportData : setFinishedReportData;
    const current = section === 'active' ? activeReportData : finishedReportData;
    
    const newList = [...current];
    newList[index] = { ...newList[index], [field]: value.toUpperCase() };
    setter(newList);
  };

  const handleCopy = async () => {
    try {
      const html = reportGenerator.generateFullReportHTML(activeReportData, finishedReportData);
      const plain = reportGenerator.generatePlainText(activeReportData, finishedReportData);

      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plain], { type: 'text/plain' });
      
      const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain })];
      await navigator.clipboard.write(data);
      
      setIsCopied(true);
      setTimeout(() => { setIsCopied(false); setIsPreviewOpen(false); }, 1500);
    } catch (err) {
      alert('Erro ao copiar.');
    }
  };

  const TableEditor = ({ section, list }: { section: 'active' | 'finished', list: TableReportData[] }) => (
    <div className="space-y-8">
      {list.map((data, idx) => (
        <div key={idx} className="inline-block border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="grid grid-cols-[150px_300px]">
            {/* Linhas fixas conforme a imagem */}
            <div className="bg-[#9bc2e6] text-white font-black text-[10px] p-2 border-b border-r border-black text-center uppercase">Motorista</div>
            <input className="p-2 border-b border-black text-[10px] font-black text-center uppercase outline-none focus:bg-blue-50" value={data.motorista} onChange={e => updateField(section, idx, 'motorista', e.target.value)} />

            <div className="bg-[#9bc2e6] text-white font-black text-[10px] p-2 border-b border-r border-black text-center uppercase">Container</div>
            <input className="p-2 border-b border-black text-[10px] font-black text-center uppercase outline-none focus:bg-blue-50" value={data.container} onChange={e => updateField(section, idx, 'container', e.target.value)} />

            <div className="bg-[#9bc2e6] text-white font-black text-[10px] p-2 border-b border-r border-black text-center uppercase">Retirada Cragea</div>
            <input className="p-2 border-b border-black text-[10px] font-black text-center uppercase outline-none focus:bg-blue-50" value={data.retiradaCragea} onChange={e => updateField(section, idx, 'retiradaCragea', e.target.value)} />

            <div className="bg-[#9bc2e6] text-white font-black text-[10px] p-2 border-b border-r border-black text-center uppercase">Chegada Volks</div>
            <input className="p-2 border-b border-black text-[10px] font-black text-center uppercase outline-none focus:bg-blue-50" value={data.chegadaVolks} onChange={e => updateField(section, idx, 'chegadaVolks', e.target.value)} />

            <div className="bg-[#9bc2e6] text-white font-black text-[10px] p-2 border-b border-r border-black text-center uppercase">Saida Volks</div>
            <input className="p-2 border-b border-black text-[10px] font-black text-center uppercase outline-none focus:bg-blue-50" value={data.saidaVolks} onChange={e => updateField(section, idx, 'saidaVolks', e.target.value)} />

            <div className="bg-[#9bc2e6] text-white font-black text-[10px] p-2 border-r border-black text-center uppercase">Baixa Cragea</div>
            <input className="p-2 text-[10px] font-black text-center uppercase outline-none focus:bg-blue-50" value={data.baixaCragea} onChange={e => updateField(section, idx, 'baixaCragea', e.target.value)} />
          </div>
        </div>
      ))}
    </div>
  );

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
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
          <div className="bg-white w-full max-w-7xl h-[94vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
            <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center font-black italic text-xl">ALS</div>
                  <h3 className="text-xl font-black uppercase tracking-tight">Relatório de Status (Excel Style)</h3>
               </div>
               <button onClick={() => setIsPreviewOpen(false)} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg></button>
            </header>

            <div className="flex-1 overflow-hidden flex bg-[#f4f7fa] p-10 gap-10">
               <div className="flex-1 flex flex-col space-y-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-4 border-blue-600 w-fit pb-1">EM ANDAMENTO:</h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                     <TableEditor section="active" list={activeReportData} />
                  </div>
               </div>

               <div className="flex-1 flex flex-col space-y-4">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b-4 border-emerald-600 w-fit pb-1">FINALIZADAS:</h4>
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                     <TableEditor section="finished" list={finishedReportData} />
                  </div>
               </div>
            </div>

            <footer className="p-8 bg-white border-t border-slate-100 flex justify-center">
                <button onClick={handleCopy} className={`px-20 py-6 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 ${isCopied ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {isCopied ? 'Relatório Copiado!' : 'Copiar para Área de Transferência'}
                </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default CopyAllStatusesAction;
