
import React, { useState } from 'react';
import { db } from '../../utils/storage';
import { imageCompressor } from '../../utils/imageCompressor';
import { fileStorage } from '../../utils/fileStorage';

interface SystemTabProps {
  onRefresh: () => Promise<void>;
  driversCount: number;
  customersCount: number;
  portsCount: number;
}

const SystemTab: React.FC<SystemTabProps> = ({ onRefresh, driversCount, customersCount, portsCount }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Estados do Otimizador
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const [optTotal, setOptTotal] = useState(0);
  const [optCurrent, setOptCurrent] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await db.exportBackup();
    } catch (e) {
      alert("Erro ao exportar backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Isso irá sobrescrever os dados locais com as informações do arquivo. Deseja continuar?")) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const success = await db.importBackup(file);
      if (success) {
        alert("Dados importados com sucesso!");
        await onRefresh();
      } else {
        alert("Falha na importação. Verifique o formato do arquivo.");
      }
    } catch (e) {
      alert("Ocorreu um erro crítico na importação.");
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      await onRefresh();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  // FUNÇÃO MESTRE: Otimizar todas as imagens do banco
  const runImageOptimization = async () => {
    if (!confirm("Este processo irá comprimir todas as fotos de perfil e docs de campo que ainda não foram otimizados. Isso pode demorar alguns minutos. Continuar?")) return;
    
    setIsOptimizing(true);
    setOptProgress(0);
    
    try {
      // 1. Carregar todos os dados relevantes
      setOptCurrent('Mapeando base de dados...');
      const [allDrivers, allStaff, allTrips] = await Promise.all([
        db.getAllDriversMaintenance(),
        db.getStaff(),
        db.getAllTripsMaintenance()
      ]);

      const totalItems = allDrivers.length + allStaff.length + allTrips.reduce((acc, t) => acc + (t.driver_docs?.length || 0), 0);
      setOptTotal(totalItems);
      let processedCount = 0;

      // 2. Otimizar Staff (Fotos de Perfil)
      for (const s of allStaff) {
        if (s.photo && !s.photo.includes('_optimized')) {
          setOptCurrent(`Comprimindo perfil: ${s.name}`);
          const compressed = await imageCompressor.compress(s.photo, { maxWidth: 400, quality: 0.7 });
          const newUrl = await fileStorage.uploadStaffPhoto(compressed, s.id);
          await db.saveStaff({ ...s, photo: newUrl });
        }
        processedCount++;
        setOptProgress(Math.round((processedCount / totalItems) * 100));
      }

      // 3. Otimizar Drivers (Fotos de Perfil)
      for (const d of allDrivers) {
        if (d.photo && !d.photo.includes('_optimized')) {
          setOptCurrent(`Comprimindo perfil motorista: ${d.name}`);
          const compressed = await imageCompressor.compress(d.photo, { maxWidth: 400, quality: 0.7 });
          const newUrl = await fileStorage.uploadDriverProfile(compressed, d.id);
          await db.saveDriver({ ...d, photo: newUrl });
        }
        processedCount++;
        setOptProgress(Math.round((processedCount / totalItems) * 100));
      }

      // 4. Otimizar Viagens (Fotos de Campo)
      for (const t of allTrips) {
        if (t.driver_docs && t.driver_docs.length > 0) {
          let tripChanged = false;
          const newDocs = [];
          
          for (const doc of t.driver_docs) {
            if (doc.url && !doc.url.includes('_optimized')) {
              setOptCurrent(`Otimizando anexo OS ${t.os}...`);
              const compressed = await imageCompressor.compress(doc.url, { maxWidth: 1600, quality: 0.75 });
              const newUrl = await fileStorage.uploadTripPhoto(compressed, t.os, doc.id);
              newDocs.push({ ...doc, url: newUrl });
              tripChanged = true;
            } else {
              newDocs.push(doc);
            }
            processedCount++;
            setOptProgress(Math.round((processedCount / totalItems) * 100));
          }

          if (tripChanged) {
            await db.saveTrip({ ...t, driver_docs: newDocs });
          }
        }
      }

      setOptCurrent('Otimização concluída!');
      alert(`Sucesso! ${totalItems} imagens foram analisadas e otimizadas.`);
      await onRefresh();
    } catch (e) {
      console.error(e);
      alert("Erro durante a otimização em lote.");
    } finally {
      setIsOptimizing(false);
      setOptProgress(0);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manutenção de Dados</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gerencie backups, restaurações e sincronização em nuvem</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={runImageOptimization}
            disabled={isOptimizing}
            className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 hover:bg-emerald-700 disabled:opacity-50"
          >
             <svg className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
             Otimizar Storage
          </button>
          <button 
            onClick={handleManualSync}
            disabled={syncStatus === 'syncing'}
            className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-3 ${
              syncStatus === 'syncing' ? 'bg-slate-100 text-slate-400' : 
              syncStatus === 'success' ? 'bg-blue-500 text-white' : 
              'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <svg className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'success' ? 'Sincronizado!' : 'Forçar Sincronização'}
          </button>
        </div>
      </div>

      {isOptimizing && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 space-y-6">
           <div className="flex justify-between items-end">
              <div>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Processamento em Lote Ativo</p>
                 <h4 className="text-white font-black text-lg mt-1">{optCurrent}</h4>
              </div>
              <span className="text-2xl font-black text-white font-mono">{optProgress}%</span>
           </div>
           <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${optProgress}%` }}></div>
           </div>
           <p className="text-[8px] text-slate-500 uppercase text-center font-bold">Não feche o navegador até a conclusão do processo para evitar corrupção de dados.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motoristas Registrados</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{driversCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clientes na Base</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{customersCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Portos / Terminais</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{portsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EXPORTAR */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center shadow-inner">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gerar Backup do Sistema</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">Cria um arquivo seguro contendo todos os cadastros atuais para arquivamento ou migração.</p>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-3"
          >
            {isExporting ? 'Processando...' : 'Exportar Base Completa (.JSON)'}
          </button>
        </div>

        {/* IMPORTAR */}
        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
          </div>
          <div className="w-20 h-20 bg-white/10 text-blue-400 rounded-[2rem] flex items-center justify-center shadow-inner border border-white/5">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Restaurar Dados</h3>
            <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">Selecione um arquivo de backup (.JSON) para atualizar sua base de dados instantaneamente.</p>
          </div>
          
          <label className="w-full cursor-pointer">
            <div className={`py-5 border-2 border-dashed rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 ${isImporting ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-blue-600 text-white border-blue-400 hover:bg-blue-700'}`}>
              {isImporting ? 'Importando...' : 'Selecionar Arquivo'}
            </div>
            <input type="file" className="hidden" accept=".json" onChange={handleImport} disabled={isImporting} />
          </label>
        </div>
      </div>

      <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 flex-shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <div>
          <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Atenção Crítica</p>
          <p className="text-xs text-amber-700/80 mt-1 font-bold">A importação de dados substitui todos os registros locais. Certifique-se de ter um backup recente antes de proceder com atualizações manuais de grande escala.</p>
        </div>
      </div>
    </div>
  );
};

export default SystemTab;
