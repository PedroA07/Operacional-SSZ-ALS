
import React, { useState, useEffect, useRef } from 'react';
import { User, Driver, Customer, Port, PreStacking, FormHistoryEntry } from '../../types';
import OrdemColetaForm from './forms/OrdemColetaForm';
import LiberacaoVazioForm from './forms/LiberacaoVazioForm';
import DevolucaoVazioForm from './forms/DevolucaoVazioForm';
import PreStackingForm from './forms/PreStackingForm';
import RetiradaCheioForm from './forms/RetiradaCheioForm';
import { db } from '../../utils/storage';
import { localDateStr, localDateTimeStr, formatDateTimePtBR } from '../../utils/dateHelpers';

interface FormsTabProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  preStacking: PreStacking[];
  initialFormId?: string | null;
}

type FormType = 'ORDEM_COLETA' | 'PRE_STACKING' | 'LIBERACAO_VAZIO' | 'DEVOLUCAO_VAZIO' | 'RETIRADA_CHEIO';

const formConfigs: Record<FormType, { title: string; color: string; hex: string; description: string }> = {
  ORDEM_COLETA:   { title: 'Ordem de Coleta',             color: 'bg-blue-600',    hex: '#2563eb', description: 'Emissão de OC com campos editáveis e barcodes' },
  PRE_STACKING:   { title: 'Pré-Stacking (Minuta Cheio)', color: 'bg-emerald-600', hex: '#059669', description: 'Minuta para entrega de container cheio no terminal' },
  LIBERACAO_VAZIO:{ title: 'Liberação de Vazio',           color: 'bg-slate-700',   hex: '#334155', description: 'Documento de autorização de retirada em depósitos' },
  DEVOLUCAO_VAZIO:{ title: 'Devolução de Vazio',           color: 'bg-amber-600',   hex: '#d97706', description: 'Minuta de entrega de unidade vazia (Depot/Santos)' },
  RETIRADA_CHEIO: { title: 'Retirada de Cheio',            color: 'bg-indigo-600',  hex: '#4f46e5', description: 'Ordem para movimentação de container importado' },
};

function formatHistoryDate(iso: string) {
  return formatDateTimePtBR(iso);
}

