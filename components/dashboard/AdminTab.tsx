
import React, { useState, useEffect } from 'react';
import { Trip, User, Driver } from '../../types';
import { db } from '../../utils/storage';
import AdvanceSubTab from './admin/AdvanceSubTab';
import BalanceSubTab from './admin/BalanceSubTab';
import FreightContractsSubTab from './admin/FreightContractsSubTab';

interface AdminTabProps {
  user: User;
}

const AdminTab: React.FC<AdminTabProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'advance' | 'balance' | 'contracts'>('advance');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);

  const loadData = async () => {
    const [tripsData, driversData] = await Promise.all([db.getTrips(), db.getDrivers()]);
    setTrips(tripsData);
    setDrivers(driversData);
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdate = async (updated: Trip) => {
    await db.saveTrip(updated, user);
    loadData();
  };

  const handleUpdateDriver = async (updated: Driver) => {
    await db.saveDriver(updated, user);
    loadData();
  };

  const stats = {
    pendingAdvances: trips.filter(t => {
      const isNotPaid = t.advancePayment?.status !== 'PAGO' && t.advancePayment?.status !== 'LIBERAR';
      const isRelevant = ['Retirada de vazio', 'Retirada do cheio', 'Em viagem', 'Viagem concluída'].includes(t.status) || t.isCompleted;
      return isNotPaid && isRelevant;
    }).length,
    pendingBalances: trips.filter(t => {
       const isNotPaid = t.balancePayment?.status !== 'PAGO' && t.balancePayment?.status !== 'LIBERAR';
       const isFinished = t.isCompleted || t.status === 'Viagem concluída';
       return isNotPaid && isFinished;
    }).length,
    pendingContracts: trips.filter(t => (t.isCompleted || t.status === 'Viagem concluída') && (t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO') && !t.freightContractDoc).length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Painel Administrativo</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setActiveSubTab('advance')}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'advance' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                Adiantamentos (70%)
              </button>
              <button 
                onClick={() => setActiveSubTab('balance')}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'balance' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                Saldos Finais (30%)
              </button>
              <button
                onClick={() => setActiveSubTab('contracts')}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'contracts' ? 'bg-blue-600 text-white shadow-xl' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
              >
                Contratos de Frete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
               <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Fila Adiantamento</p>
               <p className="text-3xl font-black text-blue-700">{stats.pendingAdvances}</p>
            </div>
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center">
               <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fila Saldo (CONCLUÍDAS)</p>
               <p className="text-3xl font-black text-indigo-700">{stats.pendingBalances}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 text-center">
               <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">Contratos Pend.</p>
               <p className="text-3xl font-black text-emerald-700">{stats.pendingContracts}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm min-h-[400px]">
        {activeSubTab === 'advance' && (
          <AdvanceSubTab userId={user.id} trips={trips} onUpdate={handleUpdate} />
        )}
        {activeSubTab === 'balance' && (
          <BalanceSubTab userId={user.id} trips={trips} onUpdate={handleUpdate} />
        )}
        {activeSubTab === 'contracts' && (
          <FreightContractsSubTab userId={user.id} trips={trips} onUpdate={handleUpdate} drivers={drivers} onUpdateDriver={handleUpdateDriver} />
        )}
      </div>
    </div>
  );
};

export default AdminTab;
