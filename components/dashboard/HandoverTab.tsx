
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { User, Trip, Driver, Customer, Port, HandoverPost, HandoverComment, HandoverMention, Staff, DutySwapRequest } from '../../types';
import { db, supabase } from '../../utils/storage';
import { showToast } from '../shared/SimpleToast';

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

// ── Post Card (self-contained with comments + edit) ───────────────────────────
const PostCard: React.FC<{
  post: HandoverPost;
  currentUser: User;
  editWindowMinutes: number; // 0 = unlimited, -1 = disabled
  isAdmin: boolean;
  onDelete: (id: string) => void;
  onEdited: (id: string, newContent: string) => void;
}> = ({ post, currentUser, editWindowMinutes, isAdmin, onDelete, onEdited }) => {

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
  const [showComments,      setShowComments]      = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentText,       setCommentText]       = useState('');
  const [isPostingComment,  setIsPostingComment]  = useState(false);
  const [editingCommentId,  setEditingCommentId]  = useState<string | null>(null);
  const [editCommentText,   setEditCommentText]   = useState('');
  const [commentCount,      setCommentCount]      = useState<number | null>(null);

  const loadComments = useCallback(async () => {
    setIsLoadingComments(true);
    const data = await db.getHandoverComments(post.id);
    setComments(data);
    setCommentCount(data.length);
    setIsLoadingComments(false);
  }, [post.id]);

  const toggleComments = async () => {
    const willShow = !showComments;
    setShowComments(willShow);
    if (willShow) await loadComments();
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    setIsPostingComment(true);
    await db.saveHandoverComment({
      postId:      post.id,
      content:     commentText.trim(),
      authorId:    currentUser.id,
      authorName:  currentUser.displayName,
      authorPhoto: currentUser.photo,
      authorRole:  currentUser.role,
    });
    setCommentText('');
    await loadComments();
    setIsPostingComment(false);
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
              {post.authorRole ? (roleLabel[post.authorRole] || post.authorRole) : 'Equipe'} · {relativeTime(post.createdAt)}
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
        <div className="px-6 pb-4 text-slate-800 handover-content" dangerouslySetInnerHTML={{ __html: post.content }} />
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
        <div className="px-6 pb-3 pt-1 border-t border-slate-50">
          <button
            onClick={toggleComments}
            className={`flex items-center gap-1.5 text-[9px] font-black uppercase transition-colors ${showComments ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
            {commentCount !== null
              ? `${commentCount} comentário${commentCount !== 1 ? 's' : ''}`
              : 'Comentários'
            }
          </button>
        </div>
      )}

      {/* Comments section */}
      {!isEditingPost && showComments && (
        <div className="border-t border-slate-50 bg-slate-50/40 px-6 py-4 space-y-3">
          {isLoadingComments ? (
            <div className="flex items-center gap-2 justify-center py-3">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Carregando...</span>
            </div>
          ) : (
            <>
              {/* Comment list */}
              {comments.map(c => {
                const cCanEdit = withinWindow(c.createdAt, c.authorId);
                const cCanDel  = currentUser.id === c.authorId || isAdmin;
                return (
                  <div key={c.id} className="flex gap-2.5 group">
                    <div className="w-7 h-7 rounded-xl overflow-hidden bg-slate-100 shrink-0 mt-0.5 border border-slate-100">
                      {c.authorPhoto
                        ? <img src={c.authorPhoto} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-[9px]">{c.authorName.charAt(0)}</div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white rounded-2xl px-3 py-2 border border-slate-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-black text-slate-600 uppercase">{c.authorName}</span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {cCanEdit && editingCommentId !== c.id && (
                              <button onClick={() => { setEditingCommentId(c.id); setEditCommentText(c.content); }} className="p-1 text-slate-300 hover:text-blue-500 rounded-lg transition-all">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                              </button>
                            )}
                            {cCanDel && (
                              <button onClick={() => deleteComment(c.id)} className="p-1 text-slate-300 hover:text-red-500 rounded-lg transition-all">
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
                          <p className="text-[10px] text-slate-700 font-medium leading-relaxed">{c.content}
                            {c.updatedAt && <span className="text-[7px] text-slate-300 ml-1">· editado</span>}
                          </p>
                        )}
                      </div>
                      <p className="text-[7px] font-bold text-slate-400 uppercase mt-1 ml-2">{relativeTime(c.createdAt)}</p>
                    </div>
                  </div>
                );
              })}

              {/* New comment input */}
              <div className="flex gap-2.5 pt-2 border-t border-slate-100">
                <div className="w-7 h-7 rounded-xl overflow-hidden bg-slate-100 shrink-0 mt-0.5 border border-slate-100">
                  {currentUser.photo
                    ? <img src={currentUser.photo} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-400 font-black text-[9px]">{currentUser.displayName.charAt(0)}</div>
                  }
                </div>
                <div className="flex-1 flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                    placeholder="Escrever comentário... (Enter para enviar)"
                    className="flex-1 px-3 py-2 bg-white rounded-2xl border border-slate-200 text-[10px] font-medium resize-none outline-none focus:border-blue-300 transition-colors"
                    rows={1}
                  />
                  <button
                    onClick={submitComment}
                    disabled={!commentText.trim() || isPostingComment}
                    className="px-3 py-2 bg-blue-600 rounded-2xl text-[9px] font-black text-white uppercase hover:bg-blue-700 disabled:opacity-40 transition-all shrink-0 flex items-center"
                  >
                    {isPostingComment
                      ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                    }
                  </button>
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
  // ── Feed state
  const [posts,     setPosts]     = useState<HandoverPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPosting, setIsPosting] = useState(false);

  // ── Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty,   setIsEmpty]   = useState(true);
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

  // ── Load posts ───────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await db.getHandoverPosts();
    setPosts(data);
    setIsLoading(false);
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'handover_posts' },     () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duty_swap_requests' }, () => loadRoster())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' },    () => loadRoster())
      .subscribe();
    return () => { channel.unsubscribe(); supabase?.removeChannel(channel); };
  }, [load, loadRoster]);

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
    if (el) setIsEmpty(el.innerText.trim() === '');
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
    if (!el || el.innerText.trim() === '') return;
    setIsPosting(true);
    await db.saveHandoverPost({
      content:     el.innerHTML,
      authorId:    user.id,
      authorName:  user.displayName,
      authorPhoto: user.photo,
      authorRole:  user.role,
      mentions,
    });
    el.innerHTML = '';
    setIsEmpty(true);
    setMentions([]);
    setIsComposerOpen(false);
    await load();
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
            <h1 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">Passagem de Serviço</h1>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">Feed de comunicação da equipe</p>
          </div>
          <div className="flex items-center gap-2">
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
                onClick={() => { setIsComposerOpen(false); if (editorRef.current) editorRef.current.innerHTML = ''; setIsEmpty(true); setMentions([]); }}
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
              <select
                title="Família de fonte"
                value={fontFamily}
                onChange={e => applyFont(e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                className="h-7 px-2 rounded-lg border border-slate-200 text-[9px] font-bold text-slate-600 bg-white outline-none cursor-pointer hover:border-slate-400 transition-all"
              >
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
                <option value="'Courier New'">Courier New</option>
                <option value="'Times New Roman'">Times New Roman</option>
                <option value="Trebuchet MS">Trebuchet</option>
                <option value="Verdana">Verdana</option>
              </select>
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

            {/* Editor */}
            <div className="relative">
              {isEmpty && (
                <div className="absolute top-4 left-6 text-slate-300 text-[13px] font-medium pointer-events-none select-none">
                  Escreva sua passagem de serviço...
                </div>
              )}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={checkEmpty}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
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
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Nenhuma passagem registrada</p>
            <p className="text-[9px] text-slate-300 font-medium">Clique em "+ Novo" para publicar a primeira passagem</p>
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
                onDelete={handleDelete}
                onEdited={handleEdited}
              />
            ))}
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
            <select
              value={editWindowMinutes}
              onChange={e => handleSaveEditWindow(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 bg-white outline-none cursor-pointer hover:border-slate-400 transition-all"
            >
              <option value={0}>Sem prazo (ilimitado)</option>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
              <option value={60}>1 hora</option>
              <option value={120}>2 horas</option>
              <option value={240}>4 horas</option>
              <option value={-1}>Desabilitado (sem edição)</option>
            </select>
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
