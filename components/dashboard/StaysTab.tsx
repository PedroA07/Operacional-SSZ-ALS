
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Category, StaySession, StayRecord } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { stayImporter } from '../../utils/stayImporter';
import { db } from '../../utils/storage';

interface StaysTabProps {
  categories: Category[];
  userId: string;
}

const StaysTab: React.FC<StaysTabProps> = ({ userId, categories: globalCategories }) => {
  const [activeCategory, setActiveCategory] = useState<string>('GERAL');
  const [isImporting, setIsImporting] = useState(false);
  const [sessions, setSessions] = useState<StaySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StaySession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<StayRecord[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [editingRecord, setEditingRecord] = useState<StayRecord | null>(null);
  const [editForm, setEditForm] = useState({ arrival: '', departure: '' });

  const [newSessionForm, setNewSessionForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    category: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSessions = useCallback(async () => {
    const data = await db.getStaySessions();
    setSessions(data);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const loadSessionRecords = async (sessionId: string) => {
    const records = await db.getStayRecords(sessionId);
    setSessionRecords(records);
  };

  const handleOpenSession = async (session: StaySession) => {
    setSelectedSession(session);
    await loadSessionRecords(session.id);
  };

  const calculateStayExceeded = (arrivalTime: string, departureTime: string, session: StaySession): string => {
    if (!arrivalTime || !departureTime) return '---';
    const start = new Date(arrivalTime).getTime();
    const end = new Date(departureTime).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return '---';
    const totalStayMs = end - start;
    const graceMs = (session.gracePeriodHours || 8) * 3600000;
    const roundUpTrigger = session.roundUpMinutes || 30;
    if (totalStayMs <= graceMs) return '---';
    const exceededMs = totalStayMs - graceMs;
    let hours = Math.floor(exceededMs / 3600000);
    const minutes = Math.floor((exceededMs % 3600000) / 60000);
    if (minutes >= roundUpTrigger) {
      hours += 1;
      return `${hours}h 00m`;
    }
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const session: StaySession = {
      id: `session-${Date.now()}`,
      category: newSessionForm.category,
      startDate: newSessionForm.startDate,
      endDate: newSessionForm.endDate,
      createdAt: new Date().toISOString(),
      createdBy: userId,
      gracePeriodHours: 8,
      roundUpMinutes: 30
    };
    await db.saveStaySession(session);
    await loadSessions();
    setIsCreatingSession(false);
    handleOpenSession(session);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    await db.saveStaySession(selectedSession);
    await loadSessions();
    setIsSettingsOpen(false);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const records = await stayImporter.processExcelForStays(file, selectedSession.id);
      const processed = records.map(r => ({
        ...r,
        exceededHours: calculateStayExceeded(r.arrivalTime, r.departureTime, selectedSession)
      }));
      await db.saveStayRecords(processed);
      alert(`Sucesso: ${processed.length} registros importados.`);
      await loadSessionRecords(selectedSession.id);
    } catch (err: any) {
      alert(err.message || "Erro ao processar planilha.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenEditRecord = (record: StayRecord) => {
    setEditingRecord(record);
    setEditForm({
      arrival: record.arrivalTime ? record.arrivalTime.slice(0, 16) : '',
      departure: record.departureTime ? record.departureTime.slice(0, 16) : ''
    });
  };

  const handleSaveRecordEdit = async () => {
    if (!editingRecord || !selectedSession) return;
    const arrivalISO = new Date(editForm.arrival).toISOString();
    const departureISO = new Date(editForm.departure).toISOString();
    const updatedRecord: StayRecord = {
      ...editingRecord,
      arrivalTime: arrivalISO,
      departureTime: departureISO,
      exceededHours: calculateStayExceeded(arrivalISO, departureISO, selectedSession)
    };
    const updatedList = sessionRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r);
    await db.saveStayRecords([updatedRecord]);
    setSessionRecords(updatedList);
    setEditingRecord(null);
  };

  const formatSessionLabel = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return "DATA INVÁLIDA";
    const months = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
    const sParts = startDate.split('-'); 
    const eParts = endDate.split('-'); 
    const year = sParts[0];
    const monthIdx = parseInt(sParts[1], 10) - 1;
    const monthName = months[monthIdx] || 'MÊS';
    return sParts[1] !== eParts[1] ? `${sParts[2]}/${sParts[1]} A ${eParts[2]}/${eParts[1]} ${year}` : `${monthName} ${year} ${sParts[2]} A ${eParts[2]}`;
  };

  const formatDisplayDateTime = (isoString: string) => {
    if (!isoString) return '---';
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const recordColumns = [
    { key: 'os', label: 'Tipo / OS', render: (r: StayRecord) => (
      <div className="flex flex-col">
        <span className="text-[7px] font-black text-blue-600 uppercase leading-none">{r.type}</span>
        <span className="font-black text-slate-900 text-[10px] mt-0.5">{r.os}</span>
      </div>
    )},
    { key: 'resource', label: 'Motorista / Navio / Container', render: (r: StayRecord) => (
      <div className="flex flex-col">
        <span className="font-black text-[9px] uppercase text-slate-700 truncate">{r.driverName}</span>
        <div className="flex gap-2 items-center mt-0.5">
           <span className="text-[8px] font-bold text-slate-400 uppercase">{r.ship || '---'}</span>
           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
           <span className="text-[10px] font-mono font-black text-blue-600">{r.container}</span>
        </div>
      </div>
    )},
    { key: 'previsao', label: 'Previsão', render: (r: StayRecord) => (
      <div className="flex flex-col">
        <span className="text-[9px] font-black text-blue-500 uppercase">{formatDisplayDateTime(r.scheduledStart)}</span>
      </div>
    )},
    { key: 'times', label: 'Entrada / Saída (Editar)', render: (r: StayRecord) => (
      <div className="flex items-center gap-2 group">
        <div className="flex flex-col gap-0.5 text-[8px] font-bold min-w-[110px]">
          <div className="flex justify-between gap-2"><span className="text-slate-400">ENT:</span> <span className="text-emerald-600">{formatDisplayDateTime(r.arrivalTime)}</span></div>
          <div className="flex justify-between gap-2"><span className="text-slate-400">SAI:</span> <span className="text-red-600">{formatDisplayDateTime(r.departureTime)}</span></div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); handleOpenEditRecord(r); }}
          className="p-1.5 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732"/></svg>
        </button>
      </div>
    )},
    { key: 'punctuality', label: 'Pontualidade', render: (r: StayRecord) => {
      if (!r.scheduledStart || !r.arrivalTime) return <span className="text-[8px] text-slate-300 font-bold uppercase">SEM DADOS</span>;
      const scheduled = new Date(r.scheduledStart).getTime();
      const actual = new Date(r.arrivalTime).getTime();
      const onTime = actual <= scheduled;
      return (
        <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase border ${onTime ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {onTime ? 'NÃO ATRASOU' : 'ATRASOU'}
        </span>
      );
    }},
    { key: 'stay', label: 'Estadia Excedente', render: (r: StayRecord) => {
      const text = selectedSession ? calculateStayExceeded(r.arrivalTime, r.departureTime, selectedSession) : r.exceededHours;
      return (
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-black ${text !== '---' ? 'text-red-600' : 'text-slate-400'}`}>{text}</span>
          {text !== '---' && <span className="text-[6px] bg-red-100 text-red-600 px-1 rounded font-black uppercase mt-0.5">Cobrável</span>}
        </div>
      );
    }}
  ];

  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(sessions.map(s => s.category)));
    return ['GERAL', ...cats.sort()];
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (activeCategory === 'GERAL') return sessions;
    return sessions.filter(s => s.category === activeCategory);
  }, [sessions, activeCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relatórios de Estadias</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Comparativo de pontualidade e excesso de jornada</p>
          </div>
          <button 
            onClick={() => setIsCreatingSession(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
          >
            Nova Pasta de Estadia
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 border-t border-slate-50 pt-6">
           {availableCategories.map(cat => (
             <button 
               key={cat} 
               onClick={() => setActiveCategory(cat)}
               className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${activeCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
             >
               {cat}
             </button>
           ))}
        </div>
      </div>

      {!selectedSession ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {filteredSessions.map(session => (
             <button 
               key={session.id}
               onClick={() => handleOpenSession(session)}
               className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl transition-all group text-left relative overflow-hidden"
             >
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-blue-600 group-hover:text-white transition-all">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2.5"/></svg>
                </div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">{session.category}</p>
                <h4 className="text-xl font-black text-slate-900 uppercase leading-tight mb-8">
                  {formatSessionLabel(session.startDate, session.endDate)}
                </h4>
                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-6">
                   <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                     {session.gracePeriodHours}H CARENÇA • {session.roundUpMinutes}M ARRED.
                   </span>
                   <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                </div>
             </button>
           ))}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-6">
                 <button onClick={() => setSelectedSession(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg></button>
                 <div>
                    <h3 className="text-sm font-black uppercase text-slate-800">Pasta: {selectedSession.category}</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      {formatSessionLabel(selectedSession.startDate, selectedSession.endDate)}
                    </p>
                 </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  title="Regras de Estadia"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  {isImporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2.5"/></svg>}
                  Importar Planilha XLSX
                </button>
                <button onClick={() => { if(confirm('Excluir pasta e todos os registros nela contidos?')) { db.deleteStaySession(selectedSession.id); setSelectedSession(null); loadSessions(); } }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
              </div>
           </div>

           <div className="stay-table-compact">
             <SmartOperationTable 
               userId={userId}
               componentId={`stays-records-${selectedSession.id}`}
               title={`Dossiê de Estadias`}
               data={sessionRecords}
               columns={recordColumns}
             />
           </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-black uppercase text-slate-800 text-center">Editar Horários</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrada Real</label>
                <input type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold" value={editForm.arrival} onChange={e => setEditForm({...editForm, arrival: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Saída Real</label>
                <input type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold" value={editForm.departure} onChange={e => setEditForm({...editForm, departure: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button onClick={() => setEditingRecord(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
              <button onClick={handleSaveRecordEdit} className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Gravar</button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && selectedSession && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-slate-900 text-white text-center">
                <h3 className="text-xl font-black uppercase tracking-tight">Regras de Cobrança</h3>
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">Configurações para {selectedSession.category}</p>
             </div>
             <form onSubmit={handleSaveSettings} className="p-10 space-y-8">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Horas de Carença (Free-time)</label>
                   <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        required 
                        min="0"
                        className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800"
                        value={selectedSession.gracePeriodHours || 0}
                        onChange={e => setSelectedSession({...selectedSession, gracePeriodHours: Number(e.target.value)})}
                      />
                      <span className="text-[11px] font-black text-slate-400">HORAS</span>
                   </div>
                   <p className="text-[8px] text-slate-400 italic">A estadia só começará a ser contada após este período.</p>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gatilho de Arredondamento</label>
                   <div className="flex items-center gap-4">
                      <input 
                        type="number" 
                        required 
                        min="0"
                        max="59"
                        className="flex-1 px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800"
                        value={selectedSession.roundUpMinutes || 0}
                        onChange={e => setSelectedSession({...selectedSession, roundUpMinutes: Number(e.target.value)})}
                      />
                      <span className="text-[11px] font-black text-slate-400">MINUTOS</span>
                   </div>
                   <p className="text-[8px] text-slate-400 italic">Se os minutos excedentes atingirem este valor, arredonda para a próxima hora cheia.</p>
                </div>
                <div className="grid gap-3 pt-4">
                   <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all">Salvar Regras</button>
                   <button type="button" onClick={() => setIsSettingsOpen(false)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase">Voltar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {isCreatingSession && (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-slate-900 text-white text-center">
                 <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2.5"/></svg>
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Nova Pasta de Estadia</h3>
                 <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">Configure o período e vínculo</p>
              </div>
              <form onSubmit={handleCreateSession} className="p-10 space-y-6">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vínculo (Categoria)</label>
                   <select 
                    required 
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase"
                    value={newSessionForm.category}
                    onChange={e => setNewSessionForm({...newSessionForm, category: e.target.value})}
                   >
                     <option value="">Selecione...</option>
                     {globalCategories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                    <input type="date" required className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold" value={newSessionForm.startDate} onChange={e => setNewSessionForm({...newSessionForm, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Fim</label>
                    <input type="date" required className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold" value={newSessionForm.endDate} onChange={e => setNewSessionForm({...newSessionForm, endDate: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-3 pt-6">
                   <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">Criar Pasta</button>
                   <button type="button" onClick={() => setIsCreatingSession(false)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase">Cancelar</button>
                </div>
              </form>
           </div>
        </div>
      )}
      <style>{` .stay-table-compact table td { padding: 0.75rem 0.6rem !important; font-size: 9px !important; } `}</style>
    </div>
  );
};

export default StaysTab;
