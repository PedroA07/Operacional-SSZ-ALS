
import React, { useState } from 'react';
import { db } from '../../utils/storage';
import FeedbackModal from '../shared/FeedbackModal';

interface SystemTabProps {
  onRefresh: () => Promise<void>;
  driversCount: number;
  customersCount: number;
  portsCount: number;
}

const SystemTab: React.FC<SystemTabProps> = ({ onRefresh, driversCount, customersCount, portsCount }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  const [feedback, setFeedback] = useState<{ show: boolean; title: string; message: string; type: any; onConfirm?: () => void }>({
    show: false, title: '', message: '', type: 'info'
  });

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncMessage('Iniciando varredura de cache local...');
    try {
      const count = await db.pushLocalDataToCloud((msg) => setSyncMessage(msg));
      setFeedback({
        show: true,
        title: "Sincronização Finalizada",
        message: `${count} registros foram verificados e enviados com sucesso para a nuvem ALS.`,
        type: 'success'
      });
      await onRefresh();
    } catch (e: any) {
      setFeedback({
        show: true,
        title: "Falha na Sincronização",
        message: e.message || "Ocorreu um erro ao tentar empurrar os dados locais.",
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  const handlePurge = () => {
    setFeedback({
      show: true,
      title: "Limpar Cache do Sistema?",
      message: "Isso removerá dados temporários do seu navegador e forçará o portal a ler 100% dos dados diretamente do Banco de Dados ALS. Útil se você vir dados que não existem no Supabase.",
      type: 'confirm',
      onConfirm: () => db.purgeLocalCache()
    });
  };

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
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Integridade de Dados</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronização Direta com Cloud ALS</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={handlePurge}
             className="px-6 py-4 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-amber-600 transition-all active:scale-95"
           >
              Limpar Cache do Site
           </button>
           <button onClick={onRefresh} className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">
                Forçar Refresh DB
           </button>
        </div>
      </div>

      {/* NOVO CARD: SINCRONIZAÇÃO DE CONTINGÊNCIA */}
      <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <svg className="w-24 h-24 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
         </div>
         <div className="relative z-10">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Sincronização de Contingência</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-xl">
              Use esta ferramenta se você criou registros que aparecem no site, mas não constam no banco de dados Supabase. 
              O sistema irá varrer sua memória local e forçar o envio para a nuvem.
            </p>
            
            {isSyncing ? (
              <div className="mt-8 space-y-4">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{syncMessage}</span>
                 </div>
                 <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[loading_2s_infinite]"></div>
                 </div>
              </div>
            ) : (
              <button 
                onClick={handleForceSync}
                className="mt-8 px-10 py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-2xl hover:bg-blue-500 transition-all active:scale-95 flex items-center gap-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Empurrar Dados Locais para Nuvem
              </button>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Motoristas no Cache</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{driversCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Clientes no Cache</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{customersCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Portos no Cache</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{portsCount}</p>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
         <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-b pb-4">Ferramentas de Backup JSON</h3>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col items-center text-center space-y-6 p-6 bg-slate-50 rounded-3xl">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-[1.5rem] flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-slate-700">Exportar Tudo</p>
                 <p className="text-[9px] text-slate-400 uppercase">Gera um arquivo .JSON com toda a base do banco</p>
              </div>
              <button onClick={handleExport} disabled={isExporting} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">Baixar Backup</button>
            </div>
            
            <div className="flex flex-col items-center text-center space-y-6 p-6 bg-slate-50 rounded-3xl">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-[1.5rem] flex items-center justify-center"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M10 14l2 2m0 0l2-2m-2 2V2m0 12l-4-4m4 4l4-4" /></svg></div>
              <div className="space-y-1">
                 <p className="text-[10px] font-black uppercase text-slate-700">Importar Dados</p>
                 <p className="text-[9px] text-slate-400 uppercase">Envia um backup local para a nuvem ALS</p>
              </div>
              <label className="w-full cursor-pointer">
                <div className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase text-center shadow-lg">Selecionar Arquivo</div>
                <input type="file" className="hidden" accept=".json" onChange={handleImport} disabled={isImporting} />
              </label>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SystemTab;
