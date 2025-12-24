
import React, { useState, useEffect, useRef } from 'react';
import { silStorage } from '../../../../utils/silStorage';

const SILBrowserFrame: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [url, setUrl] = useState('https://sil.opentechgr.com.br/Login.aspx');
  const [loading, setLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const saved = silStorage.getSession();
    if (saved) setSession(saved);
    
    // Timer para remover o splash de carregamento
    const timer = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = url;
    }
    setTimeout(() => setLoading(false), 1500);
  };

  const handleExternalOpen = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-[calc(100vh-180px)] bg-slate-950 rounded-[3.5rem] border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-700 relative">
      
      {/* ALS BROWSER CHROME (CABEÇALHO) */}
      <div className="h-16 bg-[#001e50] border-b border-white/5 flex items-center px-8 gap-6 shrink-0 z-30">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
        </div>

        <div className="flex-1 max-w-2xl flex items-center gap-2">
          <button onClick={handleRefresh} className="p-2 text-white/40 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          
          <div className="flex-1 bg-black/40 rounded-2xl px-5 py-2 border border-white/5 flex items-center gap-3">
            <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
            <span className="text-[10px] font-mono text-slate-400 select-none truncate">sil.opentechgr.com.br/Login.aspx</span>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-black text-blue-400 uppercase tracking-widest">Acesso Rápido</span>
            <span className="text-[9px] font-bold text-white uppercase">operacional_ssz</span>
          </div>
          <div className="h-8 w-[1px] bg-white/10"></div>
          <button 
            onClick={handleExternalOpen}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            Janela Externa
          </button>
        </div>
      </div>

      {/* CONTEÚDO: SITE REAL DO SIL */}
      <div className="flex-1 bg-white relative">
        {loading && (
          <div className="absolute inset-0 bg-[#020617] flex flex-col items-center justify-center space-y-6 z-50">
             <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
             <div className="text-center">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] animate-pulse">Conectando ao WebService Opentech</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase mt-2 italic">Aguardando resposta do servidor sil.opentechgr.com.br...</p>
             </div>
          </div>
        )}

        {/* MENSAGEM DE AJUDA OPERACIONAL (Overlay) */}
        <div className="absolute bottom-6 right-6 z-40 max-w-xs animate-in slide-in-from-right-8 duration-1000 delay-500">
           <div className="bg-[#001e50]/90 backdrop-blur-md p-5 rounded-3xl border border-blue-400/30 shadow-2xl">
              <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Credenciais Mantidas</p>
              <div className="space-y-1">
                 <div className="flex justify-between text-[10px]">
                   <span className="text-slate-400">Login:</span>
                   <span className="text-white font-mono font-bold">operacional_ssz</span>
                 </div>
                 <div className="flex justify-between text-[10px]">
                   <span className="text-slate-400">Senha:</span>
                   <span className="text-white font-mono font-bold">Operacional_SSZ</span>
                 </div>
              </div>
              <p className="text-[8px] text-slate-500 mt-3 leading-tight italic">
                * Caso o site não carregue abaixo, use o botão "Janela Externa" devido às restrições de segurança da Opentech.
              </p>
           </div>
        </div>

        <iframe 
          ref={iframeRef}
          src={url} 
          className="w-full h-full border-none"
          title="SIL Opentech"
          onLoad={() => setLoading(false)}
          onError={() => setIframeError(true)}
          sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        />
        
        {iframeError && (
          <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <h3 className="text-lg font-black text-slate-800 uppercase">Bloqueio de Conexão</h3>
             <p className="text-sm text-slate-500 mt-2 max-w-md">Por questões de segurança, o portal SIL pode restringir o acesso dentro de quadros (iframes). Utilize o botão de Janela Externa para prosseguir.</p>
             <button onClick={handleExternalOpen} className="mt-8 px-8 py-4 bg-[#001e50] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95">Abrir em Nova Aba</button>
          </div>
        )}
      </div>

      {/* FOOTER DO BROWSER */}
      <div className="h-10 bg-slate-900 border-t border-white/5 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Conexão Criptografada SSL</span>
           </div>
        </div>
        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">ALS TRANSPORTES - VIRTUAL TERMINAL MODULE</p>
      </div>
    </div>
  );
};

export default SILBrowserFrame;
