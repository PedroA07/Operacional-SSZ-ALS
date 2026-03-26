
import React, { useState } from 'react';
import { db } from '../../utils/storage';
import FeedbackModal from '../shared/FeedbackModal';
import ContainerTypesManager from './admin/ContainerTypesManager';
import StatusManager from './admin/StatusManager';
import ColetaTiposViagemManager from './admin/ColetaTiposViagemManager';
import CategoryManager from './admin/CategoryManager';
import OperationTypesManager from './admin/OperationTypesManager';
import ExternalUsersManager from './third-party/ExternalUsersManager';

interface SystemTabProps {
  onRefresh: () => Promise<void>;
  driversCount: number;
  customersCount: number;
  portsCount: number;
}

const SystemTab: React.FC<SystemTabProps> = ({ onRefresh, driversCount, customersCount, portsCount }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showLocalOptGuide, setShowLocalOptGuide] = useState(false);
  const [feedback, setFeedback] = useState<{ show: boolean; title: string; message: string; type: any; onConfirm?: () => void }>({
    show: false, title: '', message: '', type: 'info'
  });

  const handleExport = async () => {
    setIsExporting(true);
    try { 
      await db.exportBackup(); 
      setFeedback({ show: true, title: "Exportação Concluída", message: "O arquivo de backup foi gerado com sucesso.", type: 'success' });
    } catch (e) { 
      setFeedback({ show: true, title: "Erro na Exportação", message: "Não foi possível gerar o arquivo de backup.", type: 'error' });
    } finally { 
      setIsExporting(false); 
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFeedback({ 
      show: true, 
      title: "Restaurar Banco de Dados", 
      message: "Isso irá sobrescrever os dados atuais da nuvem. Deseja prosseguir?", 
      type: 'confirm',
      onConfirm: async () => {
        setIsImporting(true);
        try {
          if (await db.importBackup(file)) { 
            setFeedback({ show: true, title: "Restauração Finalizada", message: "Todos os dados foram sincronizados com a nuvem.", type: 'success' });
            await onRefresh(); 
          } else {
            setFeedback({ show: true, title: "Falha na Importação", message: "O arquivo selecionado é inválido ou está corrompido.", type: 'error' });
          }
        } catch (e) { 
          setFeedback({ show: true, title: "Erro Crítico", message: "Ocorreu um erro inesperado durante a importação.", type: 'error' });
        } finally { 
          setIsImporting(false); 
        }
      }
    });
    e.target.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      <FeedbackModal 
        isOpen={feedback.show} 
        onClose={() => setFeedback({ ...feedback, show: false })}
        title={feedback.title}
        message={feedback.message}
        type={feedback.type}
        onConfirm={feedback.onConfirm}
      />

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manutenção de Dados</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Otimização realizada via Instância Local (Node.js)</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="px-5 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black uppercase">Otimização Local Ativa</span>
           </div>
           <button onClick={() => setShowLocalOptGuide(true)} className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">
                Ver Instruções
           </button>
        </div>
      </div>

      {showLocalOptGuide && (
        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white/5 space-y-8 animate-in zoom-in-95">
           <div className="flex justify-between items-start">
              <div>
                 <h3 className="text-xl font-black text-blue-400 uppercase tracking-tight">Guia de Manutenção</h3>
                 <p className="text-xs text-slate-400 mt-1 uppercase font-bold">Instância Local Configurada com Sucesso</p>
              </div>
              <button onClick={() => setShowLocalOptGuide(false)} className="text-slate-500 hover:text-white transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <p className="text-sm text-slate-300 leading-relaxed">Você confirmou que a otimização via instância local funcionou. Esse método é superior pois:</p>
                 <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-xs text-slate-400"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Contorna restrições de CORS do navegador</li>
                    <li className="flex items-center gap-3 text-xs text-slate-400"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Processa arquivos com maior velocidade</li>
                    <li className="flex items-center gap-3 text-xs text-slate-400"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Não depende de conexões instáveis do client-side</li>
                 </ul>
              </div>
              <div className="bg-black/40 p-6 rounded-2xl border border-white/5">
                 <p className="text-[10px] font-black text-blue-500 uppercase mb-4">Lembrete de Comando</p>
                 <code className="text-[11px] font-mono text-emerald-400 block bg-black p-4 rounded-xl break-all">
                   node optimize-v2.js
                 </code>
                 <p className="text-[8px] text-slate-600 mt-4 uppercase font-bold text-center italic">Rode mensalmente para limpar o armazenamento R2.</p>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Motoristas</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{driversCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Clientes</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{customersCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Portos</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{portsCount}</p>
        </div>
      </div>

      <ContainerTypesManager />

      <OperationTypesManager />

      <CategoryManager />

      <StatusManager />

      <ColetaTiposViagemManager />

      <ExternalUsersManager onRefresh={onRefresh} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></div>
          <button onClick={handleExport} disabled={isExporting} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl">Exportar Base (.JSON)</button>
        </div>
        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-white/10 text-blue-400 rounded-[2rem] flex items-center justify-center"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M10 14l2 2m0 0l2-2m-2 2V2m0 12l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
          <label className="w-full cursor-pointer">
            <div className="py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase text-center">Importar Arquivo</div>
            <input type="file" className="hidden" accept=".json" onChange={handleImport} disabled={isImporting} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default SystemTab;
