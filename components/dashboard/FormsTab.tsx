
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { User, Driver, Customer, Port, PreStacking, FormHistoryEntry } from '../../types';
import OrdemColetaForm from './forms/OrdemColetaForm';
import LiberacaoVazioForm from './forms/LiberacaoVazioForm';
import DevolucaoVazioForm from './forms/DevolucaoVazioForm';
import PreStackingForm from './forms/PreStackingForm';
import RetiradaCheioForm from './forms/RetiradaCheioForm';
import SmartOperationTable from './operations/SmartOperationTable';
import FeedbackModal from '../shared/FeedbackModal';
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
  const [activeView, setActiveView] = useState<'forms' | 'history'>('forms');

  // --- Forms view state ---
  const [selectedFormType, setSelectedFormType] = useState<FormType | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [initialFormData, setInitialFormData] = useState<any>(null);

  const [openHistoryType, setOpenHistoryType] = useState<FormType | null>(null);
  const [histories, setHistories] = useState<Partial<Record<FormType, FormHistoryEntry[]>>>({});
  const [loadingHistory, setLoadingHistory] = useState<FormType | null>(null);
  const historyRefs = useRef<Partial<Record<FormType, HTMLDivElement | null>>>({});

  // --- History view state ---
  const [allHistory, setAllHistory] = useState<FormHistoryEntry[]>([]);
  const [isLoadingAllHistory, setIsLoadingAllHistory] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {},
  });

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

  const loadAllHistory = useCallback(async () => {
    setIsLoadingAllHistory(true);
    try {
      const data = await db.getAllEmissoesHistory(500);
      setAllHistory(data);
    } finally {
      setIsLoadingAllHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'history') {
      loadAllHistory();
    }
  }, [activeView, loadAllHistory]);

  const fetchHistoryForType = (type: FormType): Promise<FormHistoryEntry[]> => {
    const map: Record<FormType, () => Promise<FormHistoryEntry[]>> = {
      ORDEM_COLETA:    () => db.getOrdemColetaHistory(8),
      PRE_STACKING:    () => db.getPreStackingEmissaoHistory(8),
      RETIRADA_CHEIO:  () => db.getRetiradaCheioHistory(8),
      DEVOLUCAO_VAZIO: () => db.getDevolucaoHistory(8),
      LIBERACAO_VAZIO: () => db.getLiberacaoHistory(8),
    };
    return map[type]();
  };

  const toggleHistory = async (type: FormType) => {
    if (openHistoryType === type) {
      setOpenHistoryType(null);
      return;
    }
    setOpenHistoryType(type);
    if (!histories[type]) {
      setLoadingHistory(type);
      try {
        const data = await fetchHistoryForType(type);
        setHistories(prev => ({ ...prev, [type]: data }));
      } finally {
        setLoadingHistory(null);
      }
    }
  };

  const openFormWithData = (type: FormType, data: any) => {
    setSelectedFormType(type);
    setInitialFormData({
      ...data,
      date: localDateStr(),
      displayDate: new Date().toLocaleDateString('pt-BR'),
      horarioAgendado: localDateTimeStr(),
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
    if (selectedFormType) {
      fetchHistoryForType(selectedFormType).then(data => {
        setHistories(prev => ({ ...prev, [selectedFormType!]: data }));
      });
    }
    if (activeView === 'history') {
      loadAllHistory();
    }
  };

  const handleDeleteHistory = useCallback((entry: FormHistoryEntry) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Registro',
      message: `Deseja remover "${entry.label || entry.formType}" do histórico? A viagem/documento original não será afetado.`,
      onConfirm: async () => {
        const ok = await db.deleteEmissao(entry.id, entry.formType);
        if (ok) {
          setAllHistory(prev => prev.filter(h => h.id !== entry.id));
          setHistories(prev => {
            const type = entry.formType as FormType;
            const updated = (prev[type] || []).filter(h => h.id !== entry.id);
            return { ...prev, [type]: updated };
          });
        }
      },
    });
  }, []);

  const handleReemitFromHistory = useCallback((entry: FormHistoryEntry) => {
    const type = entry.formType as FormType;
    if (!formConfigs[type]) return;
    openFormWithData(type, entry.formData);
  }, []);

  const historyColumns = useMemo(() => [
    {
      key: 'formType',
      label: 'Tipo',
      sortable: true,
      render: (row: FormHistoryEntry) => {
        const cfg = formConfigs[row.formType as FormType];
        if (!cfg) return <span className="text-[9px] font-black text-slate-400 uppercase">{row.formType}</span>;
        return (
          <span
            className="px-2.5 py-1 rounded-xl text-[8px] font-black uppercase text-white whitespace-nowrap"
            style={{ backgroundColor: cfg.hex }}
          >
            {cfg.title}
          </span>
        );
      },
    },
    {
      key: 'label',
      label: 'Referência',
      sortable: true,
      render: (row: FormHistoryEntry) => (
        <span className="text-[10px] font-black text-slate-700 uppercase">{row.label || '—'}</span>
      ),
    },
    {
      key: 'detalhes',
      label: 'Detalhes',
      render: (row: FormHistoryEntry) => {
        const fd = row.formData || {};
        const parts = [
          fd.os && `OS: ${fd.os}`,
          fd.container && `CTR: ${fd.container}`,
          fd.booking && `BK: ${fd.booking}`,
        ].filter(Boolean);
        return (
          <span className="text-[9px] font-bold text-slate-500 uppercase">{parts.join(' · ') || '—'}</span>
        );
      },
    },
    {
      key: 'userName',
      label: 'Gerado por',
      sortable: true,
      render: (row: FormHistoryEntry) => (
        <span className="text-[9px] font-bold text-slate-600">{row.userName || '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Data/Hora',
      sortable: true,
      sortValue: (row: FormHistoryEntry) => row.createdAt,
      render: (row: FormHistoryEntry) => (
        <span className="text-[9px] font-bold text-slate-500">{formatHistoryDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (row: FormHistoryEntry) => {
        const cfg = formConfigs[row.formType as FormType];
        return (
          <div className="flex items-center gap-2">
            {cfg && (
              <button
                onClick={() => handleReemitFromHistory(row)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase text-white transition-all active:scale-95 hover:opacity-80"
                style={{ backgroundColor: cfg.hex }}
                title="Reemitir"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Reemitir
              </button>
            )}
            <button
              onClick={() => handleDeleteHistory(row)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 transition-all active:scale-95"
              title="Excluir do histórico"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Excluir
            </button>
          </div>
        );
      },
    },
  ], [handleDeleteHistory, handleReemitFromHistory]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* View toggle tabs */}
      <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm w-fit">
        <button
          onClick={() => setActiveView('forms')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeView === 'forms'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Formulários
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeView === 'history'
              ? 'bg-slate-800 text-white shadow-lg'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Histórico
          {allHistory.length > 0 && activeView === 'history' && (
            <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-lg font-black">{allHistory.length}</span>
          )}
        </button>
      </div>

      {activeView === 'forms' && (
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
      )}

      {activeView === 'history' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Histórico de Emissões</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Registros dos últimos 90 dias · {allHistory.length} entradas</p>
            </div>
            <button
              onClick={loadAllHistory}
              disabled={isLoadingAllHistory}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
            >
              <svg className={`w-3.5 h-3.5 ${isLoadingAllHistory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Atualizar
            </button>
          </div>

          {isLoadingAllHistory ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Carregando histórico...</span>
            </div>
          ) : allHistory.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <svg className="w-12 h-12 mx-auto text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-[10px] font-black uppercase text-slate-300 tracking-widest">Nenhum registro encontrado</p>
              <p className="text-[9px] text-slate-300 font-bold">O histórico mostra formulários emitidos nos últimos 90 dias</p>
            </div>
          ) : (
            <div className="p-4">
              <SmartOperationTable
                userId={user.id}
                componentId="forms-history"
                columns={historyColumns}
                data={allHistory}
                noMaxHeight
                defaultVisibleKeys={['formType', 'label', 'detalhes', 'userName', 'createdAt', 'acoes']}
              />
            </div>
          )}
        </div>
      )}

      {/* Form modal */}
      {isFormModalOpen && selectedFormType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-[1700px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[95vh]">
            <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Formulários</p>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">{formConfigs[selectedFormType].title}</h3>
              </div>
              <button onClick={handleClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 rounded-full transition-all shadow-sm active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            {selectedFormType === 'ORDEM_COLETA' ? (
              <OrdemColetaForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialData={initialFormData} />
            ) : selectedFormType === 'PRE_STACKING' ? (
              <PreStackingForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialFormData={initialFormData} />
            ) : selectedFormType === 'LIBERACAO_VAZIO' ? (
              <LiberacaoVazioForm user={user} drivers={drivers} customers={customers} ports={ports} preStackings={preStacking} onClose={handleClose} initialFormData={initialFormData} />
            ) : selectedFormType === 'DEVOLUCAO_VAZIO' ? (
              <DevolucaoVazioForm user={user} drivers={drivers} customers={customers} ports={ports} preStackings={preStacking} onClose={handleClose} initialFormData={initialFormData} />
            ) : selectedFormType === 'RETIRADA_CHEIO' ? (
              <RetiradaCheioForm user={user} drivers={drivers} customers={customers} ports={ports} onClose={handleClose} initialFormData={initialFormData} />
            ) : null}
          </div>
        </div>
      )}

      <FeedbackModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type="confirm"
        confirmLabel="Excluir"
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
      />
    </div>
  );
};

export default FormsTab;
