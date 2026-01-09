
import React, { useState, useEffect } from 'react';
import { db } from '../../utils/storage';

const DatabaseStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);
    const status = await db.checkConnection();
    setIsOnline(status);
    setIsChecking(false);
  };

  useEffect(() => {
    checkStatus();
    // Re-checa a cada 90 segundos automaticamente
    const interval = setInterval(checkStatus, 90000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
        <span className="text-[8px] font-black uppercase text-slate-400">Handshake...</span>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 relative group ${
        isOnline 
        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/10' 
        : 'bg-amber-50 border-amber-200 text-amber-600 shadow-lg shadow-amber-500/20 ring-2 ring-amber-500/10'
      }`}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-bounce'}`}></div>
      <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
        SISTEMA: {isOnline ? 'CONECTADO' : 'MODO OFFLINE'}
      </span>
      
      {!isOnline && (
        <button 
          onClick={checkStatus}
          disabled={isChecking}
          className="ml-1 p-1 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-all active:scale-90 disabled:opacity-50"
          title="Tentar reconectar agora"
        >
          <svg className={`w-2.5 h-2.5 ${isChecking ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Tooltip Hover Diagnóstico */}
      <div className="absolute top-full right-0 mt-3 w-60 p-4 bg-slate-900 text-white rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all shadow-2xl z-[200] border border-white/10 scale-95 group-hover:scale-100 origin-top-right">
        <p className="text-[9px] font-black uppercase text-blue-400 mb-2">Diagnóstico de Rede</p>
        {isOnline ? (
          <div className="space-y-2">
             <p className="text-[10px] leading-relaxed font-medium">Conexão ativa com <span className="text-emerald-400">ALS Cloud Services</span>. Sincronização de dados operacionais garantida em tempo real.</p>
             <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                <div className="w-1 h-1 bg-emerald-500 rounded-full"></div>
                <span className="text-[7px] text-slate-500 uppercase">Ping Estável</span>
             </div>
          </div>
        ) : (
          <div className="space-y-3">
             <p className="text-[10px] leading-relaxed font-bold text-amber-200 uppercase">Atenção: Servidor não respondeu (522/Timeout).</p>
             <p className="text-[9px] text-slate-400 leading-snug">Seu navegador está bloqueado ou o projeto Supabase está pausado. Seus registros ficarão salvos localmente até a conexão ser restabelecida.</p>
             <div className="pt-2 border-t border-white/10 text-[7px] text-slate-500 uppercase italic">
                Verifique Firewall ou VPN ativa.
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseStatus;