const FormsTab: React.FC<FormsTabProps> = ({ user, drivers, customers, ports, preStacking, initialFormId }) => {
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);

  const [openHistoryType, setOpenHistoryType] = useState<FormType | null>(null);
  const [histories, setHistories] = useState<Partial<Record<FormType, FormHistoryEntry[]>>>({});
  const [loadingHistory, setLoadingHistory] = useState<FormType | null>(null);
  const historyRefs = useRef<Partial<Record<FormType, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (initialFormId && formConfigs[initialFormId as FormType]) {
      setSelectedFormType(initialFormId as FormType);
      setInitialFormData(null);
      setIsFormModalOpen(true);
    }
  }, [initialFormId]);

  useEffect(() => {
    const el = document.getElementById('dashboard-scroll');
    if (!el) return;
    el.style.overflowY = isFormModalOpen ? 'hidden' : '';
    return () => { el.style.overflowY = ''; };
  }, [isFormModalOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (openHistoryType) {
        const ref = historyRefs.current[openHistoryType];
        if (ref && !ref.contains(e.target as Node)) {
          setOpenHistoryType(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openHistoryType]);

  const toggleHistory = async (type: FormType) => {
    if (openHistoryType === type) {
      setOpenHistoryType(null);
      return;
    }
    setOpenHistoryType(type);
    if (!histories[type]) {
      setLoadingHistory(type);
      try {
        const data = await db.getFormHistory(type, 8);
        setHistories(prev => ({ ...prev, [type]: data as FormHistoryEntry[] }));
      } finally {
        setLoadingHistory(null);
      }
    }
  };

  const openFormWithData = (type: FormType, data: any) => {
    setSelectedFormType(type);
    // Reseta datas para HOJE (local) ao reemitir do histórico,
    // para evitar sobrescrever agendamentos com datas antigas.
    setInitialFormData({
      ...data,
      date: localDateStr(),
      displayDate: new Date().toLocaleDateString('pt-BR'),
      horarioAgendado: localDateTimeStr(), // novo datetime local, não o antigo
    });
    setIsFormModalOpen(true);
    setOpenHistoryType(null);
  };

  const openNewForm = (type: FormType) => {
    setSelectedFormType(type);
    setInitialFormData(null);
    setIsFormModalOpen(true);
    setOpenHistoryType(null);
  };

  const handleClose = () => {
    setIsFormModalOpen(false);
    setInitialFormData(null);
    // refresh history for the form that was just closed
    if (selectedFormType) {
      db.getFormHistory(selectedFormType, 8).then(data => {
        setHistories(prev => ({ ...prev, [selectedFormType!]: data as FormHistoryEntry[] }));
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8 text-center">Central de Emissões Operacionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(Object.keys(formConfigs) as FormType[]).map(type => {
            const cfg = formConfigs[type];
            const isHistOpen = openHistoryType === type;
            const typeHistories = histories[type] || [];
            return (
              <div
                key={type}
                ref={el => { historyRefs.current[type] = el; }}
                className="flex flex-col"
              >
                {/* Main card */}
                <button
                  onClick={() => openNewForm(type)}
                  className="flex items-center gap-5 p-5 bg-white rounded-t-[1.8rem] rounded-b-none border border-b-0 hover:shadow-lg transition-all group text-left"
                  style={{ borderColor: cfg.hex, borderLeftWidth: 4 }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: cfg.hex }}
                  >
                    <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-700 uppercase text-xs" style={{ color: cfg.hex }}>{cfg.title}</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 leading-tight">{cfg.description}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* History toggle button */}
                <button
                  onClick={() => toggleHistory(type)}
                  className="flex items-center justify-between px-5 py-2.5 border rounded-b-[1.8rem] transition-all text-left"
                  style={{
                    borderColor: cfg.hex,
                    borderTopWidth: 1,
                    backgroundColor: isHistOpen ? cfg.hex : 'white',
                    color: isHistOpen ? 'white' : cfg.hex,
                  }}
                >
                  <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Histórico de Emissões
                  </span>
                  <svg
                    className="w-3.5 h-3.5 transition-transform"
                    style={{ transform: isHistOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* History dropdown */}
                {isHistOpen && (
                  <div
                    className="border border-t-0 rounded-b-[1.8rem] overflow-hidden bg-white shadow-xl"
                    style={{ borderColor: cfg.hex }}
                  >
                    {/* Cabeçalho do histórico */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Emissões Anteriores</span>
                      <button
                        onClick={() => openNewForm(type)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase text-white transition-all active:scale-95"
                        style={{ backgroundColor: cfg.hex }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/>
                        </svg>
                        Novo
                      </button>
                    </div>

                    {loadingHistory === type ? (
                      <div className="flex items-center justify-center py-8 gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: cfg.hex }} />
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Carregando...</span>
                      </div>
                    ) : typeHistories.length === 0 ? (
                      <div className="py-8 text-center space-y-2">
                        <svg className="w-8 h-8 mx-auto text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                        <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Nenhum formulário emitido ainda</p>
                        <p className="text-[8px] text-slate-300 font-bold">
                          O histórico aparece após gerar o primeiro PDF
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar">
                        {typeHistories.map((entry, idx) => {
                          // Extrai campos relevantes para preview
                          const fd = entry.formData || {};
                          const preview = [
                            fd.os && `OS: ${fd.os}`,
                            fd.container && `CTR: ${fd.container}`,
                            fd.booking && `BK: ${fd.booking}`,
                          ].filter(Boolean).join(' · ');

                          return (
                            <button
                              key={entry.id}
                              onClick={() => openFormWithData(type, entry.formData)}
                              className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-blue-50/40 transition-all group text-left"
                            >
                              {/* Índice */}
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[9px] font-black"
                                style={{ backgroundColor: cfg.hex + '18', color: cfg.hex }}
                              >
                                {idx + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-800 uppercase truncate leading-tight">
                                  {entry.label || preview || '—'}
                                </p>
                                {preview && entry.label && (
                                  <p className="text-[8px] text-slate-400 font-bold truncate mt-0.5 uppercase">{preview}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-bold text-slate-400 uppercase">{entry.userName}</span>
                                  <span className="text-slate-200 text-[8px]">·</span>
                                  <span className="text-[8px] font-bold text-slate-400">{formatHistoryDate(entry.createdAt)}</span>
                                </div>
                              </div>

                              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest text-white"
                                  style={{ backgroundColor: cfg.hex }}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                  </svg>
                                  Reemitir
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isFormModalOpen && selectedFormType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[95vh]">
            <div className="p-6 text-white flex justify-between items-center" style={{ backgroundColor: formConfigs[selectedFormType].hex }}>
              <h3 className="font-black text-sm uppercase tracking-widest">{formConfigs[selectedFormType].title}</h3>
              <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/40 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {selectedFormType === 'ORDEM_COLETA' ? (
              <OrdemColetaForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialData={initialFormData} />
            ) : selectedFormType === 'PRE_STACKING' ? (
              <PreStackingForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialFormData={initialFormData} />
            ) : selectedFormType === 'LIBERACAO_VAZIO' ? (
              <LiberacaoVazioForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialFormData={initialFormData} />
            ) : selectedFormType === 'DEVOLUCAO_VAZIO' ? (
              <DevolucaoVazioForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialFormData={initialFormData} />
            ) : selectedFormType === 'RETIRADA_CHEIO' ? (
              <RetiradaCheioForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialFormData={initialFormData} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsTab;
