
import React, { useState, useEffect } from 'react';
import { db } from '../../utils/storage';

const DatabaseStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    const status = await db.checkConnection();
    setIsOnline(status);
    setIsChecking(false);
  };

  useEffect(() => {
    checkStatus();
    // Re-checa a cada 60 segundos
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isOnline === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 animate-pulse">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
        <span className="text-[8px] font-black uppercase text-slate-400">Verificando...</span>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 cursor-help group relative ${
        isOnline 
        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/10' 
        : 'bg-amber-50 border-amber-100 text-amber-600 shadow-sm shadow-amber-500/10'
      }`}
      title={isOnline ? "Conectado ao Supabase Cloud" : "Operando em modo Local (Offline)"}
    >
      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
      <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
        BD: {isOnline ? 'Nuvem' : 'Local'}
      </span>
      
      {isChecking && (
        <svg className="w-2.5 h-2.5 animate-spin text-current opacity-40" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}

      {/* Tooltip Hover */}
      <div className="absolute top-full right-0 mt-2 w-48 p-3 bg-slate-900 text-white text-[7px] font-bold uppercase rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl z-50">
        {isOnline 
          ? "Dados sincronizados em tempo real com o servidor oficial ALS." 
          : "Servidor indisponível. Seus dados estão sendo guardados no navegador e serão enviados quando a conexão voltar."}
      </div>
    </div>
  );
};

export default DatabaseStatus;
