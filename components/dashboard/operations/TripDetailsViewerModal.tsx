
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trip, User } from '../../../types';
import { db } from '../../../utils/storage';
import ImageViewer from '../../shared/ImageViewer';
import DocumentViewerModal from './DocumentViewerModal';
import { emailFormatter } from '../../../utils/emailFormatter';

interface TripDetailsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  allTrips?: Trip[];
  user: User;
  onManageHistory?: () => void;
}

const CopyBtn: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value || value === '---') return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} title="Copiar"
      className={`ml-1.5 p-0.5 rounded transition-all shrink-0 ${copied ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}
    >
      {copied
        ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
        : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"/></svg>
      }
    </button>
  );
};

const TripDetailsViewerModal: React.FC<TripDetailsViewerModalProps> = ({ isOpen, onClose, trip, allTrips = [], user, onManageHistory }) => {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{ url: string; title: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  const [textCopied, setTextCopied] = useState(false);
  const [textModal, setTextModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      Promise.all([db.getCategories(), db.getOperationTypes()]).then(([cats, opTypes]) => {
        setCategories(cats);
        setOperationTypes(opTypes);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const catColor = categories.find((c: any) => c.name === trip.category)?.color;
  const typeColor = operationTypes.find((ot: any) => ot.name?.toUpperCase() === trip.type?.toUpperCase())?.color;

  const fmtFull = (dt: string) => {
    const d = new Date(dt);
    return `${d.toLocaleDateString('pt-BR')}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Copia o texto do Painel Operacional (mesmo formato do "copiar texto":
  // OS, CONTAINER, MOTORISTA, STATUS, PREVISÃO)
  const copyOperationalText = () => {
    const text = emailFormatter.toPlainText(trip, allTrips);
    navigator.clipboard.writeText(text).then(() => {
      setTextCopied(true);
      setTimeout(() => setTextCopied(false), 2000);
    });
  };

  const Field = ({ label, value, color = 'text-slate-800', copyable = false, mono = false }: {
    label: string; value: string; color?: string; copyable?: boolean; mono?: boolean;
  }) => (
    <div className="space-y-0.5">
      <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <div className="flex items-center">
        <span className={`text-[10px] font-black uppercase leading-tight ${color} ${mono ? 'font-mono' : ''}`}>
          {value || '---'}
        </span>
        {copyable && value && value !== '---' && <CopyBtn value={value} />}
      </div>
    </div>
  );

  const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <div className="text-blue-500 shrink-0">{icon}</div>
        <h4 className="text-[8px] font-black text-slate-700 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const isCompleted = trip.isCompleted || trip.status === 'Viagem concluída';

  return createPortal(
    <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-100 flex flex-col animate-in slide-in-from-bottom duration-300">

        {/* HEADER */}
        <header className="px-8 py-4 bg-slate-900 flex items-center justify-between shrink-0 shadow-xl z-10">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Dossiê da Operação</p>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-black text-white text-sm uppercase tracking-widest leading-none">OS {trip.os}</h2>
                {trip.type && (
                  <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-white/10 text-white/70 border border-white/15">
                    {trip.type}
                  </span>
                )}
                {trip.category && (
                  <span
                    className="px-2 py-0.5 rounded text-[8px] font-black uppercase border"
                    style={catColor
                      ? { backgroundColor: catColor, color: 'white', borderColor: catColor }
                      : { backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                  >
                    {trip.category}
                  </span>
                )}
              </div>
              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{trip.driver.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setTextModal(true); setTextCopied(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Copiar Texto
            </button>
            <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border ${isCompleted ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-blue-600 border-blue-500 text-white'}`}>
              {trip.status}
            </span>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/10 border border-white/15 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-all active:scale-90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </header>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex">

          {/* CONTEÚDO PRINCIPAL */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">

            {/* Linha 1: Logística + Equipamento + Transporte */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Section title="Logística" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>}>
                <div className="space-y-3.5">
                  <Field label="Navio" value={trip.ship} copyable />
                  <Field label="Booking" value={trip.booking} color="text-blue-600" copyable />
                  <Field label="Armador" value={trip.agencia || ''} copyable />
                  <Field label="Data Programada" value={fmtFull(trip.dateTime)} />
                  <div className="space-y-0.5">
                    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Vínculo</p>
                    {trip.category ? (
                      <span
                        className="px-2 py-0.5 rounded text-[8px] font-black uppercase border inline-block"
                        style={catColor ? { backgroundColor: catColor, color: 'white', borderColor: catColor } : { backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                      >
                        {trip.category}
                      </span>
                    ) : <span className="text-[9.5px] font-black uppercase text-slate-400">---</span>}
                  </div>
                </div>
              </Section>

              <Section title="Equipamento" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>}>
                <div className="space-y-3.5">
                  <Field label="Nº Container" value={trip.container} color="text-blue-700" copyable mono />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo" value={trip.containerType || '40HC'} copyable />
                    <Field label="Tara" value={trip.tara ? `${trip.tara} kg` : ''} />
                  </div>
                  <Field label="Lacre" value={trip.seal || ''} copyable />
                  <Field label="CVA" value={trip.cva || ''} color="text-amber-600" copyable />
                  {(trip as any).autColeta && <Field label="Aut. de Coleta" value={(trip as any).autColeta} copyable />}
                  <Field label="OS" value={trip.os} copyable />
                </div>
              </Section>

              <Section title="Transporte" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}>
                <div className="space-y-3.5">
                  <Field label="Motorista" value={trip.driver.name} copyable />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cavalo" value={trip.driver.plateHorse} color="text-slate-900" copyable />
                    <Field label="Carreta" value={trip.driver.plateTrailer} color="text-slate-600" copyable />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="CPF" value={trip.driver.cpf || ''} copyable />
                    <Field label="Telefone" value={trip.driver.phone || ''} copyable />
                  </div>
                </div>
              </Section>
            </div>

            {/* Linha 2: Origem + Destino */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Section title="Origem / Cliente" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}>
                <div className="space-y-3">
                  <Field label="Razão Social" value={trip.customer.legalName || trip.customer.name} />
                  <Field label="Localidade" value={`${trip.customer.city || ''} - ${trip.customer.state || ''}`} />
                  <Field label="CNPJ" value={trip.customer.cnpj || ''} />
                </div>
              </Section>

              <Section title="Destino / Terminal" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}>
                <div className="space-y-3">
                  <Field label="Unidade" value={trip.scheduling?.location || trip.destination?.name || 'A DEFINIR'} color="text-blue-700" />
                  {trip.scheduling
                    ? <>
                        <Field label="Janela Agendada" value={fmtFull(trip.scheduling.dateTime)} />
                        <Field label="Obs. de Agenda" value={trip.scheduling.obs || 'Nenhuma nota'} />
                      </>
                    : <Field label="Agendamento" value="PENDENTE DE MARCAÇÃO" color="text-amber-500" />}
                </div>
              </Section>
            </div>

            {/* Linha 3: Documentos */}
            <Section title="Documentos" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { label: 'OS PDF', doc: trip.osDoc, color: 'bg-emerald-600 hover:bg-emerald-700' },
                  { label: 'AGEND.', doc: trip.agendamentoDoc, color: 'bg-blue-600 hover:bg-blue-700' },
                  { label: 'CT-E', doc: trip.cteDoc, color: 'bg-indigo-600 hover:bg-indigo-700' },
                  { label: 'CONTRATO', doc: trip.freightContractDoc, color: 'bg-slate-700 hover:bg-slate-800' },
                  { label: 'DOSSIÊ', doc: trip.completoDoc, color: 'bg-slate-900 hover:bg-black' },
                ].map((item, idx) => item.doc ? (
                  <button key={idx} onClick={() => setDocPreview({ url: item.doc!.url, title: item.label })}
                    className={`flex items-center gap-2 px-4 py-2 ${item.color} text-white rounded-xl shadow-md transition-all active:scale-95 shrink-0`}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                    <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                ) : null)}
                {!trip.osDoc && !trip.agendamentoDoc && !trip.cteDoc && !trip.freightContractDoc && !trip.completoDoc && (
                  <p className="text-[9px] font-bold text-slate-400 uppercase italic">Sem documentos anexados.</p>
                )}
              </div>
            </Section>

            {/* Linha 4: Galeria de fotos */}
            {trip.driver_docs && trip.driver_docs.length > 0 && (
              <Section title="Fotos do Motorista" icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}>
                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                  {trip.driver_docs.map((img) => (
                    <button key={img.id} onClick={() => setActivePhoto(img.url)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-blue-500 hover:scale-105 transition-all relative bg-slate-50"
                    >
                      <img src={img.url} className="w-full h-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* SIDEBAR — TIMELINE */}
          <div className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Linha do Tempo</h4>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">{(trip.statusHistory || []).length} eventos</p>
              </div>
              {onManageHistory && (
                <button onClick={onManageHistory}
                  className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                  title="Editar Histórico"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
              {[...(trip.statusHistory || [])].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map((step, idx, arr) => (
                <div key={idx} className="flex gap-3 relative">
                  {idx < arr.length - 1 && (
                    <div className="absolute left-[5px] top-4 bottom-[-12px] w-[1.5px] bg-slate-100" />
                  )}
                  <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 shadow-sm ${idx === 0 ? 'bg-blue-600 ring-2 ring-blue-100 animate-pulse' : 'bg-slate-200'}`} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[8.5px] font-black uppercase leading-tight ${idx === 0 ? 'text-blue-700' : 'text-slate-600'}`}>{step.status}</p>
                    <p className="text-[7px] font-mono text-slate-400 mt-0.5">
                      {new Date(step.dateTime).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {new Date(step.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 text-center bg-slate-50">
              <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Sincronizado • ALS SSZ</p>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-MODAL: TEXTO DO PAINEL OPERACIONAL (ver + copiar/enviar) */}
      {textModal && (
        <div className="fixed inset-0 z-[9100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="px-7 py-5 bg-slate-900 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-0.5">Painel Operacional</p>
                <h3 className="text-sm font-black text-white uppercase">Previsão / Status</h3>
              </div>
              <button onClick={() => setTextModal(false)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
            </div>
            <div className="p-7 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-2">Prévia</p>
                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">{emailFormatter.toPlainText(trip, allTrips)}</pre>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setTextModal(false)} className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all">Fechar</button>
                <button
                  onClick={copyOperationalText}
                  className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${textCopied ? 'bg-emerald-600 text-white' : 'bg-amber-500 hover:bg-amber-400 text-white active:scale-95 shadow-lg shadow-amber-500/20'}`}
                >
                  {textCopied
                    ? <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> Copiado</>
                    : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"/></svg> Copiar Texto</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO VIEWER */}
      {activePhoto && (
        <div className="fixed inset-0 z-[9200] bg-black/95 flex flex-col animate-in fade-in duration-200">
          <header className="h-14 flex justify-between items-center px-6 border-b border-white/10 shrink-0">
            <span className="text-white font-black uppercase text-[9px] tracking-widest">Visualização</span>
            <button onClick={() => setActivePhoto(null)} className="text-white p-2 hover:bg-white/10 rounded-full transition-all">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
            </button>
          </header>
          <div className="flex-1 p-6 flex items-center justify-center overflow-hidden">
            <div className="w-full h-full max-w-4xl max-h-[80vh]">
              <ImageViewer url={activePhoto} />
            </div>
          </div>
        </div>
      )}

      {docPreview && (
        <DocumentViewerModal isOpen={true} onClose={() => setDocPreview(null)} url={docPreview.url} title={docPreview.title} />
      )}
    </div>,
    document.body
  );
};

export default TripDetailsViewerModal;
