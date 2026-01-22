
import React, { useState } from 'react';
import { Trip, Driver, User } from '../../types';
import TripsYesterday from './overview/TripsYesterday';
import TripsToday from './overview/TripsToday';
import TripsTomorrow from './overview/TripsTomorrow';
import TripsThisWeek from './overview/TripsThisWeek';
import TripsThisMonth from './overview/TripsThisMonth';
import TripsThisYear from './overview/TripsThisYear';
import DelayedTrips from './overview/DelayedTrips';
import DriverStatusCards from './overview/DriverStatusCards';
import RecentActivitiesCard from './overview/RecentActivitiesCard';
import KpiVisualizer from './overview/KpiVisualizer';

interface OverviewTabProps {
  trips: Trip[];
  drivers: Driver[];
  onRefresh: () => Promise<void>;
  lastSyncTime: string;
  isSyncing: boolean;
  user: User;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trips, drivers, onRefresh, lastSyncTime, isSyncing, user }) => {
  const [viewMode, setViewMode] = useState<'CARDS' | 'ANALYTICS'>(() => {
    return (localStorage.getItem('als_overview_mode') as 'CARDS' | 'ANALYTICS') || 'CARDS';
  });

  const handleViewChange = (mode: 'CARDS' | 'ANALYTICS') => {
    setViewMode(mode);
    localStorage.setItem('als_overview_mode', mode);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO DE MONITORAMENTO COM TOGGLE DE VISÃO */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <div className="w-14 h-14 bg-blue-600/10 text-blue-600 rounded-[1.8rem] flex items-center justify-center shadow-inner shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
           </div>
           <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Painel de Performance ALS</h2>
              <div className="flex items-center gap-2 mt-2">
                 <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`}></div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    {isSyncing ? 'Sincronizando nuvem...' : `Última atualização: ${lastSyncTime}`}
                 </p>
              </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 shadow-inner border border-slate-200">
              <button 
                onClick={() => handleViewChange('CARDS')}
                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'CARDS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                Visão Cards
              </button>
              <button 
                onClick={() => handleViewChange('ANALYTICS')}
                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'ANALYTICS' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                Visão Analytics
              </button>
           </div>
           
           <button 
             onClick={() => onRefresh()}
             disabled={isSyncing}
             className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
           >
              <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sincronizar
           </button>
        </div>
      </div>

      {viewMode === 'CARDS' ? (
        <>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 relative ${isSyncing ? 'opacity-70' : 'opacity-100'}`} style={{ zIndex: 100 }}>
            <TripsYesterday trips={trips} />
            <TripsToday trips={trips} />
            <TripsTomorrow trips={trips} />
            <TripsThisWeek trips={trips} />
            <TripsThisMonth trips={trips} />
            <TripsThisYear trips={trips} />
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 transition-opacity duration-300 ${isSyncing ? 'opacity-70' : 'opacity-100'}`}>
             <div className="lg:col-span-8">
                <DriverStatusCards trips={trips} drivers={drivers} />
             </div>
             <div className="lg:col-span-4 space-y-8">
                <DelayedTrips trips={trips} />
                <RecentActivitiesCard user={user} />
             </div>
          </div>
        </>
      ) : (
        <KpiVisualizer trips={trips} drivers={drivers} />
      )}
    </div>
  );
};

export default OverviewTab;
