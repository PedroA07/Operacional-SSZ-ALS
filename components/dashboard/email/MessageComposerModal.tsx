import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, MessageTemplate, Customer, Port, PreStacking, Trip } from '../../../types';
import { db } from '../../../utils/storage';
import { showToast } from '../../shared/SimpleToast';

interface MessageComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template: MessageTemplate | null;
  user: User;
  trips: Trip[];
}

type EntityKind = 'CLIENTE' | 'PORTO' | 'PRESTACKING';

interface EntityRecord {
  id: string;
  name: string;        // Nome Fantasia
  legalName?: string;  // Razão Social
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

// --- Helpers de endereço / Google Maps ---------------------------------------
const buildFullAddress = (e: EntityRecord): string => {
  const parts: string[] = [];
  if (e.address) parts.push(e.address.trim());
  if (e.neighborhood) parts.push(e.neighborhood.trim());
  const cityState = [e.city, e.state].filter(Boolean).join(' - ');
  if (cityState) parts.push(cityState);
  if (e.zipCode) parts.push(`CEP ${e.zipCode.trim()}`);
  return parts.filter(Boolean).join(', ');
};

const buildMapsLink = (e: EntityRecord): string => {
  const query = encodeURIComponent(buildFullAddress(e) || e.legalName || e.name);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

// --- Render do preview no estilo WhatsApp ------------------------------------
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const renderWhatsApp = (text: string): string => {
  let html = escapeHtml(text);
  // Links (auto-link de URLs, como faz o WhatsApp)
  html = html.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noreferrer" style="color:#027eb5;text-decoration:underline;word-break:break-all;">$1</a>');
  // Monospace ```texto```
  html = html.replace(/```([\s\S]+?)```/g, '<code style="font-family:monospace;background:rgba(0,0,0,0.05);padding:0 2px;border-radius:3px;">$1</code>');
  // Negrito *texto*
  html = html.replace(/(^|[\s>])\*(?!\s)([^*\n]+?)\*(?=[\s<.,!?:;)]|$)/g, '$1<strong>$2</strong>');
  // Itálico _texto_
  html = html.replace(/(^|[\s>])_(?!\s)([^_\n]+?)_(?=[\s<.,!?:;)]|$)/g, '$1<em>$2</em>');
  // Tachado ~texto~
  html = html.replace(/(^|[\s>])~(?!\s)([^~\n]+?)~(?=[\s<.,!?:;)]|$)/g, '$1<del>$2</del>');
  // Quebras de linha
  html = html.replace(/\n/g, '<br/>');
  return html;
};

