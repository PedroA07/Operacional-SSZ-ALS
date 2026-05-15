import React, { useMemo, useState } from 'react';
import { Trip, Driver, FreightContractDoc } from '../../../types';
import PDFViewer from '../../shared/PDFViewer';

interface DocsTabProps {
  trips: Trip[];
  driver: Driver | null;
  canSeeContracts?: boolean;
}

interface ContractItem {
  os: string;
  customer: string;
  doc: FreightContractDoc;
  index: number;
  total: number;
}

const DocsTab: React.FC<DocsTabProps> = ({ trips, driver, canSeeContracts = true }) => {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{url: string, title: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para validação de chave
  const [isKeyPromptOpen, setIsKeyPromptOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [pendingDoc, setPendingDoc] = useState<{url: string, title: string} | null>(null);
  const [keyError, setKeyError] = useState(false);

  const freightContracts = useMemo<ContractItem[]>(() => {
    const now = new Date();
    const items: ContractItem[] = [];
    for (const t of trips) {
      const allDocs: FreightContractDoc[] = t.freightContractDocs?.length
        ? t.freightContractDocs
        : t.freightContractDoc
          ? [t.freightContractDoc as FreightContractDoc]
          : [];
      // Exclui documentos expirados
      const docs = allDocs.filter(d => !d.expiresAt || new Date(d.expiresAt) > now);
      docs.forEach((doc, idx) => {
        items.push({ os: t.os, customer: t.customer.name, doc, index: idx + 1, total: docs.length });
      });
    }
    return items.filter(item =>
      item.os.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [trips, searchQuery]);

  const handleContractClick = (url: string, title: string) => {
    if (!driver) return;

    const driverCpf = driver.cpf.replace(/\D/g, '');
    const beneficiaryCnpj = driver.beneficiaryCnpj ? driver.beneficiaryCnpj.replace(/\D/g, '') : driverCpf;

    // Se o beneficiário é o próprio motorista (CPF == Documento Benf), acesso livre
    if (driverCpf === beneficiaryCnpj) {
      openDoc(url, title);
    } else {
      // Solicita chave (4 últimos dígitos do CPF/CNPJ do beneficiário)
      setPendingDoc({ url, title });
      setInputKey('');
      setKeyError(false);
      setIsKeyPromptOpen(true);
    }
  };

  const validateKey = () => {
    if (!driver || !pendingDoc) return;
    
    const beneficiaryCnpj = driver.beneficiaryCnpj ? driver.beneficiaryCnpj.replace(/\D/g, '') : '';
    const correctKey = beneficiaryCnpj.slice(-4);

    if (inputKey === correctKey) {
      setIsKeyPromptOpen(false);
      openDoc(pendingDoc.url, pendingDoc.title);
      setPendingDoc(null);
    } else {
      setKeyError(true);
      setTimeout(() => setKeyError(false), 1500);
    }
  };

  const openDoc = (url: string, title: string) => {
    setSelectedDoc({ url, title });
    setIsViewerOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
       <div className="text-center py-6">
          <h3 className="text-lg font-black uppercase text-white">Contratos de Frete</h3>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sua via assinada digitalmente</p>
       </div>

       <div className="px-1">
          <div className="relative">
            <input 
              type="text" 
              placeholder="BUSCAR POR OS OU CLIENTE..." 
              className="w-full pl-12 pr-6 py-5 bg-slate-900 border border-white/10 rounded-2xl text-white font-bold text-[10px] uppercase outline-none focus:border-blue-500 transition-all shadow-2xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
       </div>
       
       {canSeeContracts !== false ? (
         <>
           <div className="space-y-3">
              {freightContracts.length > 0 ? freightContracts.map((item) => (
                <button
                  key={`${item.doc.id}-${item.index}`}
                  onClick={() => handleContractClick(item.doc.url, `Contrato ${item.index}/${item.total} · OS ${item.os}`)}
                  className="w-full p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] flex items-center justify-between active:bg-blue-600 transition-all group shadow-xl text-left"
                >
                   <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-active:text-white shrink-0 border border-blue-500/20 relative">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/></svg>
                         {driver && driver.cpf.replace(/\D/g,'') !== (driver.beneficiaryCnpj || '').replace(/\D/g,'') && (
                           <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 border-2 border-slate-950 rounded-full flex items-center justify-center">
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="4"/></svg>
                           </div>
                         )}
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-[11px] font-black text-white uppercase truncate">
                          Contrato{item.total > 1 ? ` ${item.index}/${item.total}` : ''} · OS {item.os}
                        </p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase group-active:text-blue-100 mt-0.5 truncate">{item.customer}</p>
                        {item.doc.parsedData && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                            {item.doc.parsedData.prevTermino && (
                              <span className="text-[7px] font-bold text-slate-400 group-active:text-blue-200">
                                Término: <span className="text-slate-300">{item.doc.parsedData.prevTermino}</span>
                              </span>
                            )}
                            {item.doc.parsedData.localidade && (
                              <span className="text-[7px] font-bold text-slate-400 group-active:text-blue-200">
                                Local: <span className="text-slate-300">{item.doc.parsedData.localidade}</span>
                              </span>
                            )}
                            {item.doc.parsedData.container && (
                              <span className="text-[7px] font-mono font-black text-blue-400 group-active:text-white">
                                {item.doc.parsedData.container}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      <span className="text-[7px] font-mono text-slate-600 group-active:text-blue-200">{new Date(item.doc.uploadDate).toLocaleDateString('pt-BR')}</span>
                      <svg className="w-4 h-4 text-slate-700 group-active:text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                   </div>
                </button>
              )) : (
                <div className="py-24 bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-white/5 text-center px-10">
                   <p className="text-[10px] font-black text-slate-600 uppercase italic leading-relaxed">Nenhum contrato localizado.<br/>Verifique a OS ou solicite o anexo.</p>
                </div>
              )}
           </div>

           {/* MODAL DE CHAVE DE ACESSO (PROMPT) */}
           {isKeyPromptOpen && (
             <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                <div className={`w-full max-w-sm bg-slate-900 rounded-[2.5rem] p-10 border shadow-2xl text-center space-y-8 transition-all ${keyError ? 'border-red-500 animate-shake' : 'border-white/10'}`}>
                   <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mx-auto border border-amber-500/20">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg>
                   </div>
                   <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight">Acesso Restrito</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 leading-relaxed">Este contrato foi emitido para um beneficiário terceiro. Insira a chave para visualizar.</p>
                   </div>

                   <div className="space-y-4">
                      <input
                        type="password"
                        maxLength={4}
                        inputMode="numeric"
                        placeholder="••••"
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-6 text-3xl font-black text-blue-500 tracking-[1em] text-center outline-none focus:border-blue-500 transition-all placeholder:text-slate-800"
                        value={inputKey}
                        onChange={e => setInputKey(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={e => e.key === 'Enter' && inputKey.length === 4 && validateKey()}
                      />
                      <p className="text-[7px] text-slate-600 font-black uppercase tracking-widest">Dica: 4 últimos dígitos do CPF/CNPJ do beneficiário</p>
                   </div>

                   <div className="flex flex-col gap-3 pt-2">
                      <button
                        disabled={inputKey.length < 4}
                        onClick={validateKey}
                        className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-30 transition-all"
                      >
                        Desbloquear Contrato
                      </button>
                      <button
                        onClick={() => { setIsKeyPromptOpen(false); setPendingDoc(null); }}
                        className="w-full py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:text-white"
                      >
                        Voltar
                      </button>
                   </div>
                </div>
             </div>
           )}

           {isViewerOpen && selectedDoc && (
            <PDFViewer
              url={selectedDoc.url}
              title={selectedDoc.title}
              onClose={() => setIsViewerOpen(false)}
            />
          )}
         </>
       ) : (
         <div className="text-center py-12 text-slate-400">
           <p className="text-3xl mb-3">🔒</p>
           <p className="text-sm font-black uppercase">Acesso não autorizado</p>
           <p className="text-xs mt-1">Contratos de frete não disponíveis para este perfil.</p>
         </div>
       )}
    </div>
  );
};

export default DocsTab;