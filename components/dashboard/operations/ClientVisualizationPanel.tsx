
import React from 'react';
import { Customer } from '../../../types';

interface ClientVisualizationPanelProps {
  customers: Customer[];
  selectedClient: string;
  onClientChange: (name: string) => void;
  viewMode: 'compact' | 'comfortable';
  onViewModeChange: (mode: 'compact' | 'comfortable') => void;
  showOnlyAlerts: boolean;
  onToggleAlerts: () => void;
}

const ClientVisualizationPanel: React.FC<ClientVisualizationPanelProps> = ({
  customers,
  selectedClient,
  onClientChange,
  viewMode,
  onViewModeChange,
  showOnlyAlerts,
  onToggleAlerts
}) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-6 animate-in slide-in-from-top-4 duration-500">
      <div className="space-y-1.5 flex-1 min-w-[240px]">
        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Cliente Específico</label>
        <select 
          className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all cursor-pointer"
          value={selectedClient}
          onChange={(e) => onClientChange(e.target.value)}
        >
          <option value="TODOS">TODOS OS CLIENTES DA CATEGORIA</option>
          {customers.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-4">
        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Densidade</label>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => onViewModeChange('compact')}
              className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${viewMode === 'compact' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              Compacto
            </button>
            <button 
              onClick={() => onViewModeChange('comfortable')}
              className={`px-4 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${viewMode === 'comfortable' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              Amplo
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtro Rápido</label>
          <button 
            onClick={onToggleAlerts}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 transition-all text-[9px] font-black uppercase ${showOnlyAlerts ? 'border-red-500 bg-red-50 text-red-600 shadow-lg' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${showOnlyAlerts ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
            Atrasos / Alertas
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientVisualizationPanel;
