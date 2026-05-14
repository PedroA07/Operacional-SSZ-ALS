
import React, { useState, useRef } from 'react';
import { VWSchedule, Driver, VWStatus } from '../../types';
import { createNewVWSchedule, formatVWDateTime } from '../../utils/vwService';
import SmartOperationTable from './operations/SmartOperationTable';

interface VWTabProps {
  userId: string;
  schedules: VWSchedule[];
  drivers: Driver[];
  onSaveSchedule: (schedule: Partial<VWSchedule>, id?: string) => void;
  onUpdateStatus: (scheduleId: string, status: VWStatus, time: string) => void;
}

const VWTab: React.FC<VWTabProps> = ({ userId, schedules, drivers, onSaveSchedule, onUpdateStatus }) => {
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [selectedSchedule, setSelectedSchedule] = useState<VWSchedule | null>(null);
  const [statusTime, setStatusTime] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverResults, setShowDriverResults] = useState(false);
  const driverSelectRef = useRef<HTMLDivElement>(null);
  
  const [form, setForm] = useState<Partial<VWSchedule>>(createNewVWSchedule());

  // REFEITA: Função de Nova Programação (Garante reset total)
  const handleOpenNewSchedule = () => {
    setForm(createNewVWSchedule());
    setEditingId(undefined);
    setDriverSearch('');
    setIsScheduleModalOpen(true);
  };

  // REFEITA: Função de Editar (Garante clonagem correta do objeto)
  const handleOpenEditSchedule = (s: VWSchedule) => {
    setForm({...s});
    setEditingId(s.id);
    setDriverSearch(s.driverName || '');
    setIsScheduleModalOpen(true);
  };

  const handleOpenStatus = (s: VWSchedule) => {
    setSelectedSchedule(s);
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    setStatusTime(new Date(Date.now() - tzOffset).toISOString().slice(0, 16));
    setIsStatusModalOpen(true);
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

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSchedule(form, editingId);
    setIsScheduleModalOpen(false);
  };

  // REGRA: Filtrar apenas motoristas vinculados à operação Volkswagen
  const filteredAvailableDrivers = drivers.filter(d => 
    d.operations.some(op => op.client.toUpperCase() === 'VOLKSWAGEN') &&
    (d.name.toLowerCase().includes(driverSearch.toLowerCase()) || d.plateHorse.toLowerCase().includes(driverSearch.toLowerCase()))
  );

  const inputClasses = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none shadow-sm transition-all";

  const columns = [
    {
      key: 'agendamento',
      label: 'Agendamento',
      render: (s: VWSchedule) => {
        const { date, time } = formatVWDateTime(s.dateTime);
        return (
          <>
            <p className="font-bold text-slate-700">{date}</p>
            <p className="text-blue-500 font-bold">{time}</p>
          </>
        );
      },
    },
    {
      key: 'os_container_cva',
      label: 'OS / Container / CVA',
      render: (s: VWSchedule) => (
        <>
          <p className="font-bold text-slate-700 uppercase">{s.os}</p>
          <p className="text-slate-400">{s.container}</p>
          <p className="text-blue-400 font-black text-[9px] mt-1">CVA: {s.cva || '---'}</p>
        </>
      ),
    },
    {
      key: 'motorista_placas',
      label: 'Motorista / Placas',
      render: (s: VWSchedule) => (
        <>
          <p className="font-bold text-slate-700 uppercase">{s.driverName}</p>
          <div className="flex flex-col mt-1">
            <span className="text-slate-500 font-mono font-bold text-[10px] uppercase">Cavalo: {s.plateHorse}</span>
            <span className="text-slate-400 font-mono text-[9px] uppercase">Carreta: {s.plateTrailer}</span>
          </div>
        </>
      ),
    },
    {
      key: 'linha_do_tempo',
      label: 'Linha do Tempo',
      render: (s: VWSchedule) => (
        <div className="space-y-3">
          {[...(s.statusHistory || [])].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 border-l-2 border-slate-100 pl-3 py-0.5 ml-1">
              <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${idx === 0 ? 'bg-blue-600 ring-4 ring-blue-50' : 'bg-slate-300'}`}></div>
              <div>
                <p className={`font-black uppercase text-[9px] leading-none ${idx === 0 ? 'text-blue-600' : 'text-slate-400'}`}>{step.status}</p>
                <p className="text-[8px] text-slate-300 font-bold mt-1">
                  {new Date(step.dateTime).toLocaleString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'acoes',
      label: 'Ações',
      render: (s: VWSchedule) => (
        <div className="text-right space-x-2 whitespace-nowrap">
          <button onClick={() => handleOpenStatus(s)} className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg font-black uppercase text-[8px] hover:bg-blue-600 hover:text-white transition-all shadow-sm">Novo Status</button>
          <button onClick={() => handleOpenEditSchedule(s)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors" title="Editar Programação"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-[#001e50] rounded-2xl flex items-center justify-center p-2 shadow-md">
            <img src="https://upload.wikimedia.org/wikipedia/commons/6/6d/Volkswagen_logo_2019.svg" alt="VW" className="brightness-0 invert" />
          </div>
          <div><h1 className="text-lg font-bold text-slate-700 uppercase">Monitoramento Volkswagen</h1><p className="text-xs text-slate-400">Controle Operacional ALS</p></div>
        </div>
        <button onClick={handleOpenNewSchedule} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all">Nova Programação</button>
      </div>

      <SmartOperationTable
        userId={userId}
        componentId="vw-list"
        columns={columns}
        data={schedules}
        title="Agendamentos VW"
      />

      {isStatusModalOpen && selectedSchedule && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-widest">Atualizar Operação</h3>
              <button onClick={() => setIsStatusModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5"/></svg></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data/Hora Real</label><input type="datetime-local" className={inputClasses} value={statusTime} onChange={e => setStatusTime(e.target.value)} /></div>
              <div className="grid gap-3">
                {/* Fixed status strings to match TripStatus literals in types.ts */}
                {[
                  { label: 'Retirada do Cheio', value: 'Retirada do cheio' },
                  { label: 'Chegada na Volkswagen', value: 'Chegou na Volkswagen' },
                  { label: 'Saída da Volkswagen', value: 'Saiu da Volkswagen' },
                  { label: 'Concluir Viagem (Baixa)', value: 'Viagem concluída' }
                ].map(opt => (
                  <button key={opt.value} onClick={() => { onUpdateStatus(selectedSchedule.id, opt.value as VWStatus, statusTime); setIsStatusModalOpen(false); }} className="w-full py-4 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-blue-600 hover:border-blue-600 hover:text-white shadow-sm transition-all active:scale-95">{opt.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700 text-lg uppercase tracking-tight">{editingId ? 'Editar Programação' : 'Nova Programação'}</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-300 hover:text-red-500 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-8 grid grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data/Hora Agenda</label><input required type="datetime-local" className={inputClasses} value={form.dateTime} onChange={e => setForm({...form, dateTime: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nº OS</label><input required type="text" className={inputClasses} value={form.os} onChange={e => setForm({...form, os: e.target.value})} /></div>
              
              <div className="col-span-2 space-y-1 relative" ref={driverSelectRef}>
                <label className="text-[10px] font-black text-blue-500 uppercase ml-1">Selecionar Motorista Vinculado à Volkswagen</label>
                <input type="text" placeholder="BUSCAR POR NOME OU PLACA..." className={inputClasses} value={driverSearch} onFocus={() => setShowDriverResults(true)} onChange={(e) => { setDriverSearch(e.target.value); setShowDriverResults(true); }} />
                {showDriverResults && (
                  <div className="absolute z-[130] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-48 overflow-y-auto border-t-4 border-blue-500">
                    {filteredAvailableDrivers.map(d => (
                      <button key={d.id} type="button" className="w-full text-left px-4 py-3 hover:bg-blue-50 text-[10px] font-bold uppercase border-b border-slate-50 flex items-center justify-between group" onClick={() => handleSelectDriver(d)}>
                        <p className="text-slate-700 group-hover:text-blue-600 transition-colors">{d.name} <span className="ml-2 text-slate-400 font-mono">[{d.plateHorse}]</span></p>
                        <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-black">VINCULADO</span>
                      </button>
                    ))}
                    {filteredAvailableDrivers.length === 0 && (
                      <div className="p-6 text-center text-slate-300 font-bold uppercase italic text-[9px]">
                        Nenhum motorista da base possui vínculo com a operação Volkswagen.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Motorista</label><input required type="text" className={inputClasses} value={form.driverName} onChange={e => setForm({...form, driverName: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">CVA</label><input type="text" className={inputClasses} value={form.cva} onChange={e => setForm({...form, cva: e.target.value})} /></div>
              
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Placa Cavalo</label><input required type="text" className={inputClasses} value={form.plateHorse} onChange={e => setForm({...form, plateHorse: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Placa Carreta</label><input required type="text" className={inputClasses} value={form.plateTrailer} onChange={e => setForm({...form, plateTrailer: e.target.value})} /></div>
              
              <div className="col-span-2 space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-1">Container</label><input required type="text" className={inputClasses} value={form.container} onChange={e => setForm({...form, container: e.target.value})} /></div>
              
              <div className="col-span-2 pt-4 flex gap-4">
                <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all">Confirmar Registro</button>
                <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-8 py-4 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-200 transition-all">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VWTab;
