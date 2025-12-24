
import React, { useState } from 'react';
import { OpentechTrip, Driver, Customer } from '../../../types';
import { maskPlate, maskCPF } from '../../../utils/masks';
import OpentechConnector from './OpentechConnector';

interface SILMonitoringViewProps {
  trips: OpentechTrip[];
  drivers: Driver[];
  customers: Customer[];
  onAddTrip: (trip: Partial<OpentechTrip>) => void;
}

const SILMonitoringView: React.FC<SILMonitoringViewProps> = ({ trips: initialTrips, drivers, customers, onAddTrip }) => {
  const [trips, setTrips] = useState<OpentechTrip[]>(initialTrips);
  const [isConnectorOpen, setIsConnectorOpen] = useState(false);
  const [filters, setFilters] = useState({
    sm: '',
    placa: '',
    cpf: '',
    status: '',
    cliente: ''
  });

  const stats = {
    total: trips.length,
    emViagem: trips.filter(t => t.status === 'Em Viagem').length,
    alertas: trips.filter(t => t.status === 'Alerta' || t.status === 'Sinistrada').length,
    concluidas: trips.filter(t => t.status === 'Concluída').length
  };

  const filteredTrips = trips.filter(t => {
    return (
      (filters.sm === '' || t.smNumber.includes(filters.sm)) &&
      (filters.placa === '' || t.plateHorse.toLowerCase().includes(filters.placa.toLowerCase())) &&
      (filters.cpf === '' || t.driverCpf.includes(filters.cpf)) &&
      (filters.status === '' || t.status === filters.status) &&
      (filters.cliente === '' || t.clientName.toLowerCase().includes(filters.cliente.toLowerCase()))
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Viagem': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Concluída': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Alerta': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Sinistrada': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <OpentechConnector 
        isOpen={isConnectorOpen} 
        onClose={() => setIsConnectorOpen(false)} 
        onSuccess={(newData) => setTrips([...newData, ...trips])}
      />

      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
           <h2 className="text-lg font-black text-[#001e50] uppercase tracking-tight flex items-center gap-3">
             <div className="w-8 h-8 bg-[#001e50] text-white rounded-lg flex items-center justify-center text-xs italic shadow-lg">SIL</div>
             Monitoramento Integrado Opentech
           </h2>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Conexão direta com o Módulo de Programação Detalhada</p>
        </div>
        <button 
          onClick={() => setIsConnectorOpen(true)}
          className="px-6 py-4 bg-[#001e50] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-xl flex items-center gap-3 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Sincronizar Dados Reais
        </button>
      </div>

      {/* KPI Header SIL Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
          <p className="text-[9px] font-black text-slate-400 uppercase">Total Geral</p>
          <p className="text-2xl font-black text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center border-l-4 border-l-blue-500">
          <p className="text-[9px] font-black text-blue-500 uppercase">Em Viagem</p>
          <p className="text-2xl font-black text-blue-600">{stats.emViagem}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center border-l-4 border-l-red-500">
          <p className="text-[9px] font-black text-red-500 uppercase">Alertas / Sinistros</p>
          <p className="text-2xl font-black text-red-600">{stats.alertas}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center border-l-4 border-l-emerald-500">
          <p className="text-[9px] font-black text-emerald-500 uppercase">Concluídas</p>
          <p className="text-2xl font-black text-emerald-600">{stats.concluidas}</p>
        </div>
      </div>

      {/* Filters Form SIL Style */}
      <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Nº SM / Viagem</label>
            <input 
              type="text" 
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all"
              placeholder="000000"
              value={filters.sm}
              onChange={e => setFilters({...filters, sm: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Placa Veículo</label>
            <input 
              type="text" 
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all"
              placeholder="ABC-1234"
              value={filters.placa}
              onChange={e => setFilters({...filters, placa: maskPlate(e.target.value)})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">CPF Motorista</label>
            <input 
              type="text" 
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all"
              placeholder="000.000.000-00"
              value={filters.cpf}
              onChange={e => setFilters({...filters, cpf: maskCPF(e.target.value)})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Status</label>
            <select 
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all"
              value={filters.status}
              onChange={e => setFilters({...filters, status: e.target.value})}
            >
              <option value="">Todos</option>
              <option value="Em Viagem">Em Viagem</option>
              <option value="Concluída">Concluída</option>
              <option value="Alerta">Alerta</option>
              <option value="Sinistrada">Sinistrada</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase hover:bg-blue-700 transition-all shadow-md">
              Filtrar Resultados
            </button>
          </div>
        </div>
      </div>

      {/* Main Table SIL Style */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead className="bg-[#001e50] text-white font-bold uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-4 w-12 text-center">Risco</th>
                <th className="px-4 py-4">SM / Operação</th>
                <th className="px-4 py-4">Transportador / Placa</th>
                <th className="px-4 py-4">Motorista / CPF</th>
                <th className="px-4 py-4">Origem / Destino</th>
                <th className="px-4 py-4">Início / ETA</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrips.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors align-middle">
                  <td className="px-4 py-3 text-center">
                    <div className={`w-3 h-3 rounded-full mx-auto ${
                      t.riskLevel === 'Crítico' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                      t.riskLevel === 'Alto' ? 'bg-orange-500' :
                      t.riskLevel === 'Médio' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}></div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-800">{t.smNumber}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase truncate max-w-[120px]">{t.clientName}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-black text-blue-600 font-mono text-[11px]">{t.plateHorse}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">ALS TRANSPORTES</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-700 uppercase leading-none">{t.driverName}</p>
                    <p className="text-[9px] text-slate-400 mt-1">{t.driverCpf}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-500 font-bold truncate max-w-[150px]"><span className="text-slate-300">O:</span> {t.origin}</p>
                    <p className="text-slate-800 font-black truncate max-w-[150px]"><span className="text-slate-300">D:</span> {t.destination}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-slate-400">INÍ: <span className="text-slate-600 font-bold">{new Date(t.startTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span></span>
                      <span className="text-blue-500 font-black">ETA: <span>{new Date(t.eta).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span></span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase border ${getStatusColor(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button className="p-1.5 text-slate-300 hover:text-blue-600 transition-all" title="Ver no Mapa">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <button className="p-1.5 text-slate-300 hover:text-slate-900 transition-all" title="Detalhes da SM">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTrips.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-slate-300 font-bold uppercase italic border-2 border-dashed border-slate-50">
                    Nenhuma Solicitação de Monitoramento (SM) encontrada com os filtros aplicados. Clique em "Sincronizar Dados Reais" para importar do SIL.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SILMonitoringView;
