
import React, { useState, useEffect } from 'react';
import { Trip, User } from '../../types';
import { db } from '../../utils/storage';
import AdvanceSubTab from './admin/AdvanceSubTab';
import BalanceSubTab from './admin/BalanceSubTab';

interface AdminTabProps {
  user: User;
}

const AdminTab: React.FC<AdminTabProps> = ({ user }) => {
  const [activeSubTab, setActiveSubTab] = useState<'advance' | 'balance'>('advance');
  const [trips, setTrips] = useState<Trip[]>([]);

  const loadData = async () => {
    const data = await db.getTrips();
    setTrips(data);
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdate = async (updated: Trip) => {
    await db.saveTrip(updated);
    loadData();
  };

  const stats = {
    pendingAdvances: trips.filter(t => t.advancePayment?.status !== 'PAGO' && t.advancePayment?.status !== 'LIBERAR').length,
    pendingBalances: trips.filter(t => t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO').filter(t => t.balancePayment?.status !== 'PAGO' && t.balancePayment?.status !== 'LIBERAR').length,
    blockedBalances: trips.filter(t => (t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO') && !t.documents?.some(d => d.type === 'COMPLETO')).length
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Painel Administrativo</h2>
            <div className="flex gap-4">
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
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center">
               <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Fila Adiantamento</p>
               <p className="text-3xl font-black text-blue-700">{stats.pendingAdvances}</p>
            </div>
            <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 text-center">
               <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Fila Saldo</p>
               <p className="text-3xl font-black text-indigo-700">{stats.pendingBalances}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 text-center">
               <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-1">Docs Pendentes</p>
               <p className="text-3xl font-black text-red-700">{stats.blockedBalances}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm min-h-[400px]">
        {activeSubTab === 'advance' ? (
          <AdvanceSubTab userId={user.id} trips={trips} onUpdate={handleUpdate} />
        ) : (
          // Só mostra na aba de saldos viagens que já liberaram o adiantamento
          <BalanceSubTab userId={user.id} trips={trips.filter(t => t.advancePayment?.status === 'LIBERAR' || t.advancePayment?.status === 'PAGO')} onUpdate={handleUpdate} />
        )}
      </div>
    </div>
  );
};

export default AdminTab;
