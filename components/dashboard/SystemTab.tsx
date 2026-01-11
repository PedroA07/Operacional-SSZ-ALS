
import React, { useState, useMemo } from 'react';
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
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optProgress, setOptProgress] = useState(0);
  const [optCurrent, setOptCurrent] = useState('');
  const [errorCount, setErrorCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showCorsHelp, setShowCorsHelp] = useState(false);

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

  const runImageOptimization = async () => {
    if (!confirm("Este processo irá comprimir imagens que ainda não foram otimizadas. Continuar?")) return;
    
    setIsOptimizing(true);
    setOptProgress(0);
    setErrorCount(0);
    setLastError(null);
    
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

      for (const s of allStaff) {
        if (s.photo && !s.photo.includes('_optimized') && s.photo.startsWith('http')) {
          setOptCurrent(`Processando Perfil: ${s.name}`);
          try {
            const compressed = await imageCompressor.compress(s.photo, { maxWidth: 400, quality: 0.7 });
            const newUrl = await fileStorage.uploadStaffPhoto(compressed, s.id);
            await db.saveStaff({ ...s, photo: newUrl + '?v=_optimized' });
          } catch (e: any) {
            setErrorCount(prev => prev + 1);
            setLastError(e.message);
          }
        }
        updateProgress();
      }

      for (const d of allDrivers) {
        if (d.photo && !d.photo.includes('_optimized') && d.photo.startsWith('http')) {
          setOptCurrent(`Processando Motorista: ${d.name}`);
          try {
            const compressed = await imageCompressor.compress(d.photo, { maxWidth: 400, quality: 0.7 });
            const newUrl = await fileStorage.uploadDriverProfile(compressed, d.id);
            await db.saveDriver({ ...d, photo: newUrl + '?v=_optimized' });
          } catch (e: any) {
            setErrorCount(prev => prev + 1);
            setLastError(e.message);
          }
        }
        updateProgress();
      }

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
              } catch (e: any) {
                newDocs.push(doc);
                setErrorCount(prev => prev + 1);
                setLastError(e.message);
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

      setOptCurrent('Análise concluída!');
      if (errorCount > 0) {
        alert(`Otimização finalizada com ${errorCount} erros.`);
      } else {
        alert("Otimização concluída com sucesso!");
      }
      await onRefresh();
    } catch (e) {
      alert("Erro crítico durante a otimização.");
    } finally {
      setIsOptimizing(false);
    }
  };

  // JSON SIMPLIFICADO QUE O CLOUDFLARE R2 ACEITA SEM ERROS DE VALIDAÇÃO
  const corsConfigJson = JSON.stringify([
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ], null, 2);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manutenção de Dados</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de nuvem e armazenamento</p>
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
        </div>
      </div>

      {isOptimizing && (
        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl space-y-6">
           <div className="flex justify-between items-end">
              <div>
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Atividade em Segundo Plano</p>
                 <h4 className="text-white font-black text-lg mt-1">{optCurrent}</h4>
              </div>
              <span className="text-2xl font-black text-white font-mono">{optProgress}%</span>
           </div>
           <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${optProgress}%` }}></div>
           </div>
           
           {(lastError || errorCount > 0) && (
             <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                   <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                   <p className="text-[11px] text-red-400 font-black uppercase">Falha na Leitura das Fotos</p>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
                  O Cloudflare R2 bloqueou a leitura. Como o editor deles é sensível, use o novo código abaixo.
                </p>
                <button 
                  onClick={() => setShowCorsHelp(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-red-500 transition-all"
                >
                  Ver Código Corrigido
                </button>
             </div>
           )}
        </div>
      )}

      {showCorsHelp && (
        <div className="bg-white p-10 rounded-[3rem] border-2 border-blue-500 shadow-2xl animate-in zoom-in-95 space-y-8">
           <div className="flex justify-between items-start">
              <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Correção de CORS: Cloudflare R2</h3>
                 <p className="text-xs text-slate-400 mt-1 uppercase font-bold">Este JSON remove o erro de validação do painel R2</p>
              </div>
              <button onClick={() => setShowCorsHelp(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
           </div>

           <div className="space-y-6">
              <div className="flex gap-4">
                 <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs shrink-0">1</div>
                 <p className="text-sm text-slate-600">No painel da Cloudflare, apague todo o conteúdo atual da <b>CORS Policy</b>.</p>
              </div>
              <div className="flex gap-4">
                 <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xs shrink-0">2</div>
                 <div className="flex-1 space-y-4">
                    <p className="text-sm text-slate-600">Cole este novo código (sem o método OPTIONS explícito, para evitar o bug do editor):</p>
                    <div className="relative">
                       <pre className="bg-slate-900 text-blue-400 p-6 rounded-2xl text-[10px] font-mono overflow-x-auto border border-white/10 shadow-inner">
                         {corsConfigJson}
                       </pre>
                       <button 
                         onClick={() => { navigator.clipboard.writeText(corsConfigJson); alert("Copiado!"); }}
                         className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all"
                       >
                         Copiar Código
                       </button>
                    </div>
                 </div>
              </div>
           </div>
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
          <div className="w-20 h-20 bg-white/10 text-blue-400 rounded-[2rem] flex items-center justify-center shadow-inner border border-white/5"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M10 14l2 2m0 0l2-2m-2 2V2m0 12l-4-4m4 4l4-4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
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