const MessageComposerModal: React.FC<MessageComposerModalProps> = ({ isOpen, onClose, onSuccess, template, user, trips }) => {
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStackings, setPreStackings] = useState<PreStacking[]>([]);

  const [entityKind, setEntityKind] = useState<EntityKind>('CLIENTE');
  const [entitySearch, setEntitySearch] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  const [tripSearch, setTripSearch] = useState('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(template?.name || '');
    setBody(template?.body || '');
    setSelectedEntityId(null);
    setEntitySearch('');
    setSelectedTripId(null);
    setTripSearch('');
    (async () => {
      try {
        const [c, p, ps] = await Promise.all([db.getCustomers(), db.getPorts(), db.getPreStacking()]);
        setCustomers(c);
        setPorts(p);
        setPreStackings(ps);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [isOpen, template]);

  const entities: EntityRecord[] = useMemo(() => {
    if (entityKind === 'CLIENTE') return customers as EntityRecord[];
    if (entityKind === 'PORTO') return ports as EntityRecord[];
    return preStackings as EntityRecord[];
  }, [entityKind, customers, ports, preStackings]);

  const filteredEntities = useMemo(() => {
    const term = entitySearch.trim().toLowerCase();
    const list = term
      ? entities.filter(e =>
          (e.name || '').toLowerCase().includes(term) ||
          (e.legalName || '').toLowerCase().includes(term))
      : entities;
    return list.slice(0, 50);
  }, [entities, entitySearch]);

  const selectedEntity = useMemo(
    () => entities.find(e => e.id === selectedEntityId) || null,
    [entities, selectedEntityId]
  );

  const filteredTrips = useMemo(() => {
    const term = tripSearch.trim().toLowerCase();
    if (!term) return [];
    return trips.filter(t =>
      (t.os || '').toLowerCase().includes(term) ||
      (t.container || '').toLowerCase().includes(term) ||
      (t.booking || '').toLowerCase().includes(term)
    ).slice(0, 8);
  }, [trips, tripSearch]);

  const selectedTrip = useMemo(
    () => trips.find(t => t.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  // Insere texto na posição do cursor do textarea
  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setBody(prev => prev + text);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + text + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  // Aplica formatação WhatsApp ao texto selecionado
  const wrapSelection = (marker: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const selected = body.slice(start, end) || 'texto';
    const next = body.slice(0, start) + marker + selected + marker + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  };

  const insertField = (field: 'fantasia' | 'razao' | 'endereco' | 'maps') => {
    if (!selectedEntity) {
      showToast('Selecione um registro primeiro.', 'warning');
      return;
    }
    let value = '';
    if (field === 'fantasia') value = selectedEntity.name || selectedEntity.legalName || '';
    else if (field === 'razao') value = selectedEntity.legalName || selectedEntity.name || '';
    else if (field === 'endereco') value = buildFullAddress(selectedEntity) || '(sem endereço cadastrado)';
    else if (field === 'maps') {
      const addr = buildFullAddress(selectedEntity);
      value = `${addr ? addr + '\n' : ''}${buildMapsLink(selectedEntity)}`;
    }
    insertAtCursor(value);
  };

  const insertTripField = (field: 'os' | 'container' | 'booking' | 'data' | 'hora') => {
    if (!selectedTrip) {
      showToast('Selecione uma viagem primeiro.', 'warning');
      return;
    }
    let value = '';
    if (field === 'os') value = selectedTrip.os || '';
    else if (field === 'container') value = selectedTrip.container || '';
    else if (field === 'booking') value = selectedTrip.booking || selectedTrip.ocFormData?.booking || selectedTrip.preStackingFormData?.booking || '';
    else if (field === 'data') value = selectedTrip.dateTime ? new Date(selectedTrip.dateTime).toLocaleDateString('pt-BR') : '';
    else if (field === 'hora') value = selectedTrip.dateTime ? new Date(selectedTrip.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
    if (!value) {
      showToast('Esse campo está vazio nesta viagem.', 'info');
      return;
    }
    insertAtCursor(value);
  };

  const insertNow = (field: 'data' | 'hora') => {
    const now = new Date();
    const value = field === 'data'
      ? now.toLocaleDateString('pt-BR')
      : now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    insertAtCursor(value);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast('Dê um nome ao modelo.', 'warning');
      return;
    }
    if (!body.trim()) {
      showToast('A mensagem está vazia.', 'warning');
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const payload: MessageTemplate = {
        id: template?.id || `msg-${Date.now()}`,
        name: name.trim(),
        body,
        createdAt: template?.createdAt || now,
        updatedAt: now
      };
      const ok = await db.saveMessageTemplate(payload, user);
      if (ok) {
        showToast('Mensagem pronta salva!', 'success');
        onSuccess();
        onClose();
      } else {
        showToast('Erro ao salvar a mensagem.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      showToast('Mensagem copiada para a área de transferência!', 'success');
    } catch {
      showToast('Erro ao copiar a mensagem.', 'error');
    }
  };

  const handleOpenWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
  };

  if (!isOpen) return null;

  const kindLabel: Record<EntityKind, string> = {
    CLIENTE: 'Clientes',
    PORTO: 'Portos',
    PRESTACKING: 'Pré-Stackings'
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-[85vw] max-h-[92vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-8 bg-emerald-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-300" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15c-1.52 0-3.01-.41-4.31-1.18l-.31-.18-3.2.84.85-3.12-.2-.32a8.18 8.18 0 01-1.26-4.36c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 012.41 5.82c0 4.54-3.69 8.49-8.23 8.49z"/></svg>
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tight">{template ? 'Editar Mensagem Pronta' : 'Nova Mensagem Pronta'}</h3>
              <p className="text-[10px] text-emerald-300/80 font-bold uppercase tracking-widest mt-1">Modelo formatado para WhatsApp</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50">
          <div className="grid grid-cols-2 gap-8">
            {/* Coluna esquerda: edição */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Modelo</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                    placeholder="Ex.: Aviso de agendamento"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Mensagem</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => wrapSelection('*')} title="Negrito" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 font-black text-sm transition-colors">B</button>
                      <button onClick={() => wrapSelection('_')} title="Itálico" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 italic font-bold text-sm transition-colors">i</button>
                      <button onClick={() => wrapSelection('~')} title="Tachado" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 line-through font-bold text-sm transition-colors">S</button>
                      <button onClick={() => wrapSelection('```')} title="Monoespaçado" className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-700 font-mono font-bold text-sm transition-colors">{'</>'}</button>
                    </div>
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="w-full h-64 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800 focus:border-emerald-500 outline-none resize-y leading-relaxed"
                    placeholder="Escreva a mensagem... Selecione um texto e use os botões de formatação, ou insira referências de clientes, portos e pré-stackings ao lado."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-500 ml-1">
                    Formatação WhatsApp: <strong>*negrito*</strong>, <em>_itálico_</em>, <del>~tachado~</del>, <code className="font-mono">```mono```</code>
                  </p>
                </div>
              </div>

              {/* Inserir referências */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3">Inserir Referência</h4>

                <div className="flex gap-2">
                  {(['CLIENTE', 'PORTO', 'PRESTACKING'] as EntityKind[]).map(k => (
                    <button
                      key={k}
                      onClick={() => { setEntityKind(k); setSelectedEntityId(null); setEntitySearch(''); }}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${entityKind === k ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {kindLabel[k]}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                  placeholder={`Buscar ${kindLabel[entityKind].toLowerCase()}...`}
                  value={entitySearch}
                  onChange={e => setEntitySearch(e.target.value)}
                />

                <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl divide-y divide-slate-100">
                  {filteredEntities.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic p-4 text-center">Nenhum registro encontrado.</p>
                  ) : filteredEntities.map(e => (
                    <button
                      key={e.id}
                      onClick={() => setSelectedEntityId(e.id)}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${selectedEntityId === e.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className="text-[11px] font-black text-slate-800 uppercase leading-tight">{e.name || e.legalName}</div>
                      {e.legalName && e.legalName !== e.name && (
                        <div className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{e.legalName}</div>
                      )}
                      <div className="text-[9px] text-slate-400 font-medium">{[e.city, e.state].filter(Boolean).join(' - ')}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => insertField('fantasia')} disabled={!selectedEntity} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Nome Fantasia</button>
                  <button onClick={() => insertField('razao')} disabled={!selectedEntity} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Razão Social</button>
                  <button onClick={() => insertField('endereco')} disabled={!selectedEntity} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Endereço</button>
                  <button onClick={() => insertField('maps')} disabled={!selectedEntity} className="px-3 py-2.5 rounded-xl bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Endereço + Maps
                  </button>
                </div>
              </div>

              {/* Inserir dados da viagem */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Dados da Viagem</h4>
                  <div className="flex items-center gap-1">
                    <button onClick={() => insertNow('data')} title="Inserir data de hoje" className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Data Hoje</button>
                    <button onClick={() => insertNow('hora')} title="Inserir hora atual" className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Hora Agora</button>
                  </div>
                </div>

                <input
                  type="text"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:border-emerald-500 outline-none"
                  placeholder="Buscar viagem por OS, Container ou Booking..."
                  value={tripSearch}
                  onChange={e => setTripSearch(e.target.value)}
                />

                {tripSearch.trim() && !selectedTrip && (
                  <div className="max-h-40 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl divide-y divide-slate-100">
                    {filteredTrips.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic p-4 text-center">Nenhuma viagem encontrada.</p>
                    ) : filteredTrips.map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTripId(t.id); setTripSearch(t.os || t.container || ''); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors"
                      >
                        <div className="text-[11px] font-black text-slate-800 uppercase leading-tight">{t.os || 'SEM OS'}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{t.container || 'SEM CONTAINER'} · {t.status}</div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedTrip && (
                  <div className="flex justify-between items-center bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
                    <div>
                      <div className="text-[11px] font-black text-slate-800 uppercase leading-tight">{selectedTrip.os || 'SEM OS'}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase leading-tight">{selectedTrip.container || 'SEM CONTAINER'} · {selectedTrip.status}</div>
                    </div>
                    <button onClick={() => { setSelectedTripId(null); setTripSearch(''); }} className="text-slate-400 hover:text-red-500" title="Trocar viagem">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button onClick={() => insertTripField('os')} disabled={!selectedTrip} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">OS</button>
                  <button onClick={() => insertTripField('container')} disabled={!selectedTrip} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Container</button>
                  <button onClick={() => insertTripField('booking')} disabled={!selectedTrip} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Booking</button>
                  <button onClick={() => insertTripField('data')} disabled={!selectedTrip} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all col-span-1">Data</button>
                  <button onClick={() => insertTripField('hora')} disabled={!selectedTrip} className="px-3 py-2.5 rounded-xl bg-slate-800 text-white text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all col-span-2">Hora</button>
                </div>
              </div>
            </div>

            {/* Coluna direita: preview WhatsApp */}
            <div className="flex flex-col">
              <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 flex flex-col h-full">
                <div className="p-4 bg-emerald-700 text-white flex items-center gap-3 shrink-0">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-wide">Pré-visualização</div>
                    <div className="text-[9px] text-emerald-200 font-bold">Como aparecerá no WhatsApp</div>
                  </div>
                </div>
                <div
                  className="flex-1 p-6 overflow-y-auto custom-scrollbar min-h-[300px]"
                  style={{ backgroundColor: '#e5ddd5', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'40\' height=\'40\' fill=\'%23e5ddd5\'/%3E%3C/svg%3E")' }}
                >
                  {body.trim() ? (
                    <div className="max-w-[85%] ml-auto">
                      <div
                        className="relative bg-[#dcf8c6] rounded-xl rounded-tr-none px-3 py-2 text-[13px] text-slate-800 leading-relaxed shadow-sm whitespace-pre-wrap break-words"
                        dangerouslySetInnerHTML={{ __html: renderWhatsApp(body) }}
                      />
                      <div className="text-right text-[9px] text-slate-500 mt-1 pr-1">
                        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-[11px] text-slate-500 font-bold italic bg-white/60 px-4 py-2 rounded-full">A mensagem aparecerá aqui...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-6 bg-white border-t border-slate-200 flex justify-between items-center gap-4 shrink-0">
          <div className="flex gap-3">
            <button onClick={handleCopy} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              Copiar
            </button>
            <button onClick={handleOpenWhatsApp} className="px-6 py-3.5 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2z"/></svg>
              Abrir WhatsApp
            </button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-8 py-3.5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={isSaving} className="px-10 py-3.5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
              {isSaving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
              ) : (
                <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg> Salvar Modelo</>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default MessageComposerModal;
