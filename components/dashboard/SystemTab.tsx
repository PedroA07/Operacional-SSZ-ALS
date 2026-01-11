
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

  // Estados para Modais Customizados
  const [modal, setModal] = useState<{ show: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void }>({
    show: false, title: '', message: '', type: 'alert'
  });

  const showAlert = (title: string, message: string) => setModal({ show: true, title, message, type: 'alert' });
  const showConfirm = (title: string, message: string, onConfirm: () => void) => 
    setModal({ show: true, title, message, type: 'confirm', onConfirm });

  const handleExport = async () => {
    setIsExporting(true);
    try { await db.exportBackup(); } catch (e) { showAlert("Erro", "Falha ao exportar backup."); } finally { setIsExporting(false); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    showConfirm("Restaurar Backup", "Isso irá sobrescrever os dados atuais. Deseja prosseguir?", async () => {
      setIsImporting(true);
      try {
        if (await db.importBackup(file)) { 
          showAlert("Sucesso", "Dados importados com sucesso!"); 
          await onRefresh(); 
        } else {
          showAlert("Erro", "Falha na importação do arquivo.");
        }
      } catch (e) { showAlert("Erro", "Erro crítico no processamento."); } finally { setIsImporting(false); }
    });
    e.target.value = '';
  };

  const runImageOptimization = async () => {
    showConfirm("Otimizar Armazenamento", "Deseja comprimir todas as fotos pendentes na nuvem?", async () => {
      setIsOptimizing(true);
      setOptProgress(0);
      setErrorCount(0);
      setLastError(null);
      
      try {
        setOptCurrent('Iniciando análise...');
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

        // Processamento (Staff, Motoristas, Viagens...)
        for (const s of allStaff) {
          if (s.photo && !s.photo.includes('_optimized') && s.photo.startsWith('http')) {
            setOptCurrent(`Comprimindo: ${s.name}`);
            try {
              const compressed = await imageCompressor.compress(s.photo, { maxWidth: 400, quality: 0.7 });
              const newUrl = await fileStorage.uploadStaffPhoto(compressed, s.id);
              await db.saveStaff({ ...s, photo: newUrl + '?v=_optimized' });
            } catch (e: any) { setErrorCount(prev => prev + 1); setLastError(e.message); }
          }
          updateProgress();
        }

        for (const d of allDrivers) {
          if (d.photo && !d.photo.includes('_optimized') && d.photo.startsWith('http')) {
            setOptCurrent(`Comprimindo: ${d.name}`);
            try {
              const compressed = await imageCompressor.compress(d.photo, { maxWidth: 400, quality: 0.7 });
              const newUrl = await fileStorage.uploadDriverProfile(compressed, d.id);
              await db.saveDriver({ ...d, photo: newUrl + '?v=_optimized' });
            } catch (e: any) { setErrorCount(prev => prev + 1); setLastError(e.message); }
          }
          updateProgress();
        }

        for (const t of allTrips) {
          if (t.driver_docs && t.driver_docs.length > 0) {
            let tripChanged = false;
            const newDocs = [];
            for (const doc of t.driver_docs) {
              if (doc.url && !doc.url.includes('_optimized') && doc.url.startsWith('http')) {
                setOptCurrent(`Otimizando Docs OS ${t.os}...`);
                try {
                  const compressed = await imageCompressor.compress(doc.url, { maxWidth: 1600, quality: 0.75 });
                  const newUrl = await fileStorage.uploadTripPhoto(compressed, t.os, doc.id);
                  newDocs.push({ ...doc, url: newUrl + '?v=_optimized' });
                  tripChanged = true;
                } catch (e: any) { newDocs.push(doc); setErrorCount(prev => prev + 1); setLastError(e.message); }
              } else { newDocs.push(doc); }
              updateProgress();
            }
            if (tripChanged) await db.saveTrip({ ...t, driver_docs: newDocs });
          }
        }

        setOptCurrent('Processo concluído.');
        if (errorCount === 0) showAlert("Sucesso", "Todas as imagens foram otimizadas.");
        await onRefresh();
      } catch (e) {
        showAlert("Erro", "Falha crítica na otimização.");
      } finally {
        setIsOptimizing(false);
      }
    });
  };

  // JSON ULTRA CLEAN (Sem espaços para não bugar o editor da Cloudflare)
  const corsConfigJson = '[{"AllowedOrigins":["*"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]';

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* MODAL DE INTERFACE CUSTOMIZADA (Substitui Alertas) */}
      {modal.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95">
              <div className="p-10 text-center space-y-6">
                 <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${modal.type === 'confirm' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{modal.title}</h3>
                    <p className="text-sm text-slate-500 mt-2 leading-relaxed">{modal.message}</p>
                 </div>
                 <div className={`grid ${modal.type === 'confirm' ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
                    <button onClick={() => setModal({ ...modal, show: false })} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Fechar</button>
                    {modal.type === 'confirm' && (
                      <button onClick={() => { modal.onConfirm?.(); setModal({ ...modal, show: false }); }} className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Confirmar</button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Manutenção de Dados</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de nuvem e armazenamento</p>
        </div>
        <button onClick={runImageOptimization} disabled={isOptimizing} className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-3">
             <svg className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
             Otimizar Storage
        </button>
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
                <p className="text-[10px] text-slate-400 leading-relaxed font-bold">Falha no Cloudflare R2: <span className="text-white">"{lastError}"</span></p>
                <button onClick={() => setShowCorsHelp(true)} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg">Ver Solução Nativa</button>
             </div>
           )}
        </div>
      )}

      {showCorsHelp && (
        <div className="bg-white p-10 rounded-[3rem] border-2 border-blue-500 shadow-2xl space-y-8 animate-in zoom-in-95">
           <div className="flex justify-between items-start">
              <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ajuste de CORS Nativo</h3><p className="text-xs text-slate-400 mt-1 font-bold">Este JSON resolve 100% dos erros de acesso</p></div>
              <button onClick={() => setShowCorsHelp(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg></button>
           </div>
           <div className="space-y-6">
              <p className="text-sm text-slate-600">No Cloudflare, vá em <b>R2</b> &rarr; seu Bucket &rarr; <b>Settings</b> &rarr; <b>CORS Policy</b>. Apague tudo e cole:</p>
              <div className="relative">
                 <pre className="bg-slate-900 text-blue-400 p-6 rounded-2xl text-[11px] font-mono break-all whitespace-pre-wrap">
                   {corsConfigJson}
                 </pre>
                 <button onClick={() => { navigator.clipboard.writeText(corsConfigJson); showAlert("Copiado", "O JSON ultra clean foi copiado."); }} className="absolute top-4 right-4 bg-white/10 text-white px-3 py-1 rounded-lg text-[8px] font-black uppercase">Copiar</button>
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
