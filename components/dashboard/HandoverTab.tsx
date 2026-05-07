
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Trip, Driver, Customer, Port, HandoverPost, HandoverMention } from '../../types';
import { db, supabase } from '../../utils/storage';

interface HandoverTabProps {
  user: User;
  trips: Trip[];
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
}

// ── Toolbar button ────────────────────────────────────────────────────────────
const ToolBtn = ({ title, active, onClick, children }: { title: string; active?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    onMouseDown={e => { e.preventDefault(); onClick(); }}
    className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all ${active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
  >
    {children}
  </button>
);

// ── Mention Chip (inline in editor) ──────────────────────────────────────────
const chipColors: Record<string, string> = {
  trip: 'bg-blue-100 text-blue-700 border-blue-200',
  driver: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  customer: 'bg-purple-100 text-purple-700 border-purple-200',
  port: 'bg-amber-100 text-amber-700 border-amber-200',
};
const chipIcons: Record<string, string> = { trip: '📋', driver: '🚛', customer: '🏢', port: '⚓' };

// ── Post Card ─────────────────────────────────────────────────────────────────
const PostCard: React.FC<{ post: HandoverPost; currentUserId: string; onDelete: (id: string) => void }> = ({ post, currentUserId, onDelete }) => {
  const d = new Date(post.createdAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  let timeLabel = '';
  if (diff < 60) timeLabel = 'agora mesmo';
  else if (diff < 3600) timeLabel = `${Math.floor(diff / 60)}min atrás`;
  else if (diff < 86400) timeLabel = `${Math.floor(diff / 3600)}h atrás`;
  else timeLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });

  const roleLabel: Record<string, string> = { admin: 'Administrador', staff: 'Operacional', driver: 'Motorista', motoboy: 'Motoboy', third_party: 'Externo' };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            {post.authorPhoto
              ? <img src={post.authorPhoto} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">{post.authorName.charAt(0).toUpperCase()}</div>
            }
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-800 leading-none">{post.authorName}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {post.authorRole ? (roleLabel[post.authorRole] || post.authorRole) : 'Equipe'} · {timeLabel}
            </p>
          </div>
        </div>
        {currentUserId === post.authorId && (
          <button
            onClick={() => onDelete(post.id)}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            title="Excluir post"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        )}
      </div>

      {/* Rich content */}
      <div
        className="px-6 pb-4 text-slate-800 handover-content"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Mentions */}
      {post.mentions && post.mentions.length > 0 && (
        <div className="px-6 pb-5 flex flex-wrap gap-2">
          {post.mentions.map((m, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${chipColors[m.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <span>{chipIcons[m.type] || '🔗'}</span>
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const HandoverTab: React.FC<HandoverTabProps> = ({ user, trips, drivers, customers, ports }) => {
  const [posts, setPosts] = useState<HandoverPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mentions, setMentions] = useState<HandoverMention[]>([]);

  // Mention picker state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionType, setMentionType] = useState<'trip' | 'driver' | 'customer' | 'port'>('trip');

  // Formatting state
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await db.getHandoverPosts();
    setPosts(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Realtime
    if (!supabase) return;
    const channelId = `handover-${Math.random().toString(36).substr(2, 6)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover_posts' }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); if (supabase) supabase.removeChannel(channel); };
  }, [load]);

  const checkEmpty = () => {
    const el = editorRef.current;
    if (!el) return;
    setIsEmpty(el.innerText.trim() === '');
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
    });
  };

  const setHeading = (tag: string) => {
    execCmd('formatBlock', tag);
  };

  const setFontSize = (size: string) => {
    // execCommand fontSize uses 1-7, so we use a workaround via fontSize
    const sizeMap: Record<string, string> = { sm: '2', md: '3', lg: '5', xl: '6' };
    execCmd('fontSize', sizeMap[size] || '3');
  };

  const insertMention = (item: HandoverMention) => {
    const chip = `<span contenteditable="false" class="mention-chip mention-${item.type}" data-id="${item.id}" data-type="${item.type}">${chipIcons[item.type]} ${item.label}</span>&nbsp;`;
    document.execCommand('insertHTML', false, chip);
    setMentions(prev => {
      if (prev.some(m => m.id === item.id && m.type === item.type)) return prev;
      return [...prev, item];
    });
    setShowMentionPicker(false);
    setMentionSearch('');
    editorRef.current?.focus();
    checkEmpty();
  };

  const getMentionOptions = () => {
    const q = mentionSearch.toLowerCase();
    switch (mentionType) {
      case 'trip': return trips.filter(t => t.os?.toLowerCase().includes(q) || t.customer?.name?.toLowerCase().includes(q)).slice(0, 8).map(t => ({ type: 'trip' as const, id: t.id, label: `OS ${t.os}` }));
      case 'driver': return drivers.filter(d => d.name?.toLowerCase().includes(q)).slice(0, 8).map(d => ({ type: 'driver' as const, id: d.id, label: d.name }));
      case 'customer': return customers.filter(c => c.name?.toLowerCase().includes(q) || c.legalName?.toLowerCase().includes(q)).slice(0, 8).map(c => ({ type: 'customer' as const, id: c.id, label: c.legalName || c.name }));
      case 'port': return ports.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 8).map(p => ({ type: 'port' as const, id: p.id, label: p.name }));
      default: return [];
    }
  };

  const handlePost = async () => {
    const el = editorRef.current;
    if (!el || el.innerText.trim() === '') return;
    setIsPosting(true);
    const content = el.innerHTML;
    await db.saveHandoverPost({
      content,
      authorId: user.id,
      authorName: user.displayName,
      authorPhoto: user.photo,
      authorRole: user.role,
      mentions,
    });
    el.innerHTML = '';
    setIsEmpty(true);
    setMentions([]);
    await load();
    setIsPosting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este post?')) return;
    await db.deleteHandoverPost(id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const COLORS = ['#0f172a', '#1e40af', '#047857', '#b91c1c', '#7c3aed', '#b45309', '#6b7280'];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Passagem de Serviço</h1>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Feed de comunicação da equipe</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </div>

      {/* Composer */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {/* Author row */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-slate-50">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            {user.photo
              ? <img src={user.photo} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">{user.displayName.charAt(0)}</div>
            }
          </div>
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-wide">{user.displayName}</p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-2.5 border-b border-slate-100 flex-wrap">
          {/* Formatting */}
          <ToolBtn title="Negrito" active={activeFormats.bold} onClick={() => execCmd('bold')}><b>B</b></ToolBtn>
          <ToolBtn title="Itálico" active={activeFormats.italic} onClick={() => execCmd('italic')}><i>I</i></ToolBtn>
          <ToolBtn title="Sublinhado" active={activeFormats.underline} onClick={() => execCmd('underline')}><u>S</u></ToolBtn>
          <ToolBtn title="Tachado" active={activeFormats.strikeThrough} onClick={() => execCmd('strikeThrough')}><s>T</s></ToolBtn>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Headings */}
          <ToolBtn title="Título 1" onClick={() => setHeading('h2')}>H1</ToolBtn>
          <ToolBtn title="Título 2" onClick={() => setHeading('h3')}>H2</ToolBtn>
          <ToolBtn title="Parágrafo" onClick={() => setHeading('p')}>¶</ToolBtn>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Font sizes */}
          <ToolBtn title="Texto pequeno" onClick={() => setFontSize('sm')}><span className="text-[8px]">A</span></ToolBtn>
          <ToolBtn title="Texto médio" onClick={() => setFontSize('md')}><span className="text-[10px]">A</span></ToolBtn>
          <ToolBtn title="Texto grande" onClick={() => setFontSize('lg')}><span className="text-[14px]">A</span></ToolBtn>
          <ToolBtn title="Texto extra grande" onClick={() => setFontSize('xl')}><span className="text-[18px]">A</span></ToolBtn>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Alignment */}
          <ToolBtn title="Alinhar à esquerda" active={activeFormats.justifyLeft} onClick={() => execCmd('justifyLeft')}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h12M3 18h18"/></svg>
          </ToolBtn>
          <ToolBtn title="Centralizar" active={activeFormats.justifyCenter} onClick={() => execCmd('justifyCenter')}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M6 12h12M3 18h18"/></svg>
          </ToolBtn>
          <ToolBtn title="Alinhar à direita" active={activeFormats.justifyRight} onClick={() => execCmd('justifyRight')}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M9 12h12M3 18h18"/></svg>
          </ToolBtn>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Colors */}
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              title="Cor do texto"
              onMouseDown={e => { e.preventDefault(); execCmd('foreColor', c); }}
              className="w-4 h-4 rounded-full border border-white shadow-sm transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
            />
          ))}

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Mention button */}
          <button
            type="button"
            title="Citar viagem, motorista, cliente ou porto"
            onMouseDown={e => { e.preventDefault(); setShowMentionPicker(v => !v); }}
            className={`px-2 h-7 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all ${showMentionPicker ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50 border border-blue-200'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/></svg>
            Citar
          </button>
        </div>

        {/* Mention Picker */}
        {showMentionPicker && (
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
            {/* Type tabs */}
            <div className="flex gap-1.5 flex-wrap">
              {(['trip', 'driver', 'customer', 'port'] as const).map(t => {
                const labels = { trip: 'Viagem', driver: 'Motorista', customer: 'Cliente', port: 'Porto/Terminal' };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setMentionType(t); setMentionSearch(''); }}
                    className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${mentionType === t ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}
                  >
                    {chipIcons[t]} {labels[t]}
                  </button>
                );
              })}
            </div>
            {/* Search */}
            <input
              type="text"
              placeholder={`Buscar ${mentionType === 'trip' ? 'por OS...' : '...'}`}
              value={mentionSearch}
              onChange={e => setMentionSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-medium bg-white outline-none focus:border-blue-400"
              autoFocus
            />
            {/* Results */}
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {getMentionOptions().length === 0
                ? <p className="text-[8px] text-slate-400 font-bold uppercase">Nenhum resultado</p>
                : getMentionOptions().map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => insertMention(item)}
                    className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all hover:scale-105 ${chipColors[item.type]}`}
                  >
                    {chipIcons[item.type]} {item.label}
                  </button>
                ))
              }
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="relative">
          {isEmpty && (
            <p className="absolute top-4 left-6 text-slate-300 text-[13px] font-medium pointer-events-none select-none">
              Escreva sua passagem de serviço...
            </p>
          )}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={checkEmpty}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            className="min-h-[120px] px-6 py-4 outline-none text-slate-800 text-[13px] leading-relaxed handover-editor"
          />
        </div>

        {/* Post button */}
        <div className="px-6 pb-5 pt-2 flex justify-between items-center">
          <p className="text-[8px] text-slate-400 font-bold uppercase">{mentions.length > 0 ? `${mentions.length} citaç${mentions.length > 1 ? 'ões' : 'ão'}` : 'Use o botão Citar para referenciar viagens, motoristas e mais'}</p>
          <button
            onClick={handlePost}
            disabled={isEmpty || isPosting}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide transition-all hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isPosting
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Postando...</span></>
              : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg><span>Publicar</span></>
            }
          </button>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Carregando feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24 space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma passagem registrada</p>
          <p className="text-[9px] text-slate-300 font-medium">Seja o primeiro a publicar uma passagem de serviço</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={user.id} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Inline CSS for editor content */}
      <style>{`
        .handover-editor h2 { font-size: 1.4em; font-weight: 900; color: #0f172a; margin: 8px 0 4px; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.03em; }
        .handover-editor h3 { font-size: 1.15em; font-weight: 800; color: #1e293b; margin: 6px 0 3px; line-height: 1.2; }
        .handover-editor ul { list-style: disc; padding-left: 1.5em; }
        .handover-editor ol { list-style: decimal; padding-left: 1.5em; }
        .handover-content h2 { font-size: 1.3em; font-weight: 900; color: #0f172a; margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 0.03em; }
        .handover-content h3 { font-size: 1.1em; font-weight: 800; color: #1e293b; margin: 6px 0 3px; }
        .handover-content ul { list-style: disc; padding-left: 1.5em; }
        .handover-content ol { list-style: decimal; padding-left: 1.5em; }
        .handover-content p { margin: 2px 0; }
        .mention-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 900; text-transform: uppercase; border: 1px solid; margin: 0 2px; cursor: default; }
        .mention-trip { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
        .mention-driver { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .mention-customer { background: #ede9fe; color: #6d28d9; border-color: #ddd6fe; }
        .mention-port { background: #fef3c7; color: #92400e; border-color: #fde68a; }
      `}</style>
    </div>
  );
};

export default HandoverTab;
