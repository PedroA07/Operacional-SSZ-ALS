import React, { useState, useEffect, useCallback } from 'react';
import { User, Trip } from '../../../types';
import { db } from '../../../utils/storage';
import ExternalPortal from './ExternalPortal';

interface ExternalUserAppProps {
  user: User;
  onLogout: () => void;
}

const ExternalUserApp: React.FC<ExternalUserAppProps> = ({ user, onLogout }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const allTrips = await db.getTrips();
      setTrips(allTrips);
    } catch (error) {
      console.error("Erro ao carregar viagens para usuário externo:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-6">Carregando Portal...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#f8fafc] flex flex-col font-sans text-slate-900 h-screen overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-10 shadow-sm z-40 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-inner overflow-hidden">
            <img src="/logo.jpg" alt="ALS" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-none">
              ALS Transportes
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Portal do Cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-xs font-black text-slate-800 uppercase">{user.displayName}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase">{user.username}</p>
          </div>
          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Sair"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <ExternalPortal user={user} trips={trips} />
        </div>
      </main>
    </div>
  );
};

export default ExternalUserApp;
