
import React, { useState } from 'react';

interface SILInternalSiteProps {
  user: string;
  onLogout: () => void;
}

const SILInternalSite: React.FC<SILInternalSiteProps> = ({ user, onLogout }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mockTrips = [
    { sm: '998412', cliente: 'VOLKSWAGEN', motorista: 'ADRIANO PEREIRA', placa: 'ABC-1D23', status: 'Em Viagem', risco: 'Baixo' },
    { sm: '998413', cliente: 'DIAGEO', motorista: 'MARCOS SOUZA', placa: 'FGT-9X11', status: 'Alerta Risco', risco: 'Alto' },
    { sm: '998414', cliente: 'OWENS', motorista: 'JULIO CESAR', placa: 'KLY-2J88', status: 'Iniciada', risco: 'Baixo' },
    { sm: '998415', cliente: 'VOLKSWAGEN', motorista: 'RICARDO OLIVEIRA', placa: 'BHT-4E55', status: 'Concluída', risco: 'Baixo' }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f4f7fa] text-slate-800 animate-in fade-in duration-500">
      {/* SIL Internal Header */}
      <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#001e50] text-white rounded-xl flex items-center justify-center font-black italic text-xs">SIL</div>
             <div>
                <h1 className="text-sm font-black text-slate-800 uppercase leading-none">Programação Detalhada</h1>
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1">Módulo Operacional v8.4</p>
             </div>
          </div>
          
          <nav className="hidden md:flex items-center gap-1">
            <button className="px-4 py-2 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase border border-slate-200">Visão Geral</button>
            <button className="px-4 py-2 bg-blue-600 rounded-lg text-[9px] font-black text-white uppercase shadow-md">Lista de SMs</button>
            <button className="px-4 py-2 hover:bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 uppercase">Alertas</button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
             <p className="text-[9px] font-black text-slate-400 uppercase">Operador</p>
             <p className="text-[10px] font-black text-slate-800 uppercase">{user}</p>
          </div>
          <button onClick={onLogout} className="px-4 py-2 bg-red-50 text-red-500 rounded-lg text-[9px] font-black uppercase border border-red-100 hover:bg-red-500 hover:text-white transition-all">Encerrar Portal</button>
        </div>
      </header>

      {/* Main Grid View */}
      <main className="flex-1 overflow-y-auto p-10 space-y-8">
        {/* Filter Bar */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-end gap-4">
           <div className="flex-1 grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Número SM</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold uppercase" placeholder="000000" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Placa</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold uppercase" placeholder="ABC1234" />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Status</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold uppercase">
                  <option>Todos os Status</option>
                  <option>Em Viagem</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Cliente</label>
                <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-bold uppercase" placeholder="Nome do Cliente" />
              </div>
           </div>
           <button onClick={handleRefresh} className="px-8 py-2.5 bg-[#001e50] text-white rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2">
             {isRefreshing ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Filtrar'}
           </button>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-8 py-5">Risco</th>
                <th className="px-8 py-5">SM / Solicitação</th>
                <th className="px-8 py-5">Cliente / Operação</th>
                <th className="px-8 py-5">Motorista</th>
                <th className="px-8 py-5">Placa</th>
                <th className="px-8 py-5">Status Viagem</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockTrips.map((t, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-8 py-4">
                    <div className={`w-3 h-3 rounded-full ${t.risco === 'Alto' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-emerald-500'}`}></div>
                  </td>
                  <td className="px-8 py-4 text-[11px] font-black text-[#001e50]">{t.sm}</td>
                  <td className="px-8 py-4 text-[10px] font-bold uppercase text-slate-500">{t.cliente}</td>
                  <td className="px-8 py-4 text-[10px] font-bold uppercase text-slate-700">{t.motorista}</td>
                  <td className="px-8 py-4 text-[11px] font-mono font-black text-blue-600">{t.placa}</td>
                  <td className="px-8 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border ${t.status === 'Alerta Risco' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <button className="text-[9px] font-black text-slate-300 hover:text-blue-600 uppercase tracking-tighter">Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
            <p className="text-[9px] font-black text-slate-400 uppercase">Mostrando 4 de 1.250 registros</p>
            <div className="flex gap-2">
               <button className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400">1</button>
               <button className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400">2</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SILInternalSite;
