
import React, { useState, useEffect } from 'react';
import SILLoginView from './SILLoginView';
import SILPortalView from './SILPortalView';
import { silStorage } from '../../../utils/silStorage';

const SILBrowserSimulator: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState('https://sil.opentechgr.com.br/Login');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = silStorage.getSession();
    if (saved && saved.isActive) {
      setSession(saved);
      setCurrentPath('https://sil.opentechgr.com.br/Programacao/ProgramacaoDetalhada');
    }
    setTimeout(() => setIsLoaded(true), 800);
  }, []);

  const handleLogin = (u: string, p: string) => {
    silStorage.saveSession(u, p);
    setSession({ username: u, isActive: true });
    setCurrentPath('https://sil.opentechgr.com.br/Programacao/ProgramacaoDetalhada');
  };

  const handleLogout = () => {
    silStorage.clearSession();
    setSession(null);
    setCurrentPath('https://sil.opentechgr.com.br/Login');
  };

  return (
    <div className="w-full h-[calc(100vh-200px)] flex flex-col bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      {/* Barra de Navegador */}
      <div className="h-14 bg-slate-800/80 border-b border-white/5 flex items-center px-6 gap-6 shrink-0">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5"/></svg>
          </button>
          <button className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2.5"/></svg>
          </button>
        </div>

        <div className="flex-1 max-w-2xl bg-slate-950/50 rounded-xl px-4 py-1.5 border border-white/5 flex items-center gap-3">
          <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
          <span className="text-[10px] font-mono text-slate-400 truncate">{currentPath}</span>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {session && (
            <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-emerald-500 uppercase">Sessão SIL Ativa</span>
            </div>
          )}
          <button onClick={() => window.location.reload()} className="p-2 text-slate-500 hover:text-white transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="2.5"/></svg>
          </button>
        </div>
      </div>

      {/* Conteúdo do "Browser" */}
      <div className="flex-1 bg-white overflow-hidden relative">
        {!isLoaded ? (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center space-y-4">
             <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Acessando servidores Opentech...</p>
          </div>
        ) : !session ? (
          <SILLoginView onLogin={handleLogin} />
        ) : (
          <SILPortalView user={session.username} onLogout={handleLogout} />
        )}
      </div>
    </div>
  );
};

export default SILBrowserSimulator;
