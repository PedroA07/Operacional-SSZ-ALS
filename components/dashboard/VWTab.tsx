
import React, { useState, useRef, useMemo } from 'react';
import { Trip, Driver, TripStatus, User } from '../../types';
import { statusService } from '../../utils/statusService';
import { db } from '../../utils/storage';

interface VWTabProps {
  trips: Trip[];
  drivers: Driver[];
  user: User;
  onRefresh: () => void;
}

const VWTab: React.FC<VWTabProps> = ({ trips, drivers, user, onRefresh }) => {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tempStatus, setTempStatus] = useState<TripStatus>('Pendente');
  const [statusTime, setStatusTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtrar apenas viagens que pertencem à operação Volkswagen
  const vwTrips = useMemo(() => {
    return trips.filter(t => statusService.isVWOperation(t));
  }, [trips]);

  const handleOpenStatus = (t: Trip) => {
    setSelectedTrip(t);
    setTempStatus(t.status);
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setStatusTime(new Date(Date.now() - tzOffset).toISOString().slice(0, 16));
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = async () => {
    if (!selectedTrip || isSaving) return;
    setIsSaving(true);

    try {
      const eventTime = new Date(statusTime).toISOString();
      const now = new Date().toISOString();

      // Monta o novo histórico (Novo evento no topo)
      const newEntry = {
        status: tempStatus,
        dateTime: eventTime,
        createdAt: now
      };

      const updatedTrip: Trip = {
        ...selectedTrip,
        status: tempStatus,
        statusTime: eventTime,
        statusHistory: [newEntry, ...(selectedTrip.statusHistory || [])]
      };

      // Salva na tabela 'trips'
      const success = await db.saveTrip(updatedTrip, user);
      
      if (success) {
        setIsStatusModalOpen(false);
        onRefresh();
      } else {
        alert("Erro ao salvar no banco de dados.");
      }
    } catch (e) {
      alert("Falha na comunicação com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none shadow-sm transition-all";
  const labelClass = "text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-[#001e50] rounded-2xl flex items-center justify-center p-2 shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg" alt="VW" className="brightness-0 invert" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-700 uppercase">Monitoramento Volkswagen</h1>
            <p className="text-xs text-slate-400">Dados sincronizados com a Tabela de Operações</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Data Agenda</th>
                <th className="px-6 py-4">OS / Container</th>
                <th className="px-6 py-4">Motorista / Placa</th>
                <th className="px-6 py-4">Últimos Status (Histórico)</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vwTrips.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 align-top transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</p>
                    <p className="text-blue-500 font-bold">{new Date(t.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 uppercase">{t.os}</p>
                    <p className="text-blue-600 font-mono font-bold text-[10px] mt-1">{t.container || 'A DEFINIR'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 uppercase">{t.driver.name}</p>
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-mono mt-1 inline-block">{t.driver.plateHorse}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-2">
                      {t.statusHistory?.slice(0, 3).map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${idx === 0 ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`}></div>
                          <span className={`text-[9px] font-black uppercase ${idx === 0 ? 'text-blue-600' : 'text-slate-400'}`}>{step.status}</span>
                          <span className="text-[8px] text-slate-300 font-mono">({new Date(step.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})})</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleOpenStatus(t)} 
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-black uppercase text-[9px] hover:bg-blue-700 transition-all shadow-md active:scale-95"
                    >
                      Atualizar Status
                    </button>
                  </td>
                </tr>
              ))}
              {vwTrips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-300 font-bold uppercase italic">Nenhuma viagem da Volkswagen localizada no sistema.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isStatusModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Registrar Etapa VW</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="space-y-1">
                <label className={labelClass}>Selecione o Status</label>
                <select 
                  className={inputClasses} 
                  value={tempStatus} 
                  onChange={e => setTempStatus(e.target.value as TripStatus)}
                >
                  {statusService.VW_STATUSES.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className={labelClass}>Data/Hora do Evento</label>
                <input 
                  type="datetime-local" 
                  className={inputClasses} 
                  value={statusTime} 
                  onChange={e => setStatusTime(e.target.value)} 
                />
              </div>

              <div className="grid gap-3 pt-4">
                <button 
                  disabled={isSaving}
                  onClick={handleStatusSubmit} 
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Gravando Histórico...' : 'Confirmar e Gravar'}
                </button>
                <button 
                  onClick={() => setIsStatusModalOpen(false)} 
                  className="w-full py-3 text-[10px] font-black text-slate-400 uppercase"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VWTab;
