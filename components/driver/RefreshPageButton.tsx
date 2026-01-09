
import React, { useState } from 'react';

const RefreshPageButton: React.FC = () => {
  const [isReloading, setIsReloading] = useState(false);

  const handlePageRefresh = () => {
    setIsReloading(true);
    // Pequeno delay apenas para feedback visual antes do reload total
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <button 
      onClick={handlePageRefresh} 
      disabled={isReloading}
      className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl text-slate-400 active:scale-90 active:bg-blue-600 active:text-white transition-all border border-white/5 shadow-lg group"
      title="Atualizar Página"
    >
      <svg 
        className={`w-4 h-4 ${isReloading ? 'animate-spin text-white' : 'group-hover:rotate-180 transition-transform duration-500'}`} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="3" 
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
        />
      </svg>
      <span className="text-[8px] font-black uppercase tracking-widest">Sincronizar APP</span>
    </button>
  );
};

export default RefreshPageButton;
