
import React, { useState, useEffect } from 'react';
import { Trip, User } from '../../../types';
import { db } from '../../../utils/storage';
import ImageViewer from '../../shared/ImageViewer';
import DocumentViewerModal from './DocumentViewerModal';
import DateTimePicker from '../../shared/DateTimePicker';

interface TripDetailsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
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
    <button
      onClick={copy}
      title="Copiar"
      className={`ml-1.5 p-0.5 rounded transition-all shrink-0 ${copied ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500'}`}
    >
      {copied ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"/>
        </svg>
      )}
    </button>
  );
};

const TripDetailsViewerModal: React.FC<TripDetailsViewerModalProps> = ({ isOpen, onClose, trip, user, onManageHistory }) => {
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<{ url: string; title: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  const [aeModal, setAeModal] = useState(false);
  const [aeDateTime, setAeDateTime] = useState('');
  const [aeCopied, setAeCopied] = useState(false);

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

  const fmt = (dt: string) => {
    const d = new Date(dt);
    return `${d.toLocaleDateString('pt-BR')}`;
  };
  const fmtFull = (dt: string) => {
    const d = new Date(dt);
    return `${d.toLocaleDateString('pt-BR')}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };
  const fmtAeDateTime = (dt: string) => {
    if (!dt) return '';
    const d = new Date(dt);
    return `${d.toLocaleDateString('pt-BR')}, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const buildAeText = () => {
    const clientFirst = (trip.customer.name || '').trim().split(/\s+/)[0].toUpperCase();
    const city = (trip.customer.city || '').toUpperCase();
    const state = (trip.customer.state || '').toUpperCase();
    const location = city && state ? ` - ${city}/${state}` : city ? ` - ${city}` : '';
    return [
      `> PROGRAMAÇÃO: (${clientFirst}${location})`,
      `* OS: \`${trip.os || ''}\``,
      `* Container: \`${trip.container || ''}\``,
      `* Data e Hora: \`${fmtFull(trip.dateTime)}\``,
      `* Motorista: \`${trip.driver.name || ''}\``,
      `* Cavalo: \`${trip.driver.plateHorse || ''}\``,
      `* Carreta: \`${trip.driver.plateTrailer || ''}\``,
      `*\`GERAR AE:\` ${fmtAeDateTime(aeDateTime)}*`,
    ].join('\n');
  };

  const copyAe = () => {
    const text = buildAeText();
    navigator.clipboard.writeText(text).then(() => {
      setAeCopied(true);
      setTimeout(() => setAeCopied(false), 2000);
    });
  };

  const SectionTitle = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 mb-3">
      <div className="text-blue-600 shrink-0">{icon}</div>
      <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">{title}</h4>
    </div>
  );

  const DataItem = ({ label, value, color = "text-slate-700", copyable = false }: { label: string; value: string; color?: string; copyable?: boolean }) => (
    <div className="flex flex-col">
      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</span>
      <div className="flex items-center">
        <span className={`text-[9.5px] font-black uppercase truncate ${color}`}>{value || '---'}</span>
        {copyable && value && value !== '---' && <CopyBtn value={value} />}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">

        {/* HEADER */}
        <header className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
              <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Dossiê Detalhado da Operação</p>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black uppercase leading-none">OS {trip.os}</h3>
                {trip.type && (
                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-black uppercase border"
                    style={typeColor ? { backgroundColor: `${typeColor}30`, color: typeColor, borderColor: `${typeColor}60` } : { backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                  >
                    {trip.type}
                  </span>
                )}
                {trip.category && (
                  <span
                    className="px-2 py-0.5 rounded text-[9px] font-black uppercase border"
                    style={catColor ? { backgroundColor: catColor, color: 'white', borderColor: catColor } : { backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                  >
                    {trip.category}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setAeModal(true); setAeCopied(false); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-amber-500/20"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Gerar AE
            </button>
            <span className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase border ${trip.isCompleted || trip.status === 'Viagem concluída' ? 'bg-emerald-600 border-emerald-500' : 'bg-blue-600 border-blue-500'}`}>
              {trip.status}
            </span>
            <button onClick={onClose} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex">
          {/* COLUNA ESQUERDA */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

            <div className="grid grid-cols-3 gap-6">
               {/* LOGÍSTICA */}
               <section>
                  <SectionTitle title="Logística" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
                  <div className="space-y-3">
                    <DataItem label="Navio" value={trip.ship} copyable />
                    <DataItem label="Booking" value={trip.booking} color="text-blue-600" copyable />
                    <DataItem label="Armador" value={trip.agencia || '---'} color="text-slate-500" copyable />
                    <DataItem label="Data Programada" value={new Date(trip.dateTime).toLocaleString('pt-BR')} />
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Categoria</span>
                      {trip.category ? (
                        <span
                          className="px-2 py-0.5 rounded text-[8px] font-black uppercase border w-fit"
                          style={catColor ? { backgroundColor: catColor, color: 'white', borderColor: catColor } : { backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
                        >
                          {trip.category}
                        </span>
                      ) : <span className="text-[9.5px] font-black uppercase text-slate-400">---</span>}
                    </div>
                  </div>
               </section>

               {/* EQUIPAMENTO */}
               <section>
                  <SectionTitle title="Equipamento" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>} />
                  <div className="space-y-3">
                    <DataItem label="Nº Container" value={trip.container} color="text-blue-700 font-mono" copyable />
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tipo</span>
                      <div className="flex items-center">
                        <span className="text-[9.5px] font-black uppercase text-slate-700">{trip.containerType || '40HC'}</span>
                        <CopyBtn value={trip.containerType || '40HC'} />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tara</span>
                      <div className="flex items-center">
                        <span className="text-[9.5px] font-black uppercase text-slate-700">{trip.tara || '---'}</span>
                        {trip.tara && <CopyBtn value={trip.tara} />}
                      </div>
                    </div>
                    <DataItem label="Lacre Oficial" value={trip.seal || ''} />
                    <DataItem label="CVA" value={trip.cva || ''} color="text-amber-600" copyable />
                    {(trip as any).autColeta && (
                      <DataItem label="Aut. de Coleta" value={(trip as any).autColeta} copyable />
                    )}
                    <div className="flex flex-col">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">OS</span>
                      <div className="flex items-center">
                        <span className="text-[9.5px] font-black uppercase text-slate-700">{trip.os || '---'}</span>
                        {trip.os && <CopyBtn value={trip.os} />}
                      </div>
                    </div>
                  </div>
               </section>

               {/* MOTORISTA */}
               <section>
                  <SectionTitle title="Transporte" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} />
                  <div className="space-y-3">
                    <DataItem label="Motorista" value={trip.driver.name} copyable />
                    <div className="flex gap-4">
                      <DataItem label="CPF" value={trip.driver.cpf || '---'} copyable />
                      <DataItem label="Telefone" value={trip.driver.phone || '---'} copyable />
                    </div>
                    <div className="flex gap-4">
                      <DataItem label="Cavalo" value={trip.driver.plateHorse} color="text-slate-900 font-bold" copyable />
                      <DataItem label="Carreta" value={trip.driver.plateTrailer} color="text-slate-500 font-bold" copyable />
                    </div>
                  </div>
               </section>
            </div>

            {/* ORIGEM E DESTINO */}
            <div className="grid grid-cols-2 gap-6">
               <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100">
                  <SectionTitle title="Origem / Cliente" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>} />
                  <div className="space-y-2">
                    <DataItem label="Razão Social" value={trip.customer.legalName || trip.customer.name} />
                    <DataItem label="Localidade" value={`${trip.customer.city} - ${trip.customer.state}`} />
                    <DataItem label="CNPJ" value={trip.customer.cnpj || '---'} />
                  </div>
               </div>
               <div className="bg-blue-50/30 p-5 rounded-[1.5rem] border border-blue-100/50">
                  <SectionTitle title="Destino / Terminal" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
                  <div className="space-y-2">
                    <DataItem label="Unidade" value={trip.scheduling?.location || trip.destination?.name || 'A DEFINIR'} color="text-blue-700" />
                    {trip.scheduling ? (
                      <>
                        <DataItem label="Janela Agendada" value={new Date(trip.scheduling.dateTime).toLocaleString('pt-BR')} />
                        <DataItem label="Observações de Agenda" value={trip.scheduling.obs || 'Nenhuma nota'} />
                      </>
                    ) : <DataItem label="Status Agendamento" value="PENDENTE DE MARCAÇÃO" color="text-red-500" />}
                  </div>
               </div>
            </div>

            {/* DOCUMENTOS */}
            <section>
              <SectionTitle title="Dossiê de Documentos (PDF)" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
              <div className="flex flex-wrap gap-2.5">
                {[
                  { label: 'OS PDF', doc: trip.osDoc, color: 'bg-emerald-600' },
                  { label: 'AGEND.', doc: trip.agendamentoDoc, color: 'bg-blue-600' },
                  { label: 'CT-E', doc: trip.cteDoc, color: 'bg-indigo-600' },
                  { label: 'CONTRATO', doc: trip.freightContractDoc, color: 'bg-slate-700' },
                  { label: 'DOSSIÊ', doc: trip.completoDoc, color: 'bg-slate-900' }
                ].map((item, idx) => item.doc ? (
                  <button
                    key={idx}
                    onClick={() => setDocPreview({ url: item.doc!.url, title: item.label })}
                    className={`flex items-center gap-2 px-3 py-2 ${item.color} text-white rounded-lg shadow-md hover:scale-105 transition-all group shrink-0`}
                  >
                    <svg className="w-3 h-3 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
                    <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                  </button>
                ) : null)}
                {(!trip.osDoc && !trip.agendamentoDoc && !trip.cteDoc && !trip.freightContractDoc && !trip.completoDoc) && (
                   <p className="text-[8px] font-bold text-slate-300 uppercase italic">Aguardando anexos do escritório.</p>
                )}
              </div>
            </section>

            {/* GALERIA */}
            <section>
              <SectionTitle title="Fotos Enviadas pelo Motorista" icon={<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>} />
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-2">
                {trip.driver_docs && trip.driver_docs.length > 0 ? trip.driver_docs.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setActivePhoto(img.url)}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm hover:ring-2 hover:ring-blue-500 transition-all group relative bg-slate-50"
                  >
                    <img src={img.url} className="w-full h-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                )) : (
                   <p className="text-[8px] font-bold text-slate-300 uppercase italic col-span-full">Sem evidências fotográficas registradas.</p>
                )}
              </div>
            </section>
          </div>

          {/* TIMELINE */}
          <div className="w-64 bg-slate-50 border-l border-slate-200 flex flex-col shrink-0">
             <div className="p-5 bg-white border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Linha do Tempo</h4>
                  <p className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Histórico Real</p>
                </div>
                {onManageHistory && (
                  <button
                    onClick={onManageHistory}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm group"
                    title="Editar Histórico"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732"/>
                    </svg>
                  </button>
                )}
             </div>
             <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {[...(trip.statusHistory || [])].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map((step, idx, arr) => (
                  <div key={idx} className="flex gap-3 relative">
                     {idx < arr.length - 1 && (
                       <div className="absolute left-[4.5px] top-4 bottom-[-16px] w-[1.5px] bg-slate-200"></div>
                     )}
                     <div className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 border border-white shadow-sm ${idx === 0 ? 'bg-blue-600 ring-2 ring-blue-50 animate-pulse' : 'bg-slate-300'}`}></div>
                     <div className="min-w-0">
                        <p className={`text-[8px] font-black uppercase leading-tight truncate ${idx === 0 ? 'text-blue-700' : 'text-slate-600'}`}>{step.status}</p>
                        <p className="text-[7.5px] font-mono text-slate-400 mt-0.5">{new Date(step.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {new Date(step.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</p>
                     </div>
                  </div>
                ))}
             </div>
             <div className="p-5 bg-white border-t border-slate-200 text-center">
                <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest">Sincronizado ALS SSZ</p>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL GERAR AE */}
      {aeModal && (
        <div className="fixed inset-0 z-[3100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest mb-0.5">Autorização de Entrada</p>
                <h3 className="text-[15px] font-black uppercase">Gerar AE</h3>
              </div>
              <button onClick={() => setAeModal(false)} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
              </button>
            </div>

            <div className="p-7 space-y-6">
              {/* Preview do texto */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Prévia do texto copiado</p>
                <pre className="text-[10px] font-mono text-slate-700 whitespace-pre leading-relaxed">
                  {buildAeText()}
                </pre>
              </div>

              {/* Seleção de data/hora AE */}
              <div className="space-y-2">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 block">
                  Data e Hora para Gerar AE
                </label>
                <DateTimePicker
                  value={aeDateTime}
                  onChange={setAeDateTime}
                  placeholder="Selecione a data e hora..."
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setAeModal(false)}
                  className="flex-1 py-3.5 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={copyAe}
                  disabled={!aeDateTime}
                  className={`flex-1 py-3.5 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${
                    !aeDateTime
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : aeCopied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-400 text-white active:scale-95 shadow-lg shadow-amber-500/20'
                  }`}
                >
                  {aeCopied ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                      Copiado
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3"/></svg>
                      Copiar texto
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEWERS */}
      {activePhoto && (
        <div className="fixed inset-0 z-[3000] bg-black/95 flex flex-col animate-in fade-in duration-300">
           <header className="h-16 flex justify-between items-center px-6 border-b border-white/10 shrink-0 pt-4">
              <span className="text-white font-black uppercase text-[9px] tracking-widest">Visualização em Tela Cheia</span>
              <button onClick={() => setActivePhoto(null)} className="text-white p-2 hover:bg-white/10 rounded-full transition-all">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
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
    </div>
  );
};

export default TripDetailsViewerModal;
