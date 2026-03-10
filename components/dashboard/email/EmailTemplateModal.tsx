
import React, { useState, useEffect } from 'react';
import { EmailTemplate, User } from '../../../types';
import { db } from '../../../utils/storage';

interface EmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template?: EmailTemplate | null;
  user: User;
}

const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({ isOpen, onClose, onSuccess, template, user }) => {
  const [formData, setFormData] = useState<Partial<EmailTemplate>>({
    name: '',
    to: '',
    cc: '',
    subject: '',
    body: '',
    config: {
      headerColor: '#5b9bd5',
      headerOrientation: 'horizontal',
      alternateRowColor: true,
      columns: ['Motorista', 'Placa', 'Container', 'Status', 'Data/Hora'],
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif'
    }
  });

  const [newColumn, setNewColumn] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (template) {
      setFormData(template);
    } else {
      setFormData({
        name: '',
        to: '',
        cc: '',
        subject: '',
        body: '',
        config: {
          headerColor: '#5b9bd5',
          headerOrientation: 'horizontal',
          alternateRowColor: true,
          columns: ['Motorista', 'Placa', 'Container', 'Status', 'Data/Hora'],
          fontSize: '12px',
          fontFamily: 'Arial, sans-serif'
        }
      });
    }
  }, [template, isOpen]);

  const handleSave = async () => {
    if (!formData.name || !formData.subject) {
      alert('Nome e Assunto são obrigatórios.');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const finalTemplate: EmailTemplate = {
        id: template?.id || `email-tpl-${Date.now()}`,
        name: formData.name!,
        to: formData.to || '',
        cc: formData.cc || '',
        subject: formData.subject!,
        body: formData.body || '',
        config: formData.config!,
        createdAt: template?.createdAt || now,
        updatedAt: now
      };

      const success = await db.saveEmailTemplate(finalTemplate, user);
      if (success) {
        onSuccess();
        onClose();
      } else {
        alert('Erro ao salvar modelo.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro crítico ao salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const addColumn = () => {
    if (newColumn && !formData.config?.columns.includes(newColumn)) {
      setFormData({
        ...formData,
        config: {
          ...formData.config!,
          columns: [...formData.config!.columns, newColumn]
        }
      });
      setNewColumn('');
    }
  };

  const removeColumn = (col: string) => {
    setFormData({
      ...formData,
      config: {
        ...formData.config!,
        columns: formData.config!.columns.filter(c => c !== col)
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              {template ? 'Editar Modelo de E-mail' : 'Novo Modelo de E-mail'}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configuração de Template e Layout</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3.5"/></svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nome do Modelo</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none"
                  placeholder="EX: RELATÓRIO DIÁRIO VW"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Assunto</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 uppercase focus:border-blue-500 transition-all outline-none"
                  placeholder="ASSUNTO DO E-MAIL"
                  value={formData.subject}
                  onChange={e => setFormData({...formData, subject: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Para (E-mails)</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 transition-all outline-none"
                    placeholder="separados por vírgula"
                    value={formData.to}
                    onChange={e => setFormData({...formData, to: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">CC (Cópia)</label>
                  <input 
                    type="text" 
                    className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-bold text-slate-800 focus:border-blue-500 transition-all outline-none"
                    placeholder="separados por vírgula"
                    value={formData.cc}
                    onChange={e => setFormData({...formData, cc: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Corpo do E-mail (Texto Base)</label>
                <textarea 
                  rows={4}
                  className="w-full px-6 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-medium text-slate-800 focus:border-blue-500 transition-all outline-none resize-none"
                  placeholder="Olá equipe, segue relatório..."
                  value={formData.body}
                  onChange={e => setFormData({...formData, body: e.target.value})}
                />
                <div className="mt-3 p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Variáveis Inteligentes (Copie e Cole)</p>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{SAUDACAO}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Bom dia / Boa tarde / Boa noite</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{DATA_ATUAL}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Data de hoje (ex: 15/08/2023)</span>
                    </div>
                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-blue-50">
                      <code className="text-[10px] font-mono font-bold text-blue-700">{"{{HORA_ATUAL}}"}</code>
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Hora atual (ex: 14:30)</span>
                    </div>
                  </div>
                </div>
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-2 italic">* O sistema inserirá a tabela de dados automaticamente ao final.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 space-y-8">
              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-4">Personalização da Tabela</h4>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cor do Cabeçalho</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-12 h-12 rounded-xl border-none cursor-pointer"
                      value={formData.config?.headerColor}
                      onChange={e => setFormData({...formData, config: {...formData.config!, headerColor: e.target.value}})}
                    />
                    <span className="text-[10px] font-mono font-bold text-slate-600 uppercase">{formData.config?.headerColor}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Orientação</label>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => setFormData({...formData, config: {...formData.config!, headerOrientation: 'horizontal'}})}
                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${formData.config?.headerOrientation === 'horizontal' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Horizontal
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, config: {...formData.config!, headerOrientation: 'vertical'}})}
                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${formData.config?.headerOrientation === 'vertical' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Vertical
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200">
                <span className="text-[10px] font-black text-slate-600 uppercase">Cores Alternadas nas Linhas</span>
                <button 
                  onClick={() => setFormData({...formData, config: {...formData.config!, alternateRowColor: !formData.config?.alternateRowColor}})}
                  className={`w-12 h-6 rounded-full transition-all relative ${formData.config?.alternateRowColor ? 'bg-blue-600' : 'bg-slate-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.config?.alternateRowColor ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Colunas da Tabela</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-[10px] font-bold uppercase outline-none focus:border-blue-500"
                    placeholder="NOME DA COLUNA..."
                    value={newColumn}
                    onChange={e => setNewColumn(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && addColumn()}
                  />
                  <button 
                    onClick={addColumn}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-90"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3" strokeLinecap="round"/></svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.config?.columns.map(col => (
                    <div key={col} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm group">
                      <span className="text-[9px] font-black text-slate-600 uppercase">{col}</span>
                      <button onClick={() => removeColumn(col)} className="text-slate-300 hover:text-red-500 transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-4 bg-white text-slate-400 rounded-2xl text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-100 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-12 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default EmailTemplateModal;
