
import React, { useState } from 'react';
import { EmissaoCteAttachment } from '../../../types';
import { fmtMoney, fmtQty, copyMoney, copyQty, sumUnVolumes, CopyButton, PartyCard } from './cteDisplay';

export interface CteProcessTotals {
  count: number;
  totalCarga?: number;
  volumeTotals: { tipo: string; unidade?: string; total: number }[];
}

interface CteViewerModalProps {
  attachment: EmissaoCteAttachment;
  url: string;      // PDF exibido (original ou DACTE gerado)
  title: string;
  totals?: CteProcessTotals;
  onClose: () => void;
}

const CteViewerModal: React.FC<CteViewerModalProps> = ({ attachment, url, title, totals, onClose }) => {
  const [showPanel, setShowPanel] = useState(true);
  const info = attachment.cteInfo;

  const handlePrint = () => {
    const printWindow = window.open(url, '_blank');
    if (!printWindow) return;
    const checkLoaded = setInterval(() => {
      if (printWindow.document?.readyState === 'complete') {
        clearInterval(checkLoaded);
        setTimeout(() => printWindow.print(), 1000);
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[9500] bg-slate-950 flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <header className="h-16 bg-slate-900 border-b border-white/10 flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-2xl safe-top">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div className="min-w-0">
            <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest leading-none">Visão de Documento</p>
            <h3 className="text-[10px] sm:text-[11px] font-bold text-white uppercase mt-1 truncate">{title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowPanel(v => !v)}
            className={`p-2 sm:px-4 sm:py-2 rounded-xl text-[8px] font-black uppercase transition-all flex items-center gap-2 shadow-lg active:scale-95 ${
              showPanel ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
            title={showPanel ? 'Ocultar valores' : 'Mostrar valores'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
            <span className="hidden sm:inline">Valores</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[8px] font-black uppercase transition-all flex items-center gap-2 shadow-lg active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-red-700 transition-all active:scale-95 shadow-xl"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span>Fechar</span>
          </button>
        </div>
      </header>

      {/* Body: PDF + painel de valores */}
      <div className="flex-1 overflow-hidden flex">
        {/* PDF */}
        <div className="flex-1 p-3 sm:p-6 flex items-center justify-center bg-slate-900/80 min-w-0">
          <div className="w-full h-full bg-white rounded-[1.5rem] shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-hidden border border-white/10">
            <iframe
              src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
              className="w-full h-full border-none"
              title={title}
            />
          </div>
        </div>

        {/* Painel lateral de valores */}
        {showPanel && (
          <aside className="w-[300px] sm:w-[340px] shrink-0 bg-slate-900 border-l border-white/10 overflow-y-auto p-4 space-y-4">
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Valores do CT-E</p>

            {!info ? (
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Nenhum valor extraído deste anexo. Valores são lidos automaticamente do XML do CT-e
                ou da camada de texto de PDFs (DACTEs escaneados como imagem não permitem extração).
              </p>
            ) : (
              <>
                {/* Identificação */}
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-black text-white">CT-E {info.numero || '—'}</p>
                      <CopyButton value={info.numero} title="Copiar nº do CT-e" light />
                    </div>
                    {info.serie && <p className="text-[9px] font-bold text-slate-400">Série {info.serie}</p>}
                  </div>
                  {info.modal && (
                    <span className="inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded font-black uppercase">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/>
                      </svg>
                      Modal: {info.modal}
                    </span>
                  )}
                  {info.dataEmissao && (
                    <p className="text-[9px] text-slate-400 flex items-center gap-1">
                      Emissão: {new Date(info.dataEmissao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      <CopyButton
                        value={new Date(info.dataEmissao).toLocaleDateString('pt-BR')}
                        title="Copiar data de emissão"
                        light
                      />
                    </p>
                  )}
                  {info.chave && (
                    <div className="flex items-start gap-1">
                      <p className="text-[8px] text-slate-500 break-all leading-relaxed flex-1">{info.chave.replace(/(\d{4})(?=\d)/g, '$1 ')}</p>
                      <CopyButton value={info.chave} title="Copiar chave de acesso (sem espaços)" light />
                    </div>
                  )}
                </div>

                {/* Valores */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                    <p className="text-[8px] font-black text-indigo-400 uppercase">Valor da Mercadoria</p>
                    <div className="flex items-center gap-1">
                      <p className="text-base font-black text-indigo-300 mt-0.5">{fmtMoney(info.valorCarga)}</p>
                      <CopyButton value={copyMoney(info.valorCarga)} title="Copiar valor" light />
                    </div>
                  </div>
                  {info.volumes && info.volumes.length > 0 && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Volume</p>
                      {info.volumes.map((v, i) => (
                        <p key={i} className="text-[11px] font-black text-white flex items-center gap-1">
                          {v.tipo}: {fmtQty(v.quantidade)}{v.unidade ? ` ${v.unidade}` : ''}
                          <CopyButton value={copyQty(v.quantidade)} title={`Copiar ${v.tipo.toLowerCase()}`} light />
                        </p>
                      ))}
                      {sumUnVolumes(info.volumes) > 0 && (
                        <p className="text-[11px] font-black text-amber-300 flex items-center gap-1 mt-1 pt-1 border-t border-white/10">
                          QTDE DE VOLUMES: {fmtQty(sumUnVolumes(info.volumes))}
                          <CopyButton value={copyQty(sumUnVolumes(info.volumes))} title="Copiar quantidade de volumes" light />
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Partes */}
                {info.remetente && (info.remetente.nome || info.remetente.cnpjCpf) && (
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Remetente</p>
                    <PartyCard party={info.remetente} compact />
                  </div>
                )}
                {info.destinatario && (info.destinatario.nome || info.destinatario.cnpjCpf) && (
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Destinatário</p>
                    <PartyCard party={info.destinatario} compact />
                  </div>
                )}

                {/* Notas Fiscais */}
                {info.chavesNfe && info.chavesNfe.length > 0 && (
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Notas Fiscais ({info.chavesNfe.length})
                    </p>
                    <div className="space-y-1">
                      {info.chavesNfe.map((nfe, i) => {
                        const isChave = /^\d{44}$/.test(nfe);
                        const numero = isChave ? String(parseInt(nfe.substring(25, 34), 10)) : '—';
                        const serie = isChave ? String(parseInt(nfe.substring(22, 25), 10)) : '—';
                        return (
                          <div key={i} className="p-2 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-black text-white">NF-e {numero} · Série {serie}</span>
                              <CopyButton value={nfe} title="Copiar chave da NF-e (sem espaços)" light />
                            </div>
                            <p className="text-[7px] text-slate-500 break-all leading-relaxed mt-0.5">
                              {nfe.replace(/(\d{4})(?=\d)/g, '$1 ')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Totais do processo */}
            {totals && totals.count > 1 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  Totais do Processo ({totals.count} CT-Es)
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Mercadoria</span>
                  <span className="flex items-center gap-1">
                    <span className="text-[11px] font-black text-indigo-300">{fmtMoney(totals.totalCarga)}</span>
                    <CopyButton value={copyMoney(totals.totalCarga)} title="Copiar total da mercadoria" light />
                  </span>
                </div>
                {totals.volumeTotals.map((v, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">{v.tipo}</span>
                    <span className="flex items-center gap-1">
                      <span className="text-[11px] font-black text-white">{fmtQty(v.total)}{v.unidade ? ` ${v.unidade}` : ''}</span>
                      <CopyButton value={copyQty(v.total)} title={`Copiar total de ${v.tipo.toLowerCase()}`} light />
                    </span>
                  </div>
                ))}
                {(() => {
                  const totalUn = totals.volumeTotals.filter(v => v.unidade === 'UN').reduce((s, v) => s + v.total, 0);
                  return totalUn > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-amber-400 font-bold uppercase">Qtde de Volumes</span>
                      <span className="flex items-center gap-1">
                        <span className="text-[11px] font-black text-amber-300">{fmtQty(totalUn)}</span>
                        <CopyButton value={copyQty(totalUn)} title="Copiar quantidade total de volumes" light />
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </aside>
        )}
      </div>

      <style>{`
        .safe-top { padding-top: env(safe-area-inset-top); }
      `}</style>
    </div>
  );
};

export default CteViewerModal;
