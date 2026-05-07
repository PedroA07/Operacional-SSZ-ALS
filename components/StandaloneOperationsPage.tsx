
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Driver, Customer, Port, PreStacking, Trip, Category, OperationDefinition } from '../types';
import OperationsTab from './dashboard/OperationsTab';
import SimpleToast from './shared/SimpleToast';
import NotificationToast from './dashboard/notifications/NotificationToast';
import { db } from '../utils/storage';

interface StandaloneOperationsPageProps {
  user: User;
}

const StandaloneOperationsPage: React.FC<StandaloneOperationsPageProps> = ({ user }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState('');

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const [drv, cust, port, ps, trp, cats] = await Promise.allSettled([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
        db.getTrips(),
        db.getCategories(),
      ]);
      if (drv.status === 'fulfilled') setDrivers(drv.value);
      if (cust.status === 'fulfilled') setCustomers(cust.value);
      if (port.status === 'fulfilled') setPorts(port.value);
      if (ps.status === 'fulfilled') setPreStacking(ps.value);
      if (trp.status === 'fulfilled') setTrips(trp.value);
      if (cats.status === 'fulfilled') setCategories(cats.value);
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

  const availableOps = useMemo<OperationDefinition[]>(() => {
    return categories
      .filter(cat => !cat.parentId)
      .map(cat => ({
        id: cat.id,
        category: cat.name,
        color: cat.color,
        clients: customers
          .filter(c => c.operations?.some(op => op.toUpperCase() === cat.name.toUpperCase()))
          .map(c => ({ name: c.name, hasDedicatedPage: true })),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [categories, customers]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">
      <NotificationToast />
      <SimpleToast />

      {/* Header fixo no topo */}
      <div className="sticky top-0 z-50 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm">
            <img src="/logo.jpg" alt="ALS" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-black text-slate-800 text-sm uppercase tracking-tight leading-none">Painel Operacional</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Tela Cheia • {trips.length} registros • Atualizado {lastSync}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-xl text-[9px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          <button
            onClick={() => window.close()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase hover:bg-red-600 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Fechar Guia
          </button>
        </div>
      </div>

      {/* Painel operacional — scroll natural da página */}
      <div className="p-8">
        <OperationsTab
          user={user}
          availableOps={availableOps}
          drivers={drivers}
          customers={customers}
          ports={ports}
          trips={trips}
          categories={categories}
          preStacking={preStacking}
          activeView={{ type: 'list' }}
          setActiveView={() => {}}
          noMaxHeight
          onDeleteTrip={async (id) => {
            await db.deleteTrip(id, user);
            await loadData(false);
          }}
          onRefresh={() => loadData(false)}
        />
      </div>
    </div>
  );
};

export default StandaloneOperationsPage;
