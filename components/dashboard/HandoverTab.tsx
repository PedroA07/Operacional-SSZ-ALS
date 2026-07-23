
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Trip, Driver, Customer, Port, HandoverPost, HandoverComment, HandoverMention, HandoverAttachment, HandoverNotification, Staff, DutySwapRequest } from '../../types';
import { db, supabase } from '../../utils/storage';
import { showToast } from '../shared/SimpleToast';
import CustomSelect from '../shared/CustomSelect';
import { r2Service } from '../../utils/r2Service';

interface HandoverTabProps {
  user: User;
  trips: Trip[];
  drivers: Driver[];
  customers: Customer[];
  ports: Port[];
  staffList: Staff[];
}

// ── Toolbar button ─────────────────────────────────────────────────────────────
const ToolBtn = ({
  title, active, onClick, children,
}: { title: string; active?: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    title={title}
    onMouseDown={e => { e.preventDefault(); onClick(); }}
    className={`w-7 h-7 flex items-center justify-center rounded-lg text-[11px] font-black transition-all ${
      active ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
    }`}
  >
    {children}
  </button>
);

// ── Chip colours / icons ───────────────────────────────────────────────────────
const chipColors: Record<string, string> = {
  trip:     'bg-blue-100 text-blue-700 border-blue-200',
  driver:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  customer: 'bg-purple-100 text-purple-700 border-purple-200',
  port:     'bg-amber-100 text-amber-700 border-amber-200',
  user:     'bg-rose-100 text-rose-700 border-rose-200',
};
const chipIcons: Record<string, string> = {
  trip: '📋', driver: '🚛', customer: '🏢', port: '⚓', user: '👤',
};

const roleLabel: Record<string, string> = {
  admin: 'Administrador', staff: 'Operacional', driver: 'Motorista', motoboy: 'Motoboy', third_party: 'Externo',
};

const relativeTime = (iso: string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return 'agora mesmo';
  if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' });
};

// ── Emojis / Reações ───────────────────────────────────────────────────────────
// Conjunto amplo ("global") de emojis para o seletor completo
const EMOJIS = [
  '👍','👎','❤️','🔥','🎉','😂','🤣','😅','😊','😍','🥰','😘','😎','🤩','🥳','😇','🙂','😉','😌','😴',
  '🤔','🤨','😐','😑','😶','🙄','😏','😥','😮','😯','😲','😳','🥺','😢','😭','😤','😡','🤬','🤯','😱',
  '😨','😰','😓','🤗','🤭','🤫','🤥','😬','🙃','😜','😝','🤪','🤢','🤮','🤧','😷','🤒','🤕','🥴','🤠',
  '👏','🙌','🤝','🙏','💪','👌','✌️','🤞','🤙','👊','✊','🫡','🫠','🫶','👋','✋','👇','👈','👉','👆',
  '☝️','💯','✅','❌','❗','❓','⚠️','⛔','🚫','✔️','➕','➖','⭐','🌟','✨','💥','💫','💦','💨','🔔',
  '📌','📍','📎','📝','📅','⏰','⏳','⌛','💰','💵','📈','📉','📊','🧾','📦','📁','🔒','🔑','🔧','🛠️',
  '🚛','🚚','🚗','🚢','⚓','✈️','🛳️','🏭','🏗️','🚧','🛑','🟢','🟡','🔴','🔵','⚡','🌊','🧊','☑️','🆗',
  '😀','😃','😄','😁','😆','🥲','🙈','🙉','🙊','👀','🫥','🫰','🤌','👑','🎯','🏆','🥇','☕','🍕','⏱️',
];
const DEFAULT_TOP = ['👍','❤️','😂'];
const EMOJI_USAGE_KEY = 'als_emoji_usage';

// Palavras-chave (PT) para pesquisar emojis no seletor
const EMOJI_KEYWORDS: Record<string, string> = {
  '👍':'joia positivo curtir like ok bom','👎':'negativo ruim nao dislike','❤️':'coracao amor vermelho like',
  '🔥':'fogo top incrivel bombando','🎉':'festa parabens comemorar','😂':'risada chorar rindo engracado',
  '🤣':'rolando risada gargalhada','😅':'alivio suor nervoso','😊':'feliz sorriso contente','😍':'apaixonado amor olhos',
  '🥰':'amor carinho feliz','😘':'beijo','😎':'legal descolado oculos','🤩':'maravilhado estrela uau',
  '🥳':'festa aniversario comemorar','😇':'anjo santo','🙂':'sorriso leve','😉':'piscada','😌':'aliviado calmo',
  '😴':'sono dormindo cansado','🤔':'pensando duvida','🤨':'desconfiado duvida','😐':'neutro serio',
  '😶':'sem palavras mudo','🙄':'revirar olhos','😏':'malicioso sorriso','😥':'triste preocupado','😮':'surpreso uau',
  '😯':'surpreso','😲':'chocado surpreso','😳':'envergonhado vermelho','🥺':'suplicando pidao carinha',
  '😢':'triste choro lagrima','😭':'chorando muito triste','😤':'bufando irritado','😡':'raiva bravo',
  '🤬':'palavrao xingando raiva','🤯':'explodindo mente chocado','😱':'grito medo susto','😨':'medo assustado',
  '😰':'ansioso suor medo','😓':'suor cansado','🤗':'abraco','🤭':'risinho tapando boca','🤫':'silencio segredo',
  '🤥':'mentira','😬':'constrangido nervoso','🙃':'de cabeca para baixo ironia','😜':'lingua brincadeira',
  '😝':'lingua zoar','🤪':'doido maluco','🤢':'enjoo nojo','🤮':'vomito nojo','🤧':'espirro resfriado',
  '😷':'mascara doente','🤒':'febre doente','🤕':'machucado','🥴':'tonto bebado','🤠':'caubói chapeu',
  '👏':'palmas parabens aplausos','🙌':'maos ceu comemorar','🤝':'aperto de mao acordo negocio','🙏':'obrigado orando por favor',
  '💪':'forca musculo','👌':'ok perfeito','✌️':'paz vitoria','🤞':'torcendo sorte','🤙':'e ai relax',
  '👊':'soco toca aqui','✊':'punho forca','🫡':'continencia respeito','🫠':'derretendo','🫶':'coracao maos amor',
  '👋':'oi tchau aceno','✋':'pare mao','👇':'para baixo','👈':'esquerda','👉':'direita','👆':'para cima',
  '☝️':'atencao um dedo','💯':'cem nota maxima top','✅':'certo ok concluido','❌':'errado cancelar nao',
  '❗':'exclamacao atencao','❓':'pergunta duvida','⚠️':'alerta atencao aviso','⛔':'proibido','🚫':'proibido nao',
  '✔️':'certo ok','➕':'mais adicionar','➖':'menos remover','⭐':'estrela favorito','🌟':'estrela brilho',
  '✨':'brilho novo','💥':'explosao','💫':'tontura estrela','💦':'suor agua','💨':'rapido vento',
  '🔔':'sino notificacao aviso','📌':'fixar pin','📍':'local pin','📎':'clipe anexo','📝':'anotar nota escrever',
  '📅':'calendario data','⏰':'alarme hora','⏳':'tempo ampulheta','⌛':'tempo','💰':'dinheiro saco','💵':'dinheiro nota',
  '📈':'grafico subindo alta','📉':'grafico caindo baixa','📊':'grafico barras','🧾':'recibo nota fiscal',
  '📦':'caixa container pacote','📁':'pasta arquivo','🔒':'cadeado bloqueado','🔑':'chave','🔧':'chave ferramenta',
  '🛠️':'ferramentas','🚛':'caminhao carreta','🚚':'caminhao entrega','🚗':'carro','🚢':'navio','⚓':'ancora porto',
  '✈️':'aviao','🛳️':'navio cruzeiro','🏭':'fabrica industria','🏗️':'construcao obra','🚧':'obras atencao',
  '🛑':'parar stop','🟢':'verde ok','🟡':'amarelo atencao','🔴':'vermelho parar','🔵':'azul',
  '⚡':'energia rapido raio','🌊':'onda mar','🧊':'gelo frio','☑️':'marcado ok','🆗':'ok',
  '😀':'sorriso feliz','😃':'feliz','😄':'feliz risada','😁':'sorriso dentes','😆':'rindo','🥲':'sorriso lagrima',
  '🙈':'macaco vergonha nao vejo','🙉':'macaco nao ouço','🙊':'macaco nao falo','👀':'olhos olhando atento',
  '🫥':'sumindo invisivel','🫰':'dedos dinheiro coracao','🤌':'italiano dedos','👑':'coroa rei chefe',
  '🎯':'alvo meta foco','🏆':'trofeu vitoria','🥇':'ouro primeiro medalha','☕':'cafe','🍕':'pizza','⏱️':'cronometro tempo',
};

const readEmojiUsage = (): Record<string, number> => {
  try { return JSON.parse(localStorage.getItem(EMOJI_USAGE_KEY) || '{}') || {}; }
  catch { return {}; }
};
const recordEmojiUse = (emoji: string) => {
  const u = readEmojiUsage();
  u[emoji] = (u[emoji] || 0) + 1;
  try { localStorage.setItem(EMOJI_USAGE_KEY, JSON.stringify(u)); } catch { /* ignore */ }
};
// 3 emojis mais usados (completa com os padrões se faltar)
const getTopEmojis = (): string[] => {
  const u = readEmojiUsage();
  const sorted = Object.keys(u).sort((a, b) => u[b] - u[a]);
  const top = [...sorted];
  for (const d of DEFAULT_TOP) if (!top.includes(d)) top.push(d);
  return top.slice(0, 3);
};

type ReactUser = { id: string; name: string };
type ReactionMap = Record<string, ReactUser[]>;
type NameResolver = (id: string) => string;

const toggleReactionMap = (
  reactions: ReactionMap = {},
  emoji: string,
  user: ReactUser
): ReactionMap => {
  const next: ReactionMap = {};
  for (const k of Object.keys(reactions)) next[k] = [...(reactions[k] || [])];
  const arr = next[emoji] || [];
  if (arr.some(u => u.id === user.id)) {
    const filtered = arr.filter(u => u.id !== user.id);
    if (filtered.length === 0) delete next[emoji];
    else next[emoji] = filtered;
  } else {
    next[emoji] = [...arr, user];
  }
  return next;
};

// Texto "quem reagiu" — sempre nomes reais (resolve pelo diretório quando o
// nome não foi salvo na reação); "(você)" para o próprio usuário.
const reactorsLabel = (users: ReactUser[], meId: string, resolveName: NameResolver): string =>
  users.map(u => (u.id === meId ? '(você)' : (u.name || resolveName(u.id)))).join(', ');

// Popover de seleção de emoji com pesquisa (auto-contido, sem libs externas)
const EmojiPicker: React.FC<{ onPick: (emoji: string) => void; onClose: () => void; align?: 'left' | 'right'; direction?: 'up' | 'down' }> = ({ onPick, onClose, align = 'left', direction = 'up' }) => {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const query = norm(q.trim());
  const list = query ? EMOJIS.filter(e => norm(EMOJI_KEYWORDS[e] || '').includes(query)) : EMOJIS;
  return (
  <>
    <div className="fixed inset-0 z-[60]" onMouseDown={onClose} />
    <div className={`absolute z-[61] ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'} ${align === 'right' ? 'right-0' : 'left-0'} bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 w-72`}>
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        onMouseDown={e => e.stopPropagation()}
        placeholder="Pesquisar emoji..."
        autoFocus
        className="w-full mb-2 px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-medium outline-none focus:border-blue-400"
      />
      <div className="grid grid-cols-8 gap-0.5 max-h-52 overflow-y-auto">
      {list.length === 0 ? (
        <p className="col-span-8 text-center text-[9px] font-bold text-slate-400 uppercase py-4">Nenhum emoji</p>
      ) : list.map((e, i) => (
        <button key={`${e}-${i}`} type="button" onMouseDown={ev => { ev.preventDefault(); onPick(e); }}
          className="w-8 h-8 rounded-lg hover:bg-slate-100 text-[18px] leading-none flex items-center justify-center transition-colors">
          {e}
        </button>
      ))}
      </div>
    </div>
  </>
  );
};

// Barra de reações: chips existentes (com contagem + quem reagiu no tooltip),
// atalho dos 3 emojis mais usados e "Outros" para abrir o seletor completo.
const ReactionBar: React.FC<{
  reactions: ReactionMap;
  userId: string;
  topEmojis: string[];
  resolveName: NameResolver;
  onToggle: (emoji: string) => void;
}> = ({ reactions, userId, topEmojis, resolveName, onToggle }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const entries = Object.entries(reactions || {}).filter(([, u]) => (u || []).length > 0);
  const present = new Set(entries.map(([e]) => e));
  const quick = topEmojis.filter(e => !present.has(e)).slice(0, 3);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {entries.map(([emoji, users]) => {
        const mine = users.some(u => u.id === userId);
        return (
          <button key={emoji} type="button" onClick={() => onToggle(emoji)}
            title={reactorsLabel(users, userId, resolveName)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black transition-all ${mine ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <span className="text-[12px] leading-none">{emoji}</span>{users.length}
          </button>
        );
      })}
      {/* 3 mais usados (atalho rápido) */}
      {quick.map(e => (
        <button key={`q-${e}`} type="button" onClick={() => onToggle(e)} title="Reagir"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-slate-200 text-[13px] leading-none text-slate-500 hover:bg-slate-50 hover:border-blue-300 transition-all">
          {e}
        </button>
      ))}
      {/* Outros — abre o seletor completo */}
      <div className="relative">
        <button type="button" onClick={() => setPickerOpen(v => !v)} title="Outros emojis"
          className="inline-flex items-center justify-center h-6 px-2 rounded-full border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-all text-[9px] font-black uppercase gap-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
          Outros
        </button>
        {pickerOpen && (
          <EmojiPicker onPick={e => { onToggle(e); setPickerOpen(false); }} onClose={() => setPickerOpen(false)} />
        )}
      </div>
    </div>
  );
};

// ── Post Card (self-contained with comments + edit) ───────────────────────────
const PostCard: React.FC<{
  post: HandoverPost;
  currentUser: User;
  editWindowMinutes: number; // 0 = unlimited, -1 = disabled
  isAdmin: boolean;
  staffList: Staff[];
  topEmojis: string[];
  userNames: Record<string, string>;
  onEmojiUsed: (emoji: string) => void;
  onUploadFile: (file: File) => Promise<string | null>;
  onDelete: (id: string) => void;
  onEdited: (id: string, newContent: string) => void;
}> = ({ post, currentUser, editWindowMinutes, isAdmin, staffList, topEmojis, userNames, onEmojiUsed, onUploadFile, onDelete, onEdited }) => {

  // Função/cargo do autor: usa o salvo no post; senão tenta casar pelo nome na
  // equipe; por fim cai no rótulo da permissão. (Mostra função, não permissão.)
  const resolveFuncao = (authorName: string, authorPosition?: string, authorRole?: string): string => {
    if (authorPosition) return authorPosition;
    const staff = staffList.find(s => (s.name || '').trim().toLowerCase() === (authorName || '').trim().toLowerCase());
    if (staff?.position) return staff.position;
    return authorRole ? (roleLabel[authorRole] || authorRole) : 'Equipe';
  };
  const me: ReactUser = { id: currentUser.id, name: currentUser.displayName };

  // ── Edit window check ──────────────────────────────────────────────────────
  const withinWindow = (createdAt: string, authorId: string) => {
    if (currentUser.id !== authorId) return false;
    if (editWindowMinutes === -1) return false;
    if (editWindowMinutes === 0)  return true;
    return (Date.now() - new Date(createdAt).getTime()) / 60000 <= editWindowMinutes;
  };

  // ── Post edit state ────────────────────────────────────────────────────────
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [isSavingPost,  setIsSavingPost]  = useState(false);
  const postEditRef = useRef<HTMLDivElement>(null);

  const enterEditPost = () => {
    setIsEditingPost(true);
    setTimeout(() => {
      const el = postEditRef.current;
      if (!el) return;
      el.innerHTML = post.content;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }, 30);
  };

  const saveEditPost = async () => {
    const el = postEditRef.current;
    if (!el) return;
    const newContent = el.innerHTML.trim();
    if (!newContent) return;
    setIsSavingPost(true);
    const ok = await db.updateHandoverPost(post.id, newContent);
    if (ok) { onEdited(post.id, newContent); setIsEditingPost(false); }
    else     showToast('Erro ao salvar edição');
    setIsSavingPost(false);
  };

  // ── Comments state ─────────────────────────────────────────────────────────
  const [comments,          setComments]          = useState<HandoverComment[]>([]);
  const [showAllComments,   setShowAllComments]   = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText,       setCommentText]       = useState('');
  const [isPostingComment,  setIsPostingComment]  = useState(false);
  const [editingCommentId,  setEditingCommentId]  = useState<string | null>(null);
  const [editCommentText,   setEditCommentText]   = useState('');
  const [commentCount,      setCommentCount]      = useState<number | null>(null);
  const [replyingTo,        setReplyingTo]        = useState<string | null>(null);
  const [replyText,         setReplyText]         = useState('');
  const [commentEmojiOpen,  setCommentEmojiOpen]  = useState(false);
  const [replyEmojiOpen,    setReplyEmojiOpen]    = useState(false);

  // ── Reações do post ──────────────────────────────────────────────────────────
  const [postReactions, setPostReactions] = useState<ReactionMap>(post.reactions || {});
  // Mantém as reações sincronizadas quando o feed recarrega (realtime)
  useEffect(() => { setPostReactions(post.reactions || {}); }, [post.reactions]);
  // Resolve o nome de quem reagiu, mesmo sem nome salvo na reação (posts antigos)
  const resolveName: NameResolver = (id) =>
    (id === currentUser.id ? currentUser.displayName : '') ||
    userNames[id] ||
    comments.find(c => c.authorId === id)?.authorName ||
    (post.authorId === id ? post.authorName : '') ||
    'Usuário';

  const togglePostReaction = async (emoji: string) => {
    const isAdding = !(postReactions[emoji] || []).some(u => u.id === me.id);
    const next = toggleReactionMap(postReactions, emoji, me);
    setPostReactions(next);
    if (isAdding) onEmojiUsed(emoji);
    const ok = await db.updateHandoverReactions('post', post.id, next);
    if (!ok) { setPostReactions(post.reactions || {}); showToast('Erro ao reagir'); }
  };

  const toggleCommentReaction = async (commentId: string, emoji: string) => {
    let previous: ReactionMap = {};
    const target = comments.find(c => c.id === commentId);
    const isAdding = !((target?.reactions || {})[emoji] || []).some(u => u.id === me.id);
    setComments(prev => prev.map(c => {
      if (c.id !== commentId) return c;
      previous = c.reactions || {};
      return { ...c, reactions: toggleReactionMap(c.reactions || {}, emoji, me) };
    }));
    if (isAdding) onEmojiUsed(emoji);
    const next = toggleReactionMap(target?.reactions || {}, emoji, me);
    const ok = await db.updateHandoverReactions('comment', commentId, next);
    if (!ok) {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: previous } : c));
      showToast('Erro ao reagir');
    }
  };

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true);
    const data = await db.getHandoverComments(post.id);
    setComments(data);
    setCommentCount(data.length);
    setIsLoadingComments(false);
  }, [post.id]);

  // Carrega os comentários ao montar para sempre exibir os últimos 3
  useEffect(() => { loadComments(); }, [loadComments]);

  const submitComment = async (parentId?: string, extra?: { stickerUrl?: string; attachments?: HandoverAttachment[] }) => {
    const text = (parentId ? replyText : commentText).trim();
    const atts = extra?.attachments || (parentId ? [] : pendingAtts);
    if (!text && !extra?.stickerUrl && atts.length === 0) return;
    setIsPostingComment(true);
    await db.saveHandoverComment({
      postId:      post.id,
      parentId,
      content:     text,
      stickerUrl:  extra?.stickerUrl,
      attachments: atts.length ? atts : undefined,
      authorId:    currentUser.id,
      authorName:  currentUser.displayName,
      authorPhoto: currentUser.photo,
      authorRole:  currentUser.role,
      authorPosition: currentUser.position,
    });
    // Notificação: resposta a um comentário → autor do comentário;
    // comentário no post → autor do post.
    const excerpt = text || (atts.length ? '[anexo]' : (extra?.stickerUrl ? '[GIF]' : ''));
    if (parentId) {
      const parent = comments.find(c => c.id === parentId);
      if (parent && parent.authorId !== currentUser.id) {
        db.createHandoverNotification({ recipientUserId: parent.authorId, recipientName: parent.authorName, actorId: currentUser.id, actorName: currentUser.displayName, type: 'reply', postId: post.id, commentId: parentId, excerpt });
      }
    } else if (post.authorId !== currentUser.id) {
      db.createHandoverNotification({ recipientUserId: post.authorId, recipientName: post.authorName, actorId: currentUser.id, actorName: currentUser.displayName, type: 'reply', postId: post.id, excerpt });
    }
    if (parentId) { setReplyText(''); setReplyingTo(null); }
    else { setCommentText(''); setPendingAtts([]); }
    await loadComments();
    setIsPostingComment(false);
  };

  // ── Anexos (imagens/documentos) do comentário: colar ou anexar ─────────────
  const [pendingAtts, setPendingAtts] = useState<HandoverAttachment[]>([]);
  const [uploadingAtt, setUploadingAtt] = useState(false);
  const [uploadingSticker, setUploadingSticker] = useState<string | null>(null); // parentId de resposta
  const attInputRef = useRef<HTMLInputElement>(null);
  const replyStickerRef = useRef<HTMLInputElement>(null);
  const replyTargetRef = useRef<string | undefined>(undefined);

  const uploadAsAttachment = async (file: File): Promise<HandoverAttachment | null> => {
    const url = await onUploadFile(file);
    if (!url) return null;
    return { url, kind: file.type.startsWith('image/') ? 'image' : 'file', name: file.name };
  };
  const addPendingFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadingAtt(true);
    for (const f of files) {
      const att = await uploadAsAttachment(f);
      if (att) setPendingAtts(prev => [...prev, att]);
      else showToast('Erro ao anexar arquivo');
    }
    setUploadingAtt(false);
  };
  const handleCommentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = Array.from(items).filter(it => it.kind === 'file').map(it => it.getAsFile()).filter(Boolean) as File[];
    if (files.length === 0) return;
    e.preventDefault();
    addPendingFiles(files);
  };
  const setAttWidth = (idx: number, width?: number) =>
    setPendingAtts(prev => prev.map((a, i) => i === idx ? { ...a, width } : a));
  const removeAtt = (idx: number) => setPendingAtts(prev => prev.filter((_, i) => i !== idx));

  // Resposta: anexa uma imagem/GIF e envia de imediato
  const openReplyAttach = (parentId: string) => { replyTargetRef.current = parentId; replyStickerRef.current?.click(); };
  const handleReplyAttach = async (file: File | undefined) => {
    if (!file) return;
    const parentId = replyTargetRef.current;
    setUploadingSticker(parentId || null);
    const att = await uploadAsAttachment(file);
    setUploadingSticker(null);
    if (att) await submitComment(parentId, { attachments: [att] });
    else showToast('Erro ao anexar');
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm('Excluir comentário?')) return;
    await db.deleteHandoverComment(commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setCommentCount(prev => Math.max(0, (prev || 1) - 1));
  };

  const saveEditComment = async (commentId: string) => {
    if (!editCommentText.trim()) return;
    const ok = await db.updateHandoverComment(commentId, editCommentText.trim());
    if (ok) {
      setComments(prev => prev.map(c => c.id === commentId
        ? { ...c, content: editCommentText.trim(), updatedAt: new Date().toISOString() }
        : c
      ));
      setEditingCommentId(null);
    }
  };

  const canEditPost = withinWindow(post.createdAt, post.authorId);
  const canDelete   = currentUser.id === post.authorId || isAdmin;

  const topLevelComments = comments.filter(c => !c.parentId);
  const repliesOf = (id: string) => comments.filter(c => c.parentId === id);

  const renderCommentCard = (c: HandoverComment, isReply: boolean) => {
    const cCanEdit = withinWindow(c.createdAt, c.authorId);
    const cCanDel  = currentUser.id === c.authorId || isAdmin;
    return (
      <div key={c.id} className="flex gap-2.5 group">
        <div className={`${isReply ? 'w-6 h-6' : 'w-7 h-7'} rounded-xl overflow-hidden bg-slate-100 shrink-0 mt-0.5 border border-slate-100`}>
          {c.authorPhoto
            ? <img src={c.authorPhoto} className="w-full h-full object-cover" alt="" />
            : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-[9px]">{c.authorName.charAt(0)}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl px-3 py-2 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-slate-600 uppercase truncate">
                {c.authorName}
                <span className="ml-1 text-[7px] font-bold text-slate-400 normal-case">· {resolveFuncao(c.authorName, c.authorPosition, c.authorRole)}</span>
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {cCanEdit && editingCommentId !== c.id && (
                  <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} title="Editar" className="p-1 text-slate-300 hover:text-blue-500 rounded-lg transition-all">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                )}
                {cCanDel && (
                  <button onClick={() => deleteComment(c.id)} title="Excluir" className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-all">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                )}
              </div>
            </div>
            {editingCommentId === c.id ? (
              <div className="space-y-2">
                <textarea
                  value={editCommentText}
                  onChange={e => setEditCommentText(e.target.value)}
                  className="w-full px-2 py-1.5 rounded-xl border border-blue-200 text-[10px] font-medium resize-none outline-none focus:border-blue-400 bg-blue-50/20"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => setEditingCommentId(null)} className="px-3 py-1 rounded-lg border border-slate-200 text-[8px] font-black text-slate-500 uppercase transition-all hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button onClick={() => saveEditComment(c.id)} className="px-3 py-1 bg-blue-600 rounded-lg text-[8px] font-black text-white uppercase hover:bg-blue-700 transition-all">
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {c.content && (
                  <p className="text-[10px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{c.content}
                    {c.updatedAt && !c.stickerUrl && <span className="text-[7px] text-slate-300 ml-1">· editado</span>}
                  </p>
                )}
                {c.stickerUrl && (
                  <img src={c.stickerUrl} alt="GIF" loading="lazy" className={`${c.content ? 'mt-1.5' : ''} max-h-[140px] max-w-[160px] rounded-xl object-contain`} />
                )}
                {(c.attachments || []).length > 0 && (
                  <div className={`${c.content || c.stickerUrl ? 'mt-1.5' : ''} flex flex-col gap-1.5`}>
                    {(c.attachments || []).map((a, i) => a.kind === 'image' ? (
                      <a key={i} href={a.url} target="_blank" rel="noopener" className="block">
                        <img src={a.url} alt={a.name} loading="lazy" style={a.width ? { width: a.width } : undefined}
                          className="max-w-full rounded-xl object-contain border border-slate-100" />
                      </a>
                    ) : (
                      <a key={i} href={a.url} target="_blank" rel="noopener"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[9px] font-black text-slate-600 hover:bg-slate-100 transition-all w-fit">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                        {a.name}
                      </a>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          {/* Meta + ações do comentário */}
          <div className="flex items-center gap-2 mt-1 ml-2 flex-wrap">
            <span className="text-[7px] font-bold text-slate-400 uppercase">{relativeTime(c.createdAt)}</span>
            {!isReply && (
              <button onClick={() => { setReplyingTo(prev => prev === c.id ? null : c.id); setReplyText(''); }}
                className="text-[7px] font-black text-slate-400 hover:text-blue-500 uppercase transition-colors">
                Responder
              </button>
            )}
            <ReactionBar reactions={c.reactions || {}} userId={currentUser.id} topEmojis={topEmojis} resolveName={resolveName} onToggle={(e) => toggleCommentReaction(c.id, e)} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            {post.authorPhoto
              ? <img src={post.authorPhoto} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">{post.authorName.charAt(0).toUpperCase()}</div>
            }
          </div>
          <div>
            <p className="text-[11px] font-black text-slate-800 leading-none">{post.authorName}</p>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              {resolveFuncao(post.authorName, post.authorPosition, post.authorRole)} · {relativeTime(post.createdAt)}
              {post.updatedAt && <span className="text-slate-300 ml-1">· editado</span>}
            </p>
          </div>
        </div>
        {!isEditingPost && (
          <div className="flex items-center gap-0.5">
            {canEditPost && (
              <button onClick={enterEditPost} title="Editar" className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(post.id)} title="Excluir" className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content / Edit mode */}
      {isEditingPost ? (
        <div className="px-6 pb-4">
          <div
            ref={postEditRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[80px] px-4 py-3 rounded-xl border-2 border-blue-200 bg-blue-50/20 outline-none text-slate-800 text-[13px] leading-relaxed handover-editor"
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button onClick={() => setIsEditingPost(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-[9px] font-black text-slate-500 uppercase hover:bg-slate-50 transition-all">
              Cancelar
            </button>
            <button onClick={saveEditPost} disabled={isSavingPost} className="px-4 py-2 bg-blue-600 rounded-xl text-[9px] font-black text-white uppercase hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-1.5">
              {isSavingPost ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Salvando...</span></> : 'Salvar edição'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {post.title && (
            <h3 className="px-6 pt-1 pb-2 text-[15px] font-black text-slate-900 leading-tight">{post.title}</h3>
          )}
          <div className="px-6 pb-4 text-slate-800 handover-content" dangerouslySetInnerHTML={{ __html: post.content }} />
        </>
      )}

      {/* Mentions */}
      {!isEditingPost && post.mentions && post.mentions.length > 0 && (
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          {post.mentions.map((m, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${chipColors[m.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <span>{chipIcons[m.type] || '🔗'}</span>
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Action bar */}
      {!isEditingPost && (
        <div className="px-6 pb-3 pt-1 border-t border-slate-50 space-y-2">
          {/* Reações do post */}
          <div className="pt-1">
            <ReactionBar reactions={postReactions} userId={currentUser.id} topEmojis={topEmojis} resolveName={resolveName} onToggle={togglePostReaction} />
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            {topLevelComments.length > 0
              ? `${topLevelComments.length} comentário${topLevelComments.length !== 1 ? 's' : ''}`
              : 'Sem comentários'
            }
          </div>
        </div>
      )}

      {/* Comments section — sempre visível, mostrando os últimos 3 */}
      {!isEditingPost && (
        <div className="border-t border-slate-50 bg-slate-50/40 px-6 py-4 space-y-3">
          {isLoadingComments && comments.length === 0 ? (
            <div className="flex items-center gap-2 justify-center py-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Carregando...</span>
            </div>
          ) : (
            <>
              {/* Comment list (com respostas aninhadas) — últimos 3 por padrão */}
              {(showAllComments ? topLevelComments : topLevelComments.slice(-3)).map(c => (
                <div key={c.id} className="space-y-2">
                  {renderCommentCard(c, false)}
                  {/* Respostas */}
                  {repliesOf(c.id).length > 0 && (
                    <div className="ml-9 space-y-2 border-l-2 border-slate-100 pl-3">
                      {repliesOf(c.id).map(r => renderCommentCard(r, true))}
                    </div>
                  )}
                  {/* Campo de resposta */}
                  {replyingTo === c.id && (
                    <div className="ml-9 flex gap-2 pl-3">
                      <div className="flex-1 relative flex gap-2">
                        <div className="flex-1 relative">
                          <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(c.id); } }}
                            placeholder={`Responder a ${c.authorName}...`}
                            className="w-full pl-3 pr-14 py-2 bg-white rounded-2xl border border-slate-200 text-[10px] font-medium resize-none outline-none focus:border-blue-300 transition-colors"
                            rows={1}
                            autoFocus
                          />
                          <button type="button" onClick={() => openReplyAttach(c.id)} title="Anexar imagem, GIF ou documento"
                            className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 transition-colors">
                            {uploadingSticker === c.id
                              ? <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/>
                              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>}
                          </button>
                          <button type="button" onClick={() => setReplyEmojiOpen(v => !v)} title="Emoji"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                          </button>
                          {replyEmojiOpen && (
                            <EmojiPicker align="right" onPick={e => { setReplyText(t => t + e); setReplyEmojiOpen(false); }} onClose={() => setReplyEmojiOpen(false)} />
                          )}
                        </div>
                        <button
                          onClick={() => submitComment(c.id)}
                          disabled={!replyText.trim() || isPostingComment}
                          className="px-3 py-2 bg-blue-600 rounded-2xl text-[9px] font-black text-white uppercase hover:bg-blue-700 disabled:opacity-40 transition-all shrink-0 flex items-center"
                        >
                          {isPostingComment
                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Ver mais / mostrar menos — abaixo dos últimos 3 comentários */}
              {topLevelComments.length > 3 && (
                <button
                  onClick={() => setShowAllComments(v => !v)}
                  className="text-[9px] font-black text-slate-500 hover:text-blue-500 uppercase tracking-wide transition-colors"
                >
                  {showAllComments
                    ? 'Mostrar menos'
                    : `Ver mais ${topLevelComments.length - 3} comentário${topLevelComments.length - 3 !== 1 ? 's' : ''}`}
                </button>
              )}

              {/* Inputs escondidos: anexo do comentário raiz e da resposta */}
              <input ref={attInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" multiple className="hidden"
                onChange={e => { addPendingFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
              <input ref={replyStickerRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden"
                onChange={e => { handleReplyAttach(e.target.files?.[0]); e.target.value = ''; }} />

              {/* New comment input */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <div className="w-7 h-7 rounded-xl overflow-hidden bg-slate-100 shrink-0 mt-0.5 border border-slate-100">
                  {currentUser.photo
                    ? <img src={currentUser.photo} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-[9px]">{currentUser.displayName.charAt(0)}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {/* Bandeja de anexos pendentes (com redimensionamento de imagem) */}
                  {(pendingAtts.length > 0 || uploadingAtt) && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pendingAtts.map((a, i) => (
                        <div key={i} className="relative border border-slate-200 rounded-lg p-1 bg-white">
                          {a.kind === 'image' ? (
                            <img src={a.url} alt={a.name} className="h-16 w-16 object-cover rounded" />
                          ) : (
                            <div className="h-16 w-16 flex flex-col items-center justify-center gap-1 text-slate-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                              <span className="text-[6px] font-bold uppercase truncate max-w-[56px]">{a.name}</span>
                            </div>
                          )}
                          <button type="button" onClick={() => removeAtt(i)} title="Remover"
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[8px] shadow">
                            ✕
                          </button>
                          {a.kind === 'image' && (
                            <div className="flex items-center justify-center gap-0.5 mt-1">
                              {[['P',160],['M',280],['G',420],['○',undefined]].map(([lbl, w]) => (
                                <button key={String(lbl)} type="button" onClick={() => setAttWidth(i, w as number | undefined)}
                                  title={w ? `Redimensionar (${w}px)` : 'Tamanho original'}
                                  className={`px-1 rounded text-[7px] font-black uppercase transition-all ${a.width === w ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                                  {lbl}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {uploadingAtt && (
                        <div className="h-16 w-16 flex items-center justify-center border border-slate-200 rounded-lg">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onPaste={handleCommentPaste}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                      placeholder="Escrever... (cole imagens ou anexe)"
                      className="w-full pl-3 pr-14 py-2 bg-white rounded-2xl border border-slate-200 text-[10px] font-medium resize-none outline-none focus:border-blue-300 transition-colors"
                      rows={1}
                    />
                    {/* Anexar imagem/doc */}
                    <button type="button" onClick={() => attInputRef.current?.click()} title="Anexar imagem ou documento"
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>
                    </button>
                    <button type="button" onClick={() => setCommentEmojiOpen(v => !v)} title="Emoji"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </button>
                    {commentEmojiOpen && (
                      <EmojiPicker align="right" onPick={e => { setCommentText(t => t + e); setCommentEmojiOpen(false); }} onClose={() => setCommentEmojiOpen(false)} />
                    )}
                  </div>
                  <button
                    onClick={() => submitComment()}
                    disabled={(!commentText.trim() && pendingAtts.length === 0) || isPostingComment}
                    className="px-3 py-2 bg-blue-600 rounded-2xl text-[9px] font-black text-white uppercase hover:bg-blue-700 disabled:opacity-40 transition-all shrink-0 flex items-center"
                  >
                    {isPostingComment
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    }
                  </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
const HandoverTab: React.FC<HandoverTabProps> = ({
  user, trips, drivers, customers, ports, staffList,
}) => {
  // ── Feed state (paginado — carrega só os recentes e vai buscando ao rolar)
  const PAGE_SIZE = 8;
  const [posts,     setPosts]     = useState<HandoverPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);
  const [hasMore,   setHasMore]   = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const postsRef = useRef<HandoverPost[]>([]);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => { postsRef.current = posts; }, [posts]);

  // 3 emojis mais usados (para o atalho de reação) — atualiza ao reagir
  const [topEmojis, setTopEmojis] = useState<string[]>(getTopEmojis());
  const bumpEmoji = useCallback((emoji: string) => { recordEmojiUse(emoji); setTopEmojis(getTopEmojis()); }, []);

  // Diretório id→nome (autores de posts) para resolver quem reagiu
  const userNames = useMemo(() => {
    const map: Record<string, string> = {};
    posts.forEach(p => { if (p.authorId) map[p.authorId] = p.authorName; });
    return map;
  }, [posts]);

  // ── Notificações do feed (menções, respostas, marcações) ──────────────────
  const notifStaffId = (user as any).staffId as string | undefined | null;
  const [notifications, setNotifications] = useState<HandoverNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const loadNotifications = useCallback(async () => {
    const list = await db.getHandoverNotifications(user.id, notifStaffId || undefined);
    setNotifications(list);
  }, [user.id, notifStaffId]);
  const unreadNotif = notifications.filter(n => !n.read).length;
  useEffect(() => {
    loadNotifications();
    if (!supabase) return;
    const ch = supabase
      .channel('handover-notif-' + Math.random().toString(36).slice(2, 7))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover_notifications' }, () => loadNotifications())
      .subscribe();
    return () => { supabase!.removeChannel(ch); };
  }, [loadNotifications]);
  const markAllNotifRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await db.markAllHandoverNotificationsRead(user.id, notifStaffId || undefined);
  };
  const openNotif = async (n: HandoverNotification) => {
    if (!n.read) { setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x)); await db.markHandoverNotificationRead(n.id); }
  };
  const notifText = (n: HandoverNotification) => {
    const who = n.actorName || 'Alguém';
    if (n.type === 'mention' || n.type === 'mark') return `${who} marcou você em uma publicação`;
    if (n.commentId) return `${who} respondeu seu comentário`;
    return `${who} comentou na sua publicação`;
  };

  // ── Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEmpty,   setIsEmpty]   = useState(true);
  const [title,     setTitle]     = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);
  const [mentions,  setMentions]  = useState<HandoverMention[]>([]);

  // ── Mention picker state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSearch,     setMentionSearch]     = useState('');
  const [mentionType,       setMentionType]       = useState<'trip' | 'driver' | 'customer' | 'port' | 'user'>('trip');

  // ── Format state
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});
  const [fontFamily,    setFontFamily]    = useState('Arial');

  // ── Edit window
  const [editWindowMinutes, setEditWindowMinutes] = useState<number>(30);

  // ── Duty roster state
  const [dutyRoster,    setDutyRoster]    = useState<string[]>([]);
  const [swapRequests,  setSwapRequests]  = useState<DutySwapRequest[]>([]);
  const [swapTargetId,  setSwapTargetId]  = useState<string | null>(null);
  const [swapMessage,   setSwapMessage]   = useState('');
  const [isSavingRoster, setIsSavingRoster] = useState(false);
  const [showAddMember,  setShowAddMember]  = useState(false);

  const isAdmin        = user.role === 'admin';
  const currentStaffId = (user as any).staffId as string | undefined | null;

  // ── Load posts (primeira página) ─────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await db.getHandoverPosts(PAGE_SIZE, 0);
    setPosts(data);
    setHasMore(data.length === PAGE_SIZE);
    setIsLoading(false);
  }, []);

  // Carrega mais posts antigos ao chegar no fim do feed
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    const offset = postsRef.current.length;
    const more = await db.getHandoverPosts(PAGE_SIZE, offset);
    setPosts(prev => {
      const seen = new Set(prev.map(p => p.id));
      return [...prev, ...more.filter(p => !seen.has(p.id))];
    });
    setHasMore(more.length === PAGE_SIZE);
    setIsLoadingMore(false);
    loadingMoreRef.current = false;
  }, []);

  // Recarrega mantendo o que já estava carregado (para o realtime não "encolher" o feed)
  const refreshLoaded = useCallback(async () => {
    const count = Math.max(PAGE_SIZE, postsRef.current.length);
    const data = await db.getHandoverPosts(count, 0);
    setPosts(data);
    setHasMore(data.length === count);
  }, []);

  // ── Load duty roster + edit window ──────────────────────────────────────────
  const loadRoster = useCallback(async () => {
    const [roster, win] = await Promise.all([
      db.getDutyRoster(),
      db.getHandoverEditWindow(),
    ]);
    setDutyRoster(roster);
    setEditWindowMinutes(win);
    if (currentStaffId) {
      const reqs = await db.getSwapRequests(currentStaffId);
      setSwapRequests(reqs);
    }
  }, [currentStaffId]);

  useEffect(() => {
    load();
    loadRoster();
    if (!supabase) return;
    const channelId = `handover-${Math.random().toString(36).substr(2, 6)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover_posts' },     () => refreshLoaded())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duty_swap_requests' }, () => loadRoster())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' },    () => loadRoster())
      .subscribe();
    return () => { channel.unsubscribe(); supabase?.removeChannel(channel); };
  }, [load, loadRoster, refreshLoaded]);

  // Scroll infinito: carrega mais ao aproximar do fim do feed
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '300px' });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadMore, posts.length]);

  // ── Ordered staff for roster ─────────────────────────────────────────────────
  const orderedStaff = useMemo(() => {
    const active = staffList.filter(s => s.status === 'Ativo');
    if (dutyRoster.length === 0) return active;
    return dutyRoster
      .map(id => active.find(s => s.id === id))
      .filter(Boolean) as Staff[];
  }, [dutyRoster, staffList]);

  const availableToAdd = useMemo(() => {
    const inRoster = new Set(dutyRoster.length > 0 ? dutyRoster : orderedStaff.map(s => s.id));
    return staffList.filter(s => s.status === 'Ativo' && !inRoster.has(s.id));
  }, [dutyRoster, orderedStaff, staffList]);

  // ── Roster helpers ───────────────────────────────────────────────────────────
  const saveRoster = async (ids: string[]) => {
    const prev = [...dutyRoster];
    setDutyRoster(ids);
    setIsSavingRoster(true);
    const ok = await db.saveDutyRoster(ids);
    if (!ok) {
      showToast('Erro ao salvar escala. Verifique a configuração do banco de dados.');
      setDutyRoster(prev); // revert
    }
    setIsSavingRoster(false);
  };

  const moveRoster = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= orderedStaff.length) return;
    const ids = orderedStaff.map(s => s.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    saveRoster(ids);
  };

  const removeFromRoster = (staffId: string) => {
    const base = dutyRoster.length > 0 ? dutyRoster : orderedStaff.map(s => s.id);
    saveRoster(base.filter(id => id !== staffId));
  };

  const addToRoster = (staffId: string) => {
    const base = dutyRoster.length > 0 ? dutyRoster : orderedStaff.map(s => s.id);
    saveRoster([...base, staffId]);
    setShowAddMember(false);
  };

  // ── Edit window setting (admin) ──────────────────────────────────────────────
  const handleSaveEditWindow = async (minutes: number) => {
    setEditWindowMinutes(minutes);
    await db.saveHandoverEditWindow(minutes);
  };

  // ── Swap requests ────────────────────────────────────────────────────────────
  const sendSwap = async () => {
    if (!swapTargetId || !currentStaffId) return;
    const me     = staffList.find(s => s.id === currentStaffId);
    const target = staffList.find(s => s.id === swapTargetId);
    if (!me || !target) return;
    await db.sendSwapRequest(currentStaffId, me.name, swapTargetId, target.name, swapMessage || undefined);
    setSwapTargetId(null);
    setSwapMessage('');
    await loadRoster();
  };

  const respondSwap = async (req: DutySwapRequest, accept: boolean) => {
    let newRoster: string[] | undefined;
    if (accept) {
      const ids = orderedStaff.map(s => s.id);
      const iA  = ids.indexOf(req.fromStaffId);
      const iB  = ids.indexOf(req.toStaffId);
      if (iA !== -1 && iB !== -1) {
        [ids[iA], ids[iB]] = [ids[iB], ids[iA]];
        newRoster = ids;
      }
    }
    await db.respondSwapRequest(req.id, accept ? 'accepted' : 'rejected', newRoster);
    await loadRoster();
  };

  const mySwapRequests = swapRequests.filter(
    r => r.toStaffId === currentStaffId && r.status === 'pending'
  );

  // ── Editor helpers ───────────────────────────────────────────────────────────
  const checkEmpty = () => {
    const el = editorRef.current;
    if (!el) return;
    // Considera com conteúdo se houver texto OU mídia/anexo (imagem, link de arquivo)
    const hasText = el.innerText.trim() !== '';
    const hasMedia = !!el.querySelector('img, a[data-attachment], .handover-attachment');
    setIsEmpty(!hasText && !hasMedia);
  };

  // ── Anexos (imagens / documentos) + colar prints ────────────────────────────
  const insertHtmlAtCursor = (html: string) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('insertHTML', false, html);
    checkEmpty();
  };

  const uploadAndInsert = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const safe = (file.name || 'arquivo').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}-${safe}`;
      const url = await r2Service.upload(file, fileName, 'handover');
      if (file.type.startsWith('image/')) {
        insertHtmlAtCursor(
          `<img src="${url}" alt="${file.name}" style="max-width:100%;border-radius:10px;margin:6px 0;display:block"/><br/>`
        );
      } else {
        insertHtmlAtCursor(
          `<a href="${url}" target="_blank" rel="noopener" data-attachment="1" class="handover-attachment" contenteditable="false">📎 ${file.name}</a>&nbsp;`
        );
      }
    } catch (e) {
      console.error('[handover upload]', e);
      showToast('Erro ao enviar anexo. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files)) await uploadAndInsert(f);
  };

  // Upload simples que devolve a URL (usado para GIF/figurinha nos comentários)
  const uploadFileToR2 = useCallback(async (file: File): Promise<string | null> => {
    try {
      const safe = (file.name || 'gif').replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}-${safe}`;
      return await r2Service.upload(file, fileName, 'handover');
    } catch (e) {
      console.error('[handover sticker upload]', e);
      return null;
    }
  }, []);

  const handleEditorPaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems = Array.from(items).filter(it => it.kind === 'file' && it.type.startsWith('image/'));
    if (imageItems.length === 0) return; // deixa o paste normal de texto seguir
    e.preventDefault();
    imageItems.forEach(it => {
      const blob = it.getAsFile();
      if (blob) {
        const ext = (blob.type.split('/')[1] || 'png').replace('+xml', '');
        const named = new File([blob], `print-${Date.now()}.${ext}`, { type: blob.type });
        uploadAndInsert(named);
      }
    });
  }, [uploadAndInsert]);

  // Clique numa imagem do editor: cicla o tamanho (redimensionar na publicação)
  const IMG_SIZES = ['100%', '75%', '50%', '25%'];
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'IMG') return;
    const img = target as HTMLImageElement;
    const cur = img.style.width || '100%';
    const idx = IMG_SIZES.indexOf(cur);
    const nextSize = IMG_SIZES[(idx + 1) % IMG_SIZES.length];
    img.style.width = nextSize;
    img.style.height = 'auto';
    showToast(`Tamanho da imagem: ${nextSize}`);
    checkEmpty();
  };

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    setActiveFormats({
      bold:          document.queryCommandState('bold'),
      italic:        document.queryCommandState('italic'),
      underline:     document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      justifyLeft:   document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight:  document.queryCommandState('justifyRight'),
    });
  };

  const insertHR = () => {
    document.execCommand('insertHTML', false, '<hr style="border:none;border-top:2px solid #e2e8f0;margin:12px 0"/><br/>');
    editorRef.current?.focus();
    checkEmpty();
  };

  const insertCodeBlock = () => {
    document.execCommand('insertHTML', false,
      '<pre style="background:#1e293b;color:#a5f3fc;padding:10px 14px;border-radius:8px;font-family:\'Courier New\',monospace;font-size:11px;line-height:1.6;margin:8px 0;white-space:pre-wrap;display:block">$ </pre><br/>'
    );
    editorRef.current?.focus();
    checkEmpty();
  };

  const applyFont = (font: string) => {
    setFontFamily(font);
    execCmd('fontName', font);
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

  const getMentionOptions = (): HandoverMention[] => {
    const q = mentionSearch.toLowerCase();
    switch (mentionType) {
      case 'trip':
        return trips.filter(t => t.os?.toLowerCase().includes(q) || t.customer?.name?.toLowerCase().includes(q)).slice(0, 8).map(t => ({ type: 'trip', id: t.id, label: `OS ${t.os}` }));
      case 'driver':
        return drivers.filter(d => d.name?.toLowerCase().includes(q)).slice(0, 8).map(d => ({ type: 'driver', id: d.id, label: d.name }));
      case 'customer':
        return customers.filter(c => c.name?.toLowerCase().includes(q) || c.legalName?.toLowerCase().includes(q)).slice(0, 8).map(c => ({ type: 'customer', id: c.id, label: c.legalName || c.name }));
      case 'port':
        return ports.filter(p => p.name?.toLowerCase().includes(q)).slice(0, 8).map(p => ({ type: 'port', id: p.id, label: p.name }));
      case 'user':
        return staffList.filter(s => s.status === 'Ativo' && s.name?.toLowerCase().includes(q)).slice(0, 8).map(s => ({ type: 'user', id: s.id, label: s.name }));
      default:
        return [];
    }
  };

  const handlePost = async () => {
    const el = editorRef.current;
    if (!el) return;
    const hasText = el.innerText.trim() !== '';
    const hasMedia = !!el.querySelector('img, a[data-attachment], .handover-attachment');
    // Permite publicar com texto, título, ou apenas mídia/anexo
    if (!hasText && !hasMedia && !title.trim()) return;
    setIsPosting(true);
    const id = await db.saveHandoverPost({
      title:       title.trim() || undefined,
      content:     el.innerHTML,
      authorId:    user.id,
      authorName:  user.displayName,
      authorPhoto: user.photo,
      authorRole:  user.role,
      authorPosition: user.position || staffList.find(s => s.id === currentStaffId)?.position,
      mentions,
    });
    if (!id) {
      showToast('Erro ao publicar. Verifique sua conexão e tente novamente.');
      setIsPosting(false);
      return;
    }
    // Notifica os usuários marcados (menções do tipo 'user')
    const excerpt = title.trim() || (el.innerText || '').trim().slice(0, 80);
    mentions.filter(m => m.type === 'user').forEach(m => {
      db.createHandoverNotification({ recipientStaffId: m.id, recipientName: m.label, actorId: user.id, actorName: user.displayName, type: 'mention', postId: id, excerpt });
    });
    el.innerHTML = '';
    setIsEmpty(true);
    setTitle('');
    setMentions([]);
    setIsComposerOpen(false);
    await refreshLoaded();
    setIsPosting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este post?')) return;
    await db.deleteHandoverPost(id);
    setPosts(prev => prev.filter(p => p.id !== id));
  };

  const handleEdited = (id: string, newContent: string) => {
    setPosts(prev => prev.map(p => p.id === id
      ? { ...p, content: newContent, updatedAt: new Date().toISOString() }
      : p
    ));
  };

  const COLORS = ['#0f172a', '#1e40af', '#047857', '#b91c1c', '#7c3aed', '#b45309', '#6b7280'];
  const mentionTabLabels: Record<string, string> = { trip: 'Viagem', driver: 'Motorista', customer: 'Cliente', port: 'Porto', user: 'Usuário' };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-6 items-start">

      {/* ── LEFT: composer + feed ── */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Feed de Atividades</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Feed de comunicação da equipe</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sino de notificações */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className={`relative p-2 bg-white rounded-xl border transition-all ${notifOpen ? 'border-blue-400 text-blue-600' : 'border-slate-200 text-slate-400 hover:text-blue-600'}`}
                title="Notificações"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                </svg>
                {unreadNotif > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-black leading-none ring-2 ring-white">
                    {unreadNotif > 9 ? '9+' : unreadNotif}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setNotifOpen(false)} />
                  <div className="absolute z-[61] right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Notificações</span>
                      {unreadNotif > 0 && (
                        <button onClick={markAllNotifRead} className="text-[8px] font-black text-blue-500 hover:text-blue-700 uppercase">Marcar todas lidas</button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-[9px] font-bold text-slate-400 uppercase text-center py-8">Sem notificações</p>
                      ) : notifications.map(n => (
                        <button key={n.id} onClick={() => openNotif(n)}
                          className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-2.5 ${n.read ? '' : 'bg-blue-50/40'}`}>
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-blue-500'}`} />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-slate-700 leading-snug">{notifText(n)}</p>
                            {n.excerpt && <p className="text-[9px] text-slate-400 truncate mt-0.5">"{n.excerpt}"</p>}
                            <p className="text-[7px] font-black text-slate-400 uppercase mt-0.5">{relativeTime(n.createdAt)}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={load}
              className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all"
              title="Atualizar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>
            {!isComposerOpen && (
              <button
                onClick={() => setIsComposerOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide hover:bg-blue-700 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
                </svg>
                Novo
              </button>
            )}
          </div>
        </div>

        {/* ── Composer ── */}
        {isComposerOpen && (
          <div className="bg-white rounded-[2rem] border border-blue-100 shadow-sm overflow-hidden">

            {/* Author row */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  {user.photo
                    ? <img src={user.photo} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-sm">{user.displayName.charAt(0)}</div>
                  }
                </div>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wide">{user.displayName}</p>
              </div>
              <button
                onClick={() => { setIsComposerOpen(false); if (editorRef.current) editorRef.current.innerHTML = ''; setIsEmpty(true); setTitle(''); setMentions([]); }}
                className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                title="Fechar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-2.5 border-b border-slate-100 flex-wrap">
              <ToolBtn title="Negrito"        active={activeFormats.bold}          onClick={() => execCmd('bold')}><b>B</b></ToolBtn>
              <ToolBtn title="Itálico"        active={activeFormats.italic}        onClick={() => execCmd('italic')}><i>I</i></ToolBtn>
              <ToolBtn title="Sublinhado"     active={activeFormats.underline}     onClick={() => execCmd('underline')}><u>S</u></ToolBtn>
              <ToolBtn title="Tachado"        active={activeFormats.strikeThrough} onClick={() => execCmd('strikeThrough')}><s>T</s></ToolBtn>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolBtn title="Título grande"  onClick={() => execCmd('formatBlock', 'h2')}>H1</ToolBtn>
              <ToolBtn title="Título médio"   onClick={() => execCmd('formatBlock', 'h3')}>H2</ToolBtn>
              <ToolBtn title="Parágrafo"      onClick={() => execCmd('formatBlock', 'div')}>¶</ToolBtn>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolBtn title="Texto pequeno"      onClick={() => execCmd('fontSize', '2')}><span className="text-[8px]">A</span></ToolBtn>
              <ToolBtn title="Texto médio"        onClick={() => execCmd('fontSize', '3')}><span className="text-[10px]">A</span></ToolBtn>
              <ToolBtn title="Texto grande"       onClick={() => execCmd('fontSize', '5')}><span className="text-[14px]">A</span></ToolBtn>
              <ToolBtn title="Texto extra grande" onClick={() => execCmd('fontSize', '6')}><span className="text-[18px]">A</span></ToolBtn>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <CustomSelect
                value={fontFamily}
                onChange={v => applyFont(v)}
                options={[
                  { value: 'Arial', label: 'Arial' },
                  { value: 'Georgia', label: 'Georgia' },
                  { value: "'Courier New'", label: 'Courier New' },
                  { value: "'Times New Roman'", label: 'Times New Roman' },
                  { value: 'Trebuchet MS', label: 'Trebuchet' },
                  { value: 'Verdana', label: 'Verdana' },
                ]}
                inputClassName="!py-1.5 !text-[9px]"
              />
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolBtn title="Esquerda"   active={activeFormats.justifyLeft}   onClick={() => execCmd('justifyLeft')}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M3 12h12M3 18h18"/></svg>
              </ToolBtn>
              <ToolBtn title="Centro"     active={activeFormats.justifyCenter} onClick={() => execCmd('justifyCenter')}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M6 12h12M3 18h18"/></svg>
              </ToolBtn>
              <ToolBtn title="Direita"    active={activeFormats.justifyRight}  onClick={() => execCmd('justifyRight')}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M9 12h12M3 18h18"/></svg>
              </ToolBtn>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <ToolBtn title="Inserir separador" onClick={insertHR}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12h18"/><path d="M3 6h2m14 0h2M3 18h2m14 0h2" strokeLinecap="round"/></svg>
              </ToolBtn>
              <ToolBtn title="Bloco de código" onClick={insertCodeBlock}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16M8 8l-4 4 4 4M16 8l4 4-4 4"/></svg>
              </ToolBtn>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              {COLORS.map(c => (
                <button key={c} type="button" title="Cor do texto" onMouseDown={e => { e.preventDefault(); execCmd('foreColor', c); }}
                  className="w-4 h-4 rounded-full border border-white shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button
                type="button"
                title="Anexar imagem ou documento"
                onMouseDown={e => { e.preventDefault(); fileInputRef.current?.click(); }}
                className={`px-2 h-7 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all ${isUploading ? 'bg-slate-100 text-slate-400' : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'}`}
              >
                {isUploading
                  ? <><div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"/>Enviando</>
                  : <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>Anexar</>}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                multiple
                className="hidden"
                onChange={e => { handleFilesSelected(e.target.files); e.target.value = ''; }}
              />
              <div className="relative">
                <button
                  type="button"
                  title="Inserir emoji"
                  onMouseDown={e => { e.preventDefault(); setComposerEmojiOpen(v => !v); }}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-[15px] transition-all ${composerEmojiOpen ? 'bg-blue-600' : 'hover:bg-slate-100'}`}
                >
                  😊
                </button>
                {composerEmojiOpen && (
                  <EmojiPicker direction="down" onPick={e => { insertHtmlAtCursor(e); setComposerEmojiOpen(false); }} onClose={() => setComposerEmojiOpen(false)} />
                )}
              </div>
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <button
                type="button"
                title="Citar"
                onMouseDown={e => { e.preventDefault(); setShowMentionPicker(v => !v); }}
                className={`px-2 h-7 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all ${showMentionPicker ? 'bg-blue-600 text-white' : 'text-blue-600 hover:bg-blue-50 border border-blue-200'}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
                </svg>
                Citar
              </button>
            </div>

            {/* Mention Picker */}
            {showMentionPicker && (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 space-y-2">
                <div className="flex gap-1.5 flex-wrap">
                  {(['trip', 'driver', 'customer', 'port', 'user'] as const).map(t => (
                    <button key={t} type="button" onClick={() => { setMentionType(t); setMentionSearch(''); }}
                      className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase transition-all ${mentionType === t ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                      {chipIcons[t]} {mentionTabLabels[t]}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder={`Buscar ${mentionType === 'trip' ? 'por OS...' : mentionType === 'user' ? 'por nome...' : '...'}`}
                  value={mentionSearch}
                  onChange={e => setMentionSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-medium bg-white outline-none focus:border-blue-400"
                  autoFocus
                />
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {getMentionOptions().length === 0
                    ? <p className="text-[8px] text-slate-400 font-bold uppercase">Nenhum resultado</p>
                    : getMentionOptions().map(item => (
                      <button key={item.id} type="button" onClick={() => insertMention(item)}
                        className={`px-2.5 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all hover:scale-105 ${chipColors[item.type]}`}>
                        {chipIcons[item.type]} {item.label}
                      </button>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Título */}
            <div className="px-6 pt-3">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título (opcional)"
                className="w-full px-0 py-1 border-0 border-b border-transparent focus:border-slate-200 outline-none text-slate-800 text-[15px] font-black placeholder:text-slate-300 placeholder:font-bold bg-transparent transition-colors"
              />
            </div>

            {/* Editor */}
            <div className="relative">
              {isEmpty && (
                <div className="absolute top-4 left-6 text-slate-300 text-[13px] font-medium pointer-events-none select-none">
                  Escreva sua atualização... (cole prints com Ctrl+V)
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={checkEmpty}
                onPaste={handleEditorPaste}
                onClick={handleEditorClick}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                title="Dica: clique numa imagem para mudar o tamanho"
                className="min-h-[140px] px-6 py-4 outline-none text-slate-800 text-[13px] leading-relaxed handover-editor"
              />
            </div>

            {/* Post footer */}
            <div className="px-6 pb-5 pt-2 flex justify-between items-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase">
                {mentions.length > 0
                  ? `${mentions.length} citaç${mentions.length > 1 ? 'ões' : 'ão'}`
                  : 'Use Citar para referenciar viagens, motoristas e mais'
                }
              </p>
              <button
                onClick={handlePost}
                disabled={(isEmpty && !title.trim()) || isPosting || isUploading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wide transition-all hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPosting
                  ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Postando...</span></>
                  : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg><span>Publicar</span></>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── Feed ── */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="w-7 h-7 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Carregando feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24 space-y-3">
            <div className="w-16 h-16 bg-slate-100 rounded-[2rem] flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
            </div>
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma atividade registrada</p>
            <p className="text-[9px] text-slate-300 font-medium">Clique em "+ Novo" para publicar a primeira atividade</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUser={user}
                editWindowMinutes={editWindowMinutes}
                isAdmin={isAdmin}
                staffList={staffList}
                topEmojis={topEmojis}
                userNames={userNames}
                onEmojiUsed={bumpEmoji}
                onUploadFile={uploadFileToR2}
                onDelete={handleDelete}
                onEdited={handleEdited}
              />
            ))}
            {/* Sentinela + indicador de carregamento incremental */}
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-6">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Carregando mais...</span>
                  </div>
                ) : (
                  <button onClick={loadMore} className="text-[9px] font-black text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-colors">
                    Carregar mais
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: Duty Roster + settings ── */}
      <div className="w-72 shrink-0 space-y-4 sticky top-4">

        {/* Edit window setting (admin only) */}
        {isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Prazo para Edição
            </p>
            <CustomSelect
              value={String(editWindowMinutes)}
              onChange={v => handleSaveEditWindow(Number(v))}
              options={[
                { value: '0', label: 'Sem prazo (ilimitado)' },
                { value: '15', label: '15 minutos' },
                { value: '30', label: '30 minutos' },
                { value: '60', label: '1 hora' },
                { value: '120', label: '2 horas' },
                { value: '240', label: '4 horas' },
                { value: '-1', label: 'Desabilitado (sem edição)' },
              ]}
              inputClassName="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 bg-white outline-none cursor-pointer hover:border-slate-400 transition-all"
            />
            <p className="text-[7px] font-bold text-slate-400 uppercase leading-relaxed">
              Janela de tempo após publicar para editar posts e comentários
            </p>
          </div>
        )}

        {/* Roster card */}
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Escala de Plantão</h2>
              {isSavingRoster
                ? <p className="text-[8px] text-blue-400 font-bold uppercase mt-0.5">Salvando...</p>
                : isAdmin && <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Use ↑↓ para ordenar</p>
              }
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddMember(v => !v)}
                title="Adicionar membro"
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${showAddMember ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
              </button>
            )}
          </div>

          {/* Add member picker */}
          {isAdmin && showAddMember && (
            <div className="px-4 py-3 border-b border-slate-100 bg-blue-50/50">
              {availableToAdd.length === 0 ? (
                <p className="text-[8px] font-bold text-slate-400 uppercase text-center py-1">Todos os membros já estão na escala</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Adicionar membro:</p>
                  {availableToAdd.map(s => (
                    <button key={s.id} onClick={() => addToRoster(s.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-blue-100 transition-all text-left group">
                      <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        {s.photo ? <img src={s.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-[9px]">{s.name.charAt(0)}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-700 truncate">{s.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{s.position}</p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Staff list */}
          {orderedStaff.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-[9px] font-bold text-slate-300 uppercase">Nenhum colaborador ativo</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {orderedStaff.map((staff, idx) => {
                const isMe = staff.id === currentStaffId;
                return (
                  <div key={staff.id} className={`flex items-center gap-3 px-4 py-3 transition-colors ${isMe ? 'bg-blue-50/60' : 'hover:bg-slate-50/60'}`}>
                    <span className="text-[9px] font-black text-slate-300 w-4 text-right shrink-0">{idx + 1}</span>
                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                      {staff.photo ? <img src={staff.photo} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-xs">{staff.name.charAt(0)}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[10px] font-black truncate ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                        {staff.name}{isMe && <span className="ml-1 text-[7px] font-bold text-blue-400">(você)</span>}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase truncate">{staff.position}</p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isAdmin && (
                        <>
                          <button onClick={() => moveRoster(idx, -1)} disabled={idx === 0} title="Subir" className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-all rounded">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7"/></svg>
                          </button>
                          <button onClick={() => moveRoster(idx, 1)} disabled={idx === orderedStaff.length - 1} title="Descer" className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-all rounded">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/></svg>
                          </button>
                          <button onClick={() => removeFromRoster(staff.id)} title="Remover da escala" className="p-1 text-slate-200 hover:text-red-400 hover:bg-red-50 transition-all rounded ml-0.5">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </>
                      )}
                      {currentStaffId && !isMe && !isAdmin && (
                        <button
                          onClick={() => setSwapTargetId(prev => prev === staff.id ? null : staff.id)}
                          title="Solicitar troca"
                          className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ml-1 ${swapTargetId === staff.id ? 'bg-blue-600 text-white' : 'text-blue-500 hover:bg-blue-50 border border-blue-100'}`}
                        >
                          ⇄
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Swap request form */}
        {swapTargetId && (
          <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 space-y-3">
            <p className="text-[9px] font-black text-slate-800 uppercase">
              Trocar posição com {orderedStaff.find(s => s.id === swapTargetId)?.name}
            </p>
            <textarea
              placeholder="Mensagem (opcional)..."
              value={swapMessage}
              onChange={e => setSwapMessage(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-medium resize-none outline-none focus:border-blue-400 transition-colors"
              rows={2}
            />
            <div className="flex gap-2">
              <button onClick={() => { setSwapTargetId(null); setSwapMessage(''); }} className="flex-1 py-2 rounded-xl border border-slate-200 text-[9px] font-black text-slate-500 uppercase hover:bg-slate-50 transition-all">
                Cancelar
              </button>
              <button onClick={sendSwap} className="flex-1 py-2 bg-blue-600 rounded-xl text-[9px] font-black text-white uppercase hover:bg-blue-700 transition-all">
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* Pending swap requests */}
        {mySwapRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest px-1">
              ● {mySwapRequests.length} solicitaç{mySwapRequests.length > 1 ? 'ões' : 'ão'} pendente{mySwapRequests.length > 1 ? 's' : ''}
            </p>
            {mySwapRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 space-y-2">
                <p className="text-[9px] font-black text-slate-800 uppercase">{req.fromStaffName} quer trocar posição com você</p>
                {req.message && <p className="text-[9px] text-slate-500 font-medium italic">"{req.message}"</p>}
                <div className="flex gap-2">
                  <button onClick={() => respondSwap(req, false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-[9px] font-black text-slate-500 uppercase hover:bg-slate-50 transition-all">
                    Recusar
                  </button>
                  <button onClick={() => respondSwap(req, true)} className="flex-1 py-2 bg-emerald-600 rounded-xl text-[9px] font-black text-white uppercase hover:bg-emerald-700 transition-all">
                    Aceitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Inline CSS ── */}
      <style>{`
        .handover-editor h2, .handover-content h2 { font-size: 1.4em; font-weight: 900; color: #0f172a; margin: 8px 0 4px; line-height: 1.2; text-transform: uppercase; letter-spacing: 0.03em; }
        .handover-editor h3, .handover-content h3 { font-size: 1.15em; font-weight: 800; color: #1e293b; margin: 6px 0 3px; line-height: 1.2; }
        .handover-editor ul, .handover-content ul { list-style: disc; padding-left: 1.5em; }
        .handover-editor ol, .handover-content ol { list-style: decimal; padding-left: 1.5em; }
        .handover-editor p,  .handover-content p  { margin: 2px 0; }
        .handover-editor hr, .handover-content hr { border: none; border-top: 2px solid #e2e8f0; margin: 12px 0; }
        .handover-editor pre, .handover-content pre { background: #1e293b; color: #a5f3fc; padding: 10px 14px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.6; margin: 8px 0; white-space: pre-wrap; }
        .handover-editor img, .handover-content img { max-width: 100%; border-radius: 10px; margin: 6px 0; display: block; }
        .handover-editor .handover-attachment, .handover-content .handover-attachment, .handover-editor a[data-attachment], .handover-content a[data-attachment] { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 8px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; font-size: 10px; font-weight: 800; text-decoration: none; margin: 2px; }
        .mention-chip { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 999px; font-size: 9px; font-weight: 900; text-transform: uppercase; border: 1px solid; margin: 0 2px; cursor: default; }
        .mention-trip     { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
        .mention-driver   { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .mention-customer { background: #ede9fe; color: #6d28d9; border-color: #ddd6fe; }
        .mention-port     { background: #fef3c7; color: #92400e; border-color: #fde68a; }
        .mention-user     { background: #ffe4e6; color: #be123c; border-color: #fecdd3; }
      `}</style>
    </div>
  );
};

export default HandoverTab;
