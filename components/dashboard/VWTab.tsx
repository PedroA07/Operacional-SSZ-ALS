
import React, { useState, useRef, useEffect } from 'react';
import { VWSchedule, Driver, VWStatus } from '../../types';

interface VWTabProps {
  schedules: VWSchedule[];
  drivers: Driver[];
  onSaveSchedule: (schedule: Partial<VWSchedule>, id?: string) => void;
  onUpdateStatus: (scheduleId: string, status: VWStatus, time: string) => void;
}

const VWTab: React.FC<VWTabProps> = ({ schedules, drivers, onSaveSchedule, onUpdateStatus }) => {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [selectedSchedule, setSelectedSchedule] = useState<VWSchedule | null>(null);
  const [statusTime, setStatusTime] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);
  const driverSelectRef = useRef<HTMLDivElement>(null);
  
  const [form, setForm] = useState<Partial<VWSchedule>>({
    dateTime: '', os: '', container: '', cva: '', driverName: '', cpf: '', plateHorse: '', plateTrailer: '', 
    origin: 'Cragea - SJC', destination: 'VW - Taubaté', status: 'Pendente'
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (driverSelectRef.current && !driverSelectRef.current.contains(event.target as Node)) {
        setShowDriverResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenSchedule = (s?: VWSchedule) => {
    if (s) {
      setForm(s);
      setEditingId(s.id);
      setDriverSearch(s.driverName || '');
    } else {
      setForm({
        dateTime: '', os: '', container: '', cva: '', driverName: '', cpf: '', plateHorse: '', plateTrailer: '', 
        origin: 'Cragea - SJC', destination: 'VW - Taubaté', status: 'Pendente'
      });
      setEditingId(undefined);
      setDriverSearch('');
    }
    setIsScheduleModalOpen(true);
  };

  const handleSelectDriver = (driver: Driver) => {
    setForm(prev => ({
      ...prev,
      driverName: driver.name,
      cpf: driver.cpf,
      plateHorse: driver.plateHorse,
      plateTrailer: driver.plateTrailer
    }));
    setDriverSearch(`${driver.name} (${driver.plateHorse})`);
    setShowDriverResults(false);
  };

  const handleOpenStatus = (s: VWSchedule) => {
    setSelectedSchedule(s);
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setStatusTime((new Date(Date.now() - tzOffset)).toISOString().slice(0, 16));
    setIsStatusModalOpen(true);
  };

  const schedulesByRoute = schedules.reduce((acc: any, s) => {
    const key = `${s.origin} ➔ ${s.destination}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) || 
    d.plateHorse.toLowerCase().includes(driverSearch.toLowerCase())
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-[#001e50] rounded-2xl flex items-center justify-center p-2.5 shadow-md">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg" 
              alt="Volkswagen" 
              className="w-full h-full object-contain brightness-0 invert"
            />
          </div>
          <div><h1 className="text-lg font-bold text-slate-700 uppercase tracking-tight">Operação Volkswagen</h1><p className="text-xs text-slate-400 font-medium tracking-wide">Monitoramento ALS Transportes</p></div>
        </div>
        <button onClick={() => handleOpenSchedule()} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 shadow-lg transition-all">Nova Programação</button>
      </div>

      {Object.entries(schedulesByRoute).map(([route, items]: [string, any]) => (
        <div key={route} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100"><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{route}</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <tr className="border-b border-slate-50">
                  <th className="px-6 py-4">Agenda</th>
                  <th className="px-6 py-4">OS / Container</th>
                  <th className="px-6 py-4">Motorista</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px]">
                {items.map((s: VWSchedule) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-700">{new Date(s.dateTime).toLocaleDateString('pt-BR')}</p>
                      <p className="text-blue-500 font-semibold">{new Date(s.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-700 uppercase">{s.os}</p>
                      <p className="text-slate-400 font-medium">{s.container}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-700 uppercase">{s.driverName}</p>
                      <p className="text-slate-400 font-bold text-[9px] uppercase tracking-tighter">{s.plateHorse} / {s.plateTrailer}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-bold uppercase border bg-slate-50 text-slate-400`}>{s.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleOpenStatus(s)} className="text-blue-500 font-bold uppercase text-[9px] mr-4 hover:text-blue-700">Status</button>
                      <button onClick={() => handleOpenSchedule(s)} className="text-slate-300 font-bold uppercase text-[9px] hover:text-slate-500">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* MODAL STATUS */}
      {isStatusModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Atualizar Evento</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data e Hora do Evento</label>
                <div className="relative group">
                   <input 
                    type="datetime-local" 
                    className={inputClasses} 
                    value={statusTime} 
                    onChange={e => setStatusTime(e.target.value)} 
                   />
                </div>
              </div>
              <div className="grid gap-3">
                {['Retirado Cragea', 'Chegada Volks', 'Saída Volks', 'Baixa Cragea'].map(st => (
                  <button 
                    key={st} 
                    onClick={() => { onUpdateStatus(selectedSchedule.id, st as VWStatus, statusTime); setIsStatusModalOpen(false); }} 
                    className="w-full py-4 rounded-2xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600 transition-all shadow-sm active:scale-[0.98]"
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AGENDAMENTO */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-lg uppercase tracking-tight">Dados da Programação</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-300 hover:text-red-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); onSaveSchedule(form, editingId); setIsScheduleModalOpen(false); }} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data/Hora Agendada</label>
                  <input required type="datetime-local" className={inputClasses} value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ordem de Serviço (OS)</label>
                  <input required type="text" className={inputClasses} value={form.os} onChange={e => setForm({...form, os: e.target.value})} />
                </div>
              </div>
              <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4 relative" ref={driverSelectRef}>
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">Relacionar da Base ALS (Pesquise)</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="ESCREVA O NOME OU PLACA PARA FILTRAR..."
                    className={inputClasses}
                    value={driverSearch}
                    onFocus={() => setShowDriverResults(true)}
                    onChange={(e) => { setDriverSearch(e.target.value); setShowDriverResults(true); }}
                  />
                  {showDriverResults && filteredDrivers.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                      {filteredDrivers.map(d => (
                        <button 
                          key={d.id} 
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50 last:border-0"
                          onClick={() => handleSelectDriver(d)}
                        >
                          <p className="text-slate-700">{d.name}</p>
                          <p className="text-blue-500 font-mono">{d.plateHorse}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Motorista</label><input required type="text" className={inputClasses} value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CPF</label><input required type="text" className={inputClasses} value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa Cavalo</label><input required type="text" className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa Carreta</label><input required type="text" className={inputClasses} value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Container</label><input required type="text" className={inputClasses} value={form.container} onChange={e => setForm({...form, container: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">CVA</label><input required type="text" className={inputClasses} value={form.cva} onChange={e => setForm({...form, cva: e.target.value})} /></div>
              </div>
              <button type="submit" className="w-full py-4 bg-slate-800 text-white rounded-xl text-[10px] font-bold uppercase shadow-lg transition-all hover:bg-blue-600 tracking-[0.2em]">Gravar Programação</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VWTab;
