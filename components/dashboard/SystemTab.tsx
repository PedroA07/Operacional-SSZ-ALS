
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

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const [optCurrent, setOptCurrent] = useState('');
  const [errorCount, setErrorCount] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    try { await db.exportBackup(); } catch (e) { alert("Erro ao exportar."); } finally { setIsExporting(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Isso irá sobrescrever os dados locais. Deseja continuar?")) { e.target.value = ''; return; }
    setIsImporting(true);
    try {
      if (await db.importBackup(file)) { alert("Dados importados!"); await onRefresh(); }
      else alert("Falha na importação.");
    } catch (e) { alert("Erro crítico."); } finally { setIsImporting(false); e.target.value = ''; }
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try { await onRefresh(); setSyncStatus('success'); setTimeout(() => setSyncStatus('idle'), 3000); }
    catch (e) { setSyncStatus('error'); setTimeout(() => setSyncStatus('idle'), 5000); }
  };

  const runImageOptimization = async () => {
    if (!confirm("Este processo irá comprimir imagens que ainda não foram otimizadas. Continuar?")) return;
    
    setIsOptimizing(true);
    setOptProgress(0);
    setErrorCount(0);
    
    try {
      setOptCurrent('Mapeando base de dados...');
      const [allDrivers, allStaff, allTrips] = await Promise.all([
        db.getAllDriversMaintenance(),
        db.getStaff(),
        db.getAllTripsMaintenance()
      ]);

      const totalItems = allDrivers.length + allStaff.length + allTrips.reduce((acc, t) => acc + (t.driver_docs?.length || 0), 0);
      let processedCount = 0;

      const updateProgress = () => {
        processedCount++;
        setOptProgress(Math.round((processedCount / totalItems) * 100));
      };

      // 1. Otimizar Staff
      for (const s of allStaff) {
        if (s.photo && !s.photo.includes('_optimized') && s.photo.startsWith('http')) {
          setOptCurrent(`Processando Perfil: ${s.name}`);
          try {
            const compressed = await imageCompressor.compress(s.photo, { maxWidth: 400, quality: 0.7 });
            const newUrl = await fileStorage.uploadStaffPhoto(compressed, s.id);
            await db.saveStaff({ ...s, photo: newUrl + '?v=_optimized' });
          } catch (e) {
            console.warn(`Falha no staff ${s.name}:`, e);
            setErrorCount(prev => prev + 1);
          }
        }
        updateProgress();
      }

      // 2. Otimizar Motoristas
      for (const d of allDrivers) {
        if (d.photo && !d.photo.includes('_optimized') && d.photo.startsWith('http')) {
          setOptCurrent(`Processando Motorista: ${d.name}`);
          try {
            const compressed = await imageCompressor.compress(d.photo, { maxWidth: 400, quality: 0.7 });
            const newUrl = await fileStorage.uploadDriverProfile(compressed, d.id);
            await db.saveDriver({ ...d, photo: newUrl + '?v=_optimized' });
          } catch (e) {
            console.warn(`Falha no motorista ${d.name}:`, e);
            setErrorCount(prev => prev + 1);
          }
        }
        updateProgress();
      }

      // 3. Otimizar Viagens (Fotos de Campo)
      for (const t of allTrips) {
        if (t.driver_docs && t.driver_docs.length > 0) {
          let tripChanged = false;
          const newDocs = [];
          
          for (const doc of t.driver_docs) {
            if (doc.url && !doc.url.includes('_optimized') && doc.url.startsWith('http')) {
              setOptCurrent(`Otimizando Anexo OS ${t.os}...`);
              try {
                const compressed = await imageCompressor.compress(doc.url, { maxWidth: 1600, quality: 0.75 });
                const newUrl = await fileStorage.uploadTripPhoto(compressed, t.os, doc.id);
                newDocs.push({ ...doc, url: newUrl + '?v=_optimized' });
                tripChanged = true;
              } catch (e) {
                console.warn(`Falha na OS ${t.os}:`, e);
                newDocs.push(doc);
                setErrorCount(prev => prev + 1);
              }
            } else {
              newDocs.push(doc);
            }
            updateProgress();
          }

          if (tripChanged) {
            await db.saveTrip({ ...t, driver_docs: newDocs });
          }
        }
      }

      setOptCurrent('Otimização concluída!');
      alert(`Processo finalizado. Itens analisados: ${totalItems}. Falhas: ${errorCount}.`);
      await onRefresh();
    } catch (e) {
      console.error(e);
      alert("Erro durante a otimização.");
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
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gerencie backups e otimização de imagens</p>
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
          <button onClick={handleManualSync} disabled={syncStatus === 'syncing'} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl flex items-center gap-3 ${syncStatus === 'syncing' ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <svg className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Sincronizar
          </button>
        </div>
      </div>

      {isOptimizing && (
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 space-y-6">
           <div className="flex justify-between items-end">
              <div>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Processamento em Lote Ativo</p>
                 <h4 className="text-white font-black text-lg mt-1">{optCurrent}</h4>
                 {errorCount > 0 && <p className="text-[9px] text-red-400 font-bold uppercase mt-2">Falhas de Carregamento (CORS): {errorCount}</p>}
              </div>
              <span className="text-2xl font-black text-white font-mono">{optProgress}%</span>
           </div>
           <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${optProgress}%` }}></div>
           </div>
           <p className="text-[8px] text-slate-500 uppercase text-center font-bold">Não feche o navegador. O sistema está baixando cada imagem do Cloudflare para reduzir o tamanho.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motoristas</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{driversCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clientes</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{customersCount}</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-2">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Portos</p>
          <p className="text-4xl font-black text-slate-800 font-mono">{portsCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center shadow-inner"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></div>
          <div><h3 className="text-lg font-black text-slate-800 uppercase">Exportar Backup</h3><p className="text-xs text-slate-400 mt-2">Gera arquivo JSON da base atual.</p></div>
          <button onClick={handleExport} disabled={isExporting} className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl">Exportar Base (.JSON)</button>
        </div>

        <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center space-y-6 relative overflow-hidden">
          <div className="w-20 h-20 bg-white/10 text-blue-400 rounded-[2rem] flex items-center justify-center shadow-inner border border-white/5"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg></div>
          <div><h3 className="text-lg font-black text-white uppercase">Restaurar Dados</h3><p className="text-xs text-slate-400 mt-2">Carrega backup para a nuvem.</p></div>
          <label className="w-full cursor-pointer">
            <div className={`py-5 border-2 border-dashed rounded-2xl text-[11px] font-black uppercase transition-all flex items-center justify-center ${isImporting ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-blue-600 text-white border-blue-400'}`}>Selecionar Arquivo</div>
            <input type="file" className="hidden" accept=".json" onChange={handleImport} disabled={isImporting} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default SystemTab;
