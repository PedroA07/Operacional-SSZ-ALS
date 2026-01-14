
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
      const records = await stayImporter.processExcelForStays(file, selectedSession.id);
      await db.saveStayRecords(records);
      alert(`Sucesso: ${records.length} registros importados.`);
      await loadSessionRecords(selectedSession.id);
    } catch (err: any) {
      alert(err.message || "Erro ao processar planilha.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /**
   * Formata o rótulo de forma literal (string split) para evitar erros de fuso horário
   * Resultado: JANEIRO 2026 01 A 10
   */
  const formatSessionLabel = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return "DATA INVÁLIDA";
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const sParts = startDate.split('-'); // [2026, 01, 01]
    const eParts = endDate.split('-'); 

    const year = sParts[0];
    const monthIdx = parseInt(sParts[1], 10) - 1;
    const monthName = months[monthIdx] || 'MÊS';
    const dayS = sParts[2];
    const dayE = eParts[2];

    // Se mudou de mês, mostra formato reduzido para não confundir
    if (sParts[1] !== eParts[1]) {
       return `${dayS}/${sParts[1]} A ${dayE}/${eParts[1]} ${year}`;
    }

    return `${monthName} ${year} ${dayS} A ${dayE}`;
  };

  const formatDisplayDate = (isoString: string) => {
    if (!isoString) return '---';
    const d = new Date(isoString);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(sessions.map(s => s.category)));
    return ['GERAL', ...cats.sort()];
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    if (activeCategory === 'GERAL') return sessions;
    return sessions.filter(s => s.category === activeCategory);
  }, [sessions, activeCategory]);

  const recordColumns = [
    { key: 'os', label: '1. Tipo / OS', render: (r: StayRecord) => (
      <div className="flex flex-col">
        <span className="text-[7px] font-black text-blue-600 uppercase leading-none">{r.type}</span>
        <span className="font-black text-slate-900 text-[10px] mt-0.5">{r.os}</span>
      </div>
    )},
    { key: 'location', label: '2. Local / Previsão', render: (r: StayRecord) => (
      <div className="flex flex-col">
        <span className="font-bold text-[9px] uppercase text-slate-800 leading-tight">{r.location}</span>
        <span className="text-[8px] font-black text-blue-500 uppercase mt-0.5">PREV: {formatDisplayDate(r.scheduledStart)}</span>
      </div>
    )},
    { key: 'resource', label: '3. Recurso / Navio / Unidade', render: (r: StayRecord) => (
      <div className="flex flex-col">
        <span className="font-black text-[9px] uppercase text-slate-700 truncate">{r.driverName}</span>
        <div className="flex gap-2 items-center mt-0.5">
           <span className="text-[8px] font-bold text-slate-400 uppercase">{r.ship}</span>
           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
           <span className="text-[10px] font-mono font-black text-blue-600">{r.container}</span>
        </div>
      </div>
    )},
    { key: 'times', label: '4. Entrada / Saída', render: (r: StayRecord) => (
      <div className="flex flex-col gap-0.5 text-[8px] font-bold">
        <div className="flex justify-between gap-3"><span className="text-slate-400">ENT:</span> <span className="text-emerald-600">{formatDisplayDate(r.arrivalTime)}</span></div>
        <div className="flex justify-between gap-3"><span className="text-slate-400">SAI:</span> <span className="text-red-600">{formatDisplayDate(r.departureTime)}</span></div>
      </div>
    )},
    { key: 'stay', label: 'Estadia (>8h)', render: (r: StayRecord) => (
      <div className="flex flex-col items-center">
        <span className={`text-[10px] font-black ${r.exceededHours !== '---' ? 'text-red-600' : 'text-slate-400'}`}>{r.exceededHours}</span>
        {r.exceededHours !== '---' && <span className="text-[6px] bg-red-100 text-red-600 px-1 rounded font-black uppercase mt-0.5">Cobrável</span>}
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Arquivos de Estadias</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de histórico independente das operações diárias</p>
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
                     CRIADO EM {new Date(session.createdAt).toLocaleDateString('pt-BR')}
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
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  {isImporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2.5"/></svg>}
                  Importar Planilha
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

      {isCreatingSession && (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-slate-900 text-white text-center">
                 <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" strokeWidth="2.5"/></svg>
                 </div>
                 <h3 className="text-xl font-black uppercase tracking-tight">Nova Pasta de Estadia</h3>
                 <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">Configure o período e vínculo para importação</p>
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
      <style>{` .stay-table-compact table td { padding: 0.75rem 0.6rem !important; } `}</style>
    </div>
  );
};

export default StaysTab;
