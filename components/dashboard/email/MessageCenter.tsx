import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User, MessageTemplate, Trip } from '../../../types';
import { db } from '../../../utils/storage';
import MessageComposerModal from './MessageComposerModal';

interface MessageCenterProps {
  user: User;
  trips: Trip[];
}

const MessageCenter: React.FC<MessageCenterProps> = ({ user, trips }) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await db.getMessageTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadTemplates();

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, loadTemplates]);

  const openComposer = (t: MessageTemplate | null) => {
    setSelectedTemplate(t);
    setIsComposerOpen(true);
    setIsOpen(false);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTemplateToDelete(id);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await db.deleteMessageTemplate(templateToDelete);
      loadTemplates();
      setTemplateToDelete(null);
    }
  };

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 rounded-xl transition-all border ${isOpen ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-white hover:text-emerald-600'}`}
        title="Mensagens Prontas"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-[420px] bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[300]">
          <div className="p-8 bg-slate-50 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Mensagens Prontas</h4>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">Modelos Formatados para WhatsApp</p>
              </div>
              <button
                onClick={() => openComposer(null)}
                className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-90"
                title="Nova Mensagem"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
          </div>

          <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-6 space-y-4 bg-white min-h-[200px]">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carregando...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                  <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                </div>
                <p className="text-[10px] text-slate-300 font-black uppercase italic">Nenhuma mensagem cadastrada</p>
                <button onClick={() => openComposer(null)} className="text-[9px] font-black text-emerald-600 uppercase hover:underline">
                  Criar minha primeira mensagem
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Minhas Mensagens</span>
                {templates.map(t => (
                  <div
                    key={t.id}
                    onClick={() => openComposer(t)}
                    className="w-full text-left p-5 bg-slate-50 border border-slate-100 rounded-[2rem] transition-all hover:bg-slate-100/80 group relative overflow-hidden cursor-pointer active:scale-[0.98]"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">WhatsApp</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); openComposer(t); }} className="p-1.5 text-slate-400 hover:text-emerald-600 bg-white rounded-lg border border-slate-200 shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5"/></svg></button>
                        <button onClick={(e) => handleDelete(e, t.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded-lg border border-slate-200 shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                      </div>
                    </div>
                    <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-emerald-600 transition-colors">{t.name}</h5>
                    <p className="text-[9px] text-slate-500 font-medium mt-1 leading-snug line-clamp-2 whitespace-pre-wrap">{t.body}</p>
                    <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-end">
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] font-black text-emerald-600 uppercase">Abrir e Editar</span>
                        <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {isComposerOpen && createPortal(
        <MessageComposerModal
          isOpen={isComposerOpen}
          onClose={() => { setIsComposerOpen(false); setSelectedTemplate(null); }}
          onSuccess={loadTemplates}
          template={selectedTemplate}
          user={user}
          trips={trips}
        />,
        document.body
      )}

      {templateToDelete && createPortal(
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">Excluir Mensagem?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Tem certeza que deseja excluir esta mensagem pronta? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button onClick={() => setTemplateToDelete(null)} className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20">Excluir</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MessageCenter;
