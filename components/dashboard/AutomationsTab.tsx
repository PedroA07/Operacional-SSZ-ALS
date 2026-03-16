import React, { useState, useEffect } from 'react';
import { db } from '../../utils/storage';
import { Automation, EmailTemplate, TripStatus, CustomStatus } from '../../types';
import { Plus, Trash2, Mail, MessageSquare, ToggleLeft, ToggleRight, Save, X, AlertCircle } from 'lucide-react';

const AutomationsTab: React.FC = () => {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentAutomation, setCurrentAutomation] = useState<Partial<Automation>>({
    status: '',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [autoData, tempData, statusData] = await Promise.all([
        db.getAutomations(),
        db.getEmailTemplates(),
        db.getCustomStatuses()
      ]);
      setAutomations(autoData);
      setTemplates(tempData);
      setCustomStatuses(statusData);
    } catch (error) {
      console.error('Erro ao carregar dados de automação:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentAutomation.status) {
      alert('Por favor, selecione um status de gatilho.');
      return;
    }

    const result = await db.saveAutomation(currentAutomation);
    if (result.success) {
      setIsEditing(false);
      setCurrentAutomation({ status: '', isActive: true });
      loadData();
    } else {
      alert('Erro ao salvar automação: ' + result.error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta automação?')) {
      const success = await db.deleteAutomation(id);
      if (success) loadData();
    }
  };

  const toggleActive = async (automation: Automation) => {
    const updated = { ...automation, isActive: !automation.isActive };
    await db.saveAutomation(updated);
    loadData();
  };

  // Lista de status padrão + customizados
  const allStatuses = [
    'Pendente', 'Retirada de vazio', 'Retirada do cheio', 'Em viagem', 
    'Chegou no cliente', 'Pegou NF', 'Saiu do cliente', 'Chegou no destino', 
    'Devolução do cheio', 'Viagem concluída', 'Viagem cancelada',
    ...customStatuses.map(s => s.name)
  ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicatas

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Automações de Fluxo</h2>
          <p className="text-slate-400 text-sm">Configure disparos automáticos de e-mail e WhatsApp baseados no status da viagem.</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => {
              setCurrentAutomation({ status: '', isActive: true });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-blue-900/20"
          >
            <Plus size={18} />
            Nova Automação
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">
              {currentAutomation.id ? 'Editar Automação' : 'Configurar Nova Automação'}
            </h3>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Status de Gatilho (Trigger)
                </label>
                <select
                  value={currentAutomation.status}
                  onChange={(e) => setCurrentAutomation({ ...currentAutomation, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">Selecione um status...</option>
                  {allStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1.5">A automação será disparada sempre que uma viagem mudar para este status.</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                <AlertCircle size={16} className="text-blue-400 shrink-0" />
                <p className="text-xs text-blue-300/80 leading-relaxed">
                  As variáveis <code className="bg-blue-500/20 px-1 rounded">{"{{os}}"}</code>, <code className="bg-blue-500/20 px-1 rounded">{"{{motorista}}"}</code>, <code className="bg-blue-500/20 px-1 rounded">{"{{container}}"}</code> e outras serão substituídas automaticamente nos templates.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Modelo de E-mail (Opcional)
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
                  <select
                    value={currentAutomation.emailTemplateId || ''}
                    onChange={(e) => setCurrentAutomation({ ...currentAutomation, emailTemplateId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="">Nenhum e-mail</option>
                    {templates.map(template => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  ID do Grupo WhatsApp (Opcional)
                </label>
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={currentAutomation.whatsappGroupId || ''}
                    onChange={(e) => setCurrentAutomation({ ...currentAutomation, whatsappGroupId: e.target.value })}
                    placeholder="ex: 123456789@g.us"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">ID do grupo de motoristas na Evolution API.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg transition-all font-bold shadow-lg shadow-blue-900/20"
            >
              <Save size={18} />
              Salvar Automação
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {automations.length === 0 ? (
          <div className="bg-slate-900/30 border border-dashed border-slate-800 rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <ToggleLeft size={32} className="text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-300">Nenhuma automação configurada</h3>
            <p className="text-slate-500 text-sm mt-2">Clique em "Nova Automação" para começar a automatizar seus fluxos.</p>
          </div>
        ) : (
          automations.map(automation => (
            <div
              key={automation.id}
              className={`group bg-slate-900/40 border ${automation.isActive ? 'border-slate-800' : 'border-slate-800/50 opacity-60'} rounded-xl p-5 hover:border-blue-500/30 transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Gatilho</span>
                    <span className="text-white font-bold text-lg">{automation.status}</span>
                  </div>

                  <div className="h-10 w-px bg-slate-800 mx-2" />

                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${automation.emailTemplateId ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800/50 text-slate-600'}`}>
                      <Mail size={16} />
                      <span className="text-xs font-semibold">
                        {automation.emailTemplateId 
                          ? templates.find(t => t.id === automation.emailTemplateId)?.name || 'Template Removido'
                          : 'Sem E-mail'}
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${automation.whatsappGroupId ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/50 text-slate-600'}`}>
                      <MessageSquare size={16} />
                      <span className="text-xs font-semibold">
                        {automation.whatsappGroupId ? `Grupo: ${automation.whatsappGroupId.split('@')[0]}` : 'Sem WhatsApp'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleActive(automation)}
                    className={`p-2 rounded-lg transition-all ${automation.isActive ? 'text-blue-400 hover:bg-blue-400/10' : 'text-slate-600 hover:bg-slate-600/10'}`}
                    title={automation.isActive ? 'Desativar' : 'Ativar'}
                  >
                    {automation.isActive ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  
                  <button
                    onClick={() => {
                      setCurrentAutomation(automation);
                      setIsEditing(true);
                    }}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                    title="Editar"
                  >
                    <Save size={18} />
                  </button>

                  <button
                    onClick={() => handleDelete(automation.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AutomationsTab;
