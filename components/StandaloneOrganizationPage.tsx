import React, { useState, useEffect, useCallback } from 'react';
import { User, Driver, Customer, Port, PreStacking, Trip } from '../types';
import OrganizationTab from './dashboard/OrganizationTab';
import SimpleToast from './shared/SimpleToast';
import NotificationToast from './dashboard/notifications/NotificationToast';
import { db } from '../utils/storage';

interface StandaloneOrganizationPageProps {
  user: User;
}

/** Página autônoma (nova guia) da Organização em tela cheia. */
const StandaloneOrganizationPage: React.FC<StandaloneOrganizationPageProps> = ({ user }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState('');

  useEffect(() => {
    document.body.classList.add('scrollable');
    return () => document.body.classList.remove('scrollable');
  }, []);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [drv, cust, port, ps, trp] = await Promise.allSettled([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
        db.getTrips(),
      ]);
      if (drv.status === 'fulfilled') setDrivers(drv.value);
      if (cust.status === 'fulfilled') setCustomers(cust.value);
      if (port.status === 'fulfilled') setPorts(port.value);
      if (ps.status === 'fulfilled') setPreStacking(ps.value);
      if (trp.status === 'fulfilled') setTrips(trp.value);
      setLastSync(new Date().toLocaleTimeString('pt-BR'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(true);
    // Atualização automática a cada 30s
    const interval = setInterval(() => loadData(false), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando organização...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      <NotificationToast />
      <SimpleToast />

      {/* Controles flutuantes discretos — a guia é dedicada à tabela em tela cheia */}
      <div className="fixed top-3 right-3 z-[60] flex items-center gap-2">
        <span className="hidden md:inline text-[8px] font-bold text-slate-400 uppercase tracking-widest mr-1">
          {trips.length} registros • {lastSync}
        </span>
        <button
          onClick={() => loadData(false)}
          title="Atualizar"
          className="w-9 h-9 flex items-center justify-center bg-white/90 border border-slate-200 text-slate-500 rounded-xl shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all backdrop-blur"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          onClick={() => window.close()}
          title="Fechar guia"
          className="w-9 h-9 flex items-center justify-center bg-slate-900 text-white rounded-xl shadow-sm hover:bg-red-600 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabela da Organização em tela cheia */}
      <div className="p-3">
        <OrganizationTab
          userId={user.id}
          trips={trips}
          ports={ports}
          preStacking={preStacking}
          drivers={drivers}
          customers={customers}
          onRefresh={() => loadData(false)}
          standalone
        />
      </div>
    </div>
  );
};

export default StandaloneOrganizationPage;
