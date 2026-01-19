
import React from 'react';
import { Trip, Driver } from '../../types';
import TripsYesterday from './overview/TripsYesterday';
import TripsToday from './overview/TripsToday';
import TripsTomorrow from './overview/TripsTomorrow';
import TripsThisWeek from './overview/TripsThisWeek';
import TripsThisMonth from './overview/TripsThisMonth';
import DelayedTrips from './overview/DelayedTrips';
import DriverStatusCards from './overview/DriverStatusCards';

interface OverviewTabProps {
  trips: Trip[];
  drivers: Driver[];
  onRefresh: () => Promise<void>;
  lastSyncTime: string;
  isSyncing: boolean;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trips, drivers, onRefresh, lastSyncTime, isSyncing }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO DE MONITORAMENTO */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-blue-600/10 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
           </div>
           <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">Painel de Performance ALS</h2>
              <div className="flex items-center gap-2 mt-1.5">
                 <div className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`}></div>
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                    {isSyncing ? 'Atualizando dados...' : `Última sincronização: ${lastSyncTime}`}
                 </p>
              </div>
           </div>
        </div>
        
        <button 
          onClick={() => onRefresh()}
          disabled={isSyncing}
          className="px-6 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
        >
           <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
           </svg>
           Sincronizar Agora
        </button>
      </div>

      {/* GRID DE KPIs SUPERIOR - BLOCOS PRINCIPAIS */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 transition-opacity duration-300 ${isSyncing ? 'opacity-70' : 'opacity-100'}`}>
        <TripsYesterday trips={trips} />
        <TripsToday trips={trips} />
        <TripsTomorrow trips={trips} />
        <TripsThisWeek trips={trips} />
        <TripsThisMonth trips={trips} />
      </div>

      {/* MONITOR DE ATRASOS E STATUS DOS MOTORISTAS */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity duration-300 ${isSyncing ? 'opacity-70' : 'opacity-100'}`}>
         <div className="lg:col-span-1">
            <DelayedTrips trips={trips} />
         </div>
         <div className="lg:col-span-2">
            <DriverStatusCards trips={trips} drivers={drivers} />
         </div>
      </div>
    </div>
  );
};

export default OverviewTab;
