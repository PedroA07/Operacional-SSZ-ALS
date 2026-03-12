
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { User, EmailTemplate, Trip } from '../../../types';
import { db } from '../../../utils/storage';
import EmailTemplateModal from './EmailTemplateModal';
import EmailGeneratorModal from './EmailGeneratorModal';
import { reportGenerator } from '../../../utils/reportGenerator';

interface EmailCenterProps {
  user: User;
  trips: Trip[];
}

const EmailCenter: React.FC<EmailCenterProps> = ({ user, trips }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadTemplates = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const data = await db.getEmailTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
    
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, loadTemplates]);

  const handleOpenGenerator = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsGeneratorModalOpen(true);
    setIsOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTemplateToDelete(id);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      const success = await db.deleteEmailTemplate(templateToDelete);
      if (success) loadTemplates();
      setTemplateToDelete(null);
    }
  };

  const handleEdit = (e: React.MouseEvent, t: EmailTemplate) => {
    e.stopPropagation();
    setSelectedTemplate(t);
    setIsTemplateModalOpen(true);
  };

  return (
    <div className="relative flex items-center" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 rounded-xl transition-all border ${isOpen ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-900'}`}
        title="Modelos de E-mail"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-4 w-[420px] bg-white rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 zoom-in-95 duration-300 z-[300]">
          <div className="p-8 bg-slate-50 border-b border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Modelos de E-mail</h4>
                <p className="text-[7px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">Gestão de Comunicação ALS</p>
              </div>
              <button 
                onClick={() => { setSelectedTemplate(null); setIsTemplateModalOpen(true); setIsOpen(false); }}
                className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-90"
                title="Novo Modelo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
              </button>
            </div>
          </div>

          <div className="max-h-[450px] overflow-y-auto custom-scrollbar p-6 space-y-4 bg-white min-h-[200px]">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carregando Modelos...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto border border-slate-100">
                  <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2"/></svg>
                </div>
                <p className="text-[10px] text-slate-300 font-black uppercase italic">Nenhum modelo cadastrado</p>
                <button 
                  onClick={() => { setSelectedTemplate(null); setIsTemplateModalOpen(true); }}
                  className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                >
                  Criar meu primeiro modelo
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-4">Meus Modelos</span>
                  {templates.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handleOpenGenerator(t)}
                      className="w-full text-left p-5 bg-slate-50 border border-slate-100 rounded-[2rem] transition-all hover:bg-slate-100/80 group relative overflow-hidden cursor-pointer active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.config.headerColor }}></div>
                          <span className="text-[7px] font-black uppercase text-slate-400 tracking-widest">{t.config.headerOrientation}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={(e) => handleEdit(e, t)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-white rounded-lg border border-slate-200 shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" strokeWidth="2.5"/></svg></button>
                          <button onClick={(e) => handleDelete(e, t.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-white rounded-lg border border-slate-200 shadow-sm"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                        </div>
                      </div>
                      <h5 className="text-[11px] font-black text-slate-800 uppercase leading-tight group-hover:text-blue-600 transition-colors">{t.name}</h5>
                      <p className="text-[9px] text-slate-500 font-medium mt-1 leading-snug line-clamp-1">{t.subject}</p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-200/50 flex items-center justify-between">
                        <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-tighter">Colunas: <span className="text-slate-600">{t.config.tables ? t.config.tables[0]?.columns.length : t.config.columns?.length || 0}</span></span>
                        <div className="flex items-center gap-1">
                          <span className="text-[8px] font-black text-blue-500 uppercase">Clique para Copiar</span>
                          <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="3"/></svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isTemplateModalOpen && createPortal(
        <EmailTemplateModal 
          isOpen={isTemplateModalOpen} 
          onClose={() => { setIsTemplateModalOpen(false); setSelectedTemplate(null); }} 
          onSuccess={loadTemplates}
          template={selectedTemplate}
          user={user}
        />,
        document.body
      )}

      {selectedTemplate && isGeneratorModalOpen && createPortal(
        <EmailGeneratorModal
          isOpen={isGeneratorModalOpen}
          onClose={() => { setIsGeneratorModalOpen(false); setSelectedTemplate(null); }}
          template={selectedTemplate}
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
              <h3 className="text-lg font-black text-slate-800 mb-2">Excluir Modelo?</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Tem certeza que deseja excluir este modelo de e-mail? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setTemplateToDelete(null)}
                className="flex-1 px-4 py-3 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmailCenter;
