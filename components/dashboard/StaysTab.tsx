
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Trip, Category, User, StaySession } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { stayImporter } from '../../utils/stayImporter';
import { stayCalculations } from '../../utils/stayCalculations';
import { db } from '../../utils/storage';

interface StaysTabProps {
  trips: Trip[];
  categories: Category[];
  userId: string;
}

const StaysTab: React.FC<StaysTabProps> = ({ userId, categories: globalCategories }) => {
  const [activeCategory, setActiveCategory] = useState<string>('GERAL');
  const [isImporting, setIsImporting] = useState(false);
  const [sessions, setSessions] = useState<StaySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StaySession | null>(null);
  const [sessionTrips, setSessionTrips] = useState<Trip[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
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

  const loadSessionTrips = async (sessionId: string) => {
    const trips = await db.getTripsBySession(sessionId);
    setSessionTrips(trips);
  };

  const handleOpenSession = async (session: StaySession) => {
    setSelectedSession(session);
    await loadSessionTrips(session.id);
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const session: StaySession = {
      id: `session-${Date.now()}`,
      category: newSessionForm.category,
      startDate: newSessionForm.startDate,
      endDate: newSessionForm.endDate,
      createdAt: new Date().toISOString(),
      createdBy: userId
    };
    await db.saveStaySession(session);
    await loadSessions();
    setIsCreatingSession(false);
    handleOpenSession(session);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const sessionData = sessionStorage.getItem('als_active_session');
      const user: User = sessionData ? JSON.parse(sessionData) : { id: userId, displayName: 'Operacional' };
      
      const result = await stayImporter.processExcelAndReturn(file, user, selectedSession.id);
      alert(`Importação concluída: ${result.added} registros adicionados.`);
      await loadSessionTrips(selectedSession.id);
    } catch (err: any) {
      alert(err.message || "Erro ao importar planilha. Verifique as colunas.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(sessions.map(s => s.category)));
    return ['GERAL', ...cats.sort()];
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (activeCategory === 'GERAL') return sessions;
    return sessions.filter(s => s.category === activeCategory);
  }, [sessions, activeCategory]);

  const columns = [
    { 
      key: 'os_info', 
      label: 'Tipo / OS', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-blue-600 uppercase leading-none">{t.type}</span>
          <span className="font-black text-slate-900 text-[10px] mt-0.5">{t.os}</span>
        </div>
      )
    },
    { 
      key: 'local', 
      label: 'Atendimento', 
      render: (t: Trip) => <span className="text-[9px] font-bold text-slate-600 uppercase truncate">{t.scheduling?.location || '---'}</span>
    },
    { 
      key: 'resource', 
      label: 'Recurso', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-bold text-[9px] uppercase text-slate-500 truncate">{t.driver.name}</span>
          <span className="text-[8px] font-black text-blue-500">{t.container || '---'}</span>
        </div>
      )
    },
    { 
      key: 'io_times', 
      label: 'Entrada / Saída', 
      render: (t: Trip) => {
        const inEntry = t.statusHistory.find(h => h.status === 'Chegou no cliente');
        const outEntry = t.statusHistory.find(h => h.status === 'Saiu do cliente');
        return (
          <div className="flex flex-col gap-1 text-[8px] font-bold">
            <div className="flex justify-between gap-4"><span className="text-slate-400">ENT:</span> <span className="text-emerald-600">{inEntry ? new Date(inEntry.dateTime).toLocaleString('pt-BR') : '---'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-slate-400">SAI:</span> <span className="text-red-600">{outEntry ? new Date(outEntry.dateTime).toLocaleString('pt-BR') : '---'}</span></div>
          </div>
        );
      }
    },
    { 
      key: 'stay_duration', 
      label: 'Estadia (>8h)', 
      render: (t: Trip) => {
        const details = stayCalculations.getStayDetails(t.dateTime, t.statusHistory);
        return (
          <div className="flex flex-col items-center">
            <span className={`text-[10px] font-black ${details.isExceeded ? 'text-red-600' : 'text-slate-400'}`}>{details.text}</span>
            {details.isExceeded && <span className="text-[6px] bg-red-100 text-red-600 px-1 rounded font-black uppercase mt-0.5">Cobrável</span>}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relatório de Estadias</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de histórico e pastas de faturamento</p>
          </div>
          <button 
            onClick={() => setIsCreatingSession(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
          >
            Nova Estadia
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
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                  <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2.5"/></svg>
                </div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{session.category}</p>
                <h4 className="text-sm font-black text-slate-800 uppercase mt-2">
                  {new Date(session.startDate).toLocaleDateString('pt-BR')} a {new Date(session.endDate).toLocaleDateString('pt-BR')}
                </h4>
                <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-4">
                   <span className="text-[8px] font-black text-slate-300 uppercase">Criado em {new Date(session.createdAt).toLocaleDateString('pt-BR')}</span>
                   <svg className="w-4 h-4 text-slate-200 group-hover:text-blue-500 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
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
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Período: {new Date(selectedSession.startDate).toLocaleDateString('pt-BR')} › {new Date(selectedSession.endDate).toLocaleDateString('pt-BR')}</p>
                 </div>
              </div>
              <div className="flex gap-3">
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  {isImporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2.5"/></svg>}
                  Importar Planilha
                </button>
                <button onClick={() => { if(confirm('Excluir pasta e registros?')) { db.deleteStaySession(selectedSession.id); setSelectedSession(null); loadSessions(); } }} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
              </div>
           </div>

           <div className="stay-table-compact">
             <SmartOperationTable 
               userId={userId}
               componentId={`stays-session-${selectedSession.id}`}
               title={`Dossiê de Estadias`}
               data={sessionTrips}
               columns={columns}
             />
           </div>
        </div>
      )}

      {isCreatingSession && (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-slate-900 text-white text-center">
                 <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2.5"/></svg>
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Criar Histórico de Estadia</h3>
                 <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">Defina o período e o vínculo para a pasta</p>
              </div>
              
              <form onSubmit={handleCreateSession} className="p-10 space-y-6">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vínculo Operacional</label>
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
                   <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">Criar Pasta e Abrir</button>
                   <button type="button" onClick={() => setIsCreatingSession(false)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase">Cancelar</button>
                </div>
              </form>
           </div>
        </div>
      )}
      <style>{` .stay-table-compact table td { padding: 0.75rem 0.6rem !important; } `}</style>
    </div>
  );
};

export default StaysTab;
