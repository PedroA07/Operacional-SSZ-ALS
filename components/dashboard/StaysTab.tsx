
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Category, StaySession, StayRecord } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import { stayImporter } from '../../utils/stayImporter';
import { stayValidator } from '../../utils/stayValidator';
import { stayNamingRules } from '../../utils/stayNamingRules';
import { db } from '../../utils/storage';
import StayFeedbackModal from '../shared/StayFeedbackModal';
import FeedbackModal from '../shared/FeedbackModal';
import StayFolderCard from './stays/StayFolderCard';

interface StaysTabProps {
  categories: Category[];
  userId: string;
}

const StaysTab: React.FC<StaysTabProps> = ({ userId, categories: globalCategories }) => {
  const [activeCategory, setActiveCategory] = useState<string>('GERAL');
  const [filterYear, setFilterYear] = useState<string>('TODOS');
  const [filterMonth, setFilterMonth] = useState<string>('TODOS');
  
  const [isImporting, setIsImporting] = useState(false);
  const [sessions, setSessions] = useState<StaySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StaySession | null>(null);
  const [sessionRecords, setSessionRecords] = useState<StayRecord[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [feedback, setFeedback] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'warning' | 'error'; details?: string[] }>({
    isOpen: false, title: '', message: '', type: 'success'
  });

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const [editingRecord, setEditingRecord] = useState<StayRecord | null>(null);
  const [editForm, setEditForm] = useState({ arrival: '', departure: '' });

  const [newSessionForm, setNewSessionForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    category: '',
    costPerHour: 40
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

  const handleDeleteSession = (session: StaySession, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: "Excluir Pasta?",
      message: `Deseja remover permanentemente a pasta "${session.category.replace(/\|/g, ' ')}" e todos os seus registros?`,
      onConfirm: async () => {
        const success = await db.deleteStaySession(session.id);
        if (success) {
          await loadSessions();
          setFeedback({ isOpen: true, title: "Excluído", message: "Pasta removida com sucesso.", type: "success" });
        }
      }
    });
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sessionId = `stay-session-${Date.now()}`;
      const folderName = stayNamingRules.generateFolderName(
        newSessionForm.category, 
        newSessionForm.startDate, 
        newSessionForm.endDate
      );

      const newSession: StaySession = {
        id: sessionId,
        category: folderName,
        startDate: new Date(newSessionForm.startDate).toISOString(),
        endDate: new Date(newSessionForm.endDate).toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: userId,
        gracePeriodHours: 8,
        roundUpMinutes: 30,
        costPerHour: newSessionForm.costPerHour
      };
      
      const success = await db.saveStaySession(newSession);
      if (success) {
        setFeedback({ isOpen: true, title: "Pasta Criada", message: `A pasta foi registrada com sucesso.`, type: "success" });
        setIsCreatingSession(false);
        await loadSessions();
      }
    } catch (err) {
      setFeedback({ isOpen: true, title: "Erro", message: "Falha ao gravar no banco de dados.", type: "error" });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    try {
      await db.saveStaySession(selectedSession);
      setIsSettingsOpen(false);
      await loadSessions();
      
      const updatedRecords = sessionRecords.map(r => ({
        ...r,
        exceededHours: calculateStayExceeded(r.scheduledStart, r.departureTime, selectedSession)
      }));
      await db.saveStayRecords(updatedRecords);
      await loadSessionRecords(selectedSession.id);

      setFeedback({ isOpen: true, title: "Regras Atualizadas", message: "As configurações de cobrança foram aplicadas.", type: "success" });
    } catch (e) {
      setFeedback({ isOpen: true, title: "Erro ao Salvar", message: "Não foi possível persistir as alterações.", type: "error" });
    }
  };

  const calculateExceededHoursDecimal = (scheduledStartTime: string, departureTime: string, session: StaySession): number => {
    if (!scheduledStartTime || !departureTime) return 0;
    
    // Tratamos as strings ISO Local como instantes de tempo absolutos
    const schedule = new Date(scheduledStartTime).getTime();
    const departure = new Date(departureTime).getTime();
    
    if (isNaN(schedule) || isNaN(departure)) return 0;
    
    const graceMs = (session.gracePeriodHours || 8) * 3600000;
    const triggerPoint = schedule + graceMs;
    
    if (departure <= triggerPoint) return 0;
    
    const billableMs = departure - triggerPoint;
    const totalMinutes = Math.floor(billableMs / 60000);
    const wholeHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const roundUpTrigger = session.roundUpMinutes || 30;
    
    return remainingMinutes >= roundUpTrigger ? wholeHours + 1 : wholeHours;
  };

  const calculateStayExceeded = (scheduledStartTime: string, departureTime: string, session: StaySession): string => {
    const hours = calculateExceededHoursDecimal(scheduledStartTime, departureTime, session);
    return hours === 0 ? '---' : `${hours}h 00m`;
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSession) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const records = await stayImporter.processExcelForStays(file, selectedSession.id);
      
      if (records.length === 0) {
        setFeedback({ isOpen: true, title: "Planilha Sem Dados", message: "Nenhum registro de OS válido foi localizado.", type: "warning" });
        setIsImporting(false);
        return;
      }

      const { unique, duplicateList } = stayValidator.filterDuplicates(records, sessionRecords);
      
      if (unique.length === 0 && records.length > 0) {
        setFeedback({ isOpen: true, title: "Itens Já Importados", message: "Todos os registros deste arquivo Excel já constam nesta pasta.", type: "warning", details: duplicateList });
        setIsImporting(false);
        return;
      }

      const processed = unique.map(r => ({
        ...r,
        exceededHours: calculateStayExceeded(r.scheduledStart, r.departureTime, selectedSession)
      }));
      
      await db.saveStayRecords(processed);
      setFeedback({ isOpen: true, title: "Sucesso!", message: `${processed.length} novas OS importadas com sucesso.`, type: "success" });
      await loadSessionRecords(selectedSession.id);
    } catch (err: any) {
      setFeedback({ isOpen: true, title: "Erro no Processamento", message: "Falha ao ler o Excel.", type: "error" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Helper para converter ISO Local para string compatível com input datetime-local
  const formatISOToInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      // Como já salvamos no formato Local YYYY-MM-DDTHH:mm:ss, basta dar um slice
      return isoString.slice(0, 16);
    } catch (e) { return ''; }
  };

  const handleOpenEditRecord = (r: StayRecord) => {
    setEditingRecord(r);
    setEditForm({ 
      arrival: formatISOToInput(r.arrivalTime), 
      departure: formatISOToInput(r.departureTime) 
    });
  };

  const handleSaveRecordEdit = async () => {
    if (!editingRecord || !selectedSession) return;
    // Salva exatamente como digitado, reconstruindo o ISO Local
    const arrivalISO = editForm.arrival ? `${editForm.arrival}:00` : '';
    const departureISO = editForm.departure ? `${editForm.departure}:00` : '';

    const updatedRecord: StayRecord = {
      ...editingRecord,
      arrivalTime: arrivalISO,
      departureTime: departureISO,
      exceededHours: calculateStayExceeded(editingRecord.scheduledStart, departureISO, selectedSession)
    };
    await db.saveStayRecords([updatedRecord]);
    await loadSessionRecords(selectedSession.id);
    setEditingRecord(null);
  };

  const formatFullDateTime = (iso: string) => {
    if (!iso) return '---';
    try {
      const date = new Date(iso);
      if (isNaN(date.getTime())) return '---';
      
      // Formatação manual para evitar conversão de fuso horário indesejada na exibição
      const pad = (n: number) => String(n).padStart(2, '0');
      const d = pad(date.getDate());
      const m = pad(date.getMonth() + 1);
      const y = date.getFullYear();
      const hh = pad(date.getHours());
      const mm = pad(date.getMinutes());

      return `${d}/${m}/${y} ${hh}:${mm}`;
    } catch (e) {
      return '---';
    }
  };

  const years = useMemo(() => {
    const s = new Set<number>(sessions.map(s => new Date(s.startDate).getFullYear()));
    return Array.from(s).sort((a: number, b: number) => b - a);
  }, [sessions]);

  const monthsList = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const normalizedCat = s.category.toUpperCase().replace(/\|/g, ' ');
      const matchCat = activeCategory === 'GERAL' || normalizedCat.includes(activeCategory.toUpperCase());
      const matchYear = filterYear === 'TODOS' || new Date(s.startDate).getFullYear().toString() === filterYear;
      const matchMonth = filterMonth === 'TODOS' || monthsList[new Date(s.startDate).getMonth()] === filterMonth;
      return matchCat && matchYear && matchMonth;
    });
  }, [sessions, activeCategory, filterYear, filterMonth]);

  const recordColumns = [
    { key: 'os', label: 'Tipo / OS', render: (r: StayRecord) => (
      <div className="flex flex-col">
        <span className="text-[7px] font-black text-blue-600 uppercase leading-none">{r.type}</span>
        <span className="font-black text-slate-900 text-[10px] mt-0.5">{r.os}</span>
      </div>
    )},
    { key: 'location', label: 'Atendimento', render: (r: StayRecord) => (
      <span className="text-[9px] font-black uppercase text-slate-600 leading-tight block whitespace-normal break-words max-w-[150px]">{r.location}</span>
    )},
    { key: 'resource', label: 'Recursos', render: (r: StayRecord) => (
      <div className="flex flex-col min-w-[180px]">
        <span className="font-black text-[10px] uppercase text-slate-700 truncate">{r.driverName}</span>
        <div className="flex gap-2 items-center mt-1">
           <span className="text-[8px] font-bold text-slate-400 uppercase">{r.ship || '---'}</span>
           <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
           <span className="text-[10px] font-mono font-black text-blue-600">{r.container}</span>
        </div>
      </div>
    )},
    { key: 'scheduled', label: 'Previsão (Início Carência)', render: (r: StayRecord) => (
      <div className="flex flex-col bg-slate-50 px-2 py-1 rounded border border-slate-100 w-[110px]">
         <span className="text-[6.5px] font-black text-slate-400 uppercase leading-none mb-0.5">Janela Prevista</span>
         <span className="text-[9px] font-black text-slate-700">{formatFullDateTime(r.scheduledStart)}</span>
      </div>
    )},
    { key: 'times', label: 'Janela Realizada', render: (r: StayRecord) => (
      <div className="flex flex-col gap-1 w-[135px]">
        <div className="flex flex-col bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
           <span className="text-[6.5px] font-black text-emerald-600 uppercase leading-none mb-0.5">Entrada Real</span>
           <span className="text-[9px] font-black text-emerald-700">{formatFullDateTime(r.arrivalTime)}</span>
        </div>
        <div className="flex flex-col bg-red-50 px-2 py-1 rounded border border-red-100">
           <span className="text-[6.5px] font-black text-red-600 uppercase leading-none mb-0.5">Saída Real</span>
           <span className="text-[9px] font-black text-red-700">{formatFullDateTime(r.departureTime)}</span>
        </div>
      </div>
    )},
    { key: 'stay', label: 'Cobrável (Pós-Carência)', render: (r: StayRecord) => {
      const text = r.exceededHours;
      return (
        <div className="flex flex-col items-center">
          <span className={`text-[10px] font-black ${text !== '---' ? 'text-red-600' : 'text-slate-400'}`}>{text}</span>
          {text !== '---' && <span className="text-[6px] bg-red-100 text-red-600 px-1 rounded font-black uppercase mt-0.5 shadow-sm">Excedente</span>}
        </div>
      );
    }},
    { key: 'totalCost', label: 'Fatura Estimada', render: (r: StayRecord) => {
      if (!selectedSession) return '---';
      const hours = calculateExceededHoursDecimal(r.scheduledStart, r.departureTime, selectedSession);
      const total = hours * (selectedSession.costPerHour || 0);
      return total === 0 ? <span className="text-slate-300 font-bold">---</span> : (
        <span className="text-[10px] font-black text-emerald-700">
          {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      );
    }},
    { key: 'actions', label: 'Ações', render: (r: StayRecord) => (
      <div className="flex gap-1 justify-end">
        <button onClick={(e) => { e.stopPropagation(); handleOpenEditRecord(r); }} className="p-2 text-slate-300 hover:text-blue-500 transition-all hover:bg-blue-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732"/></svg></button>
        <button onClick={(e) => { 
          e.stopPropagation(); 
          setConfirmModal({
            isOpen: true,
            title: "Remover Registro?",
            message: `Deseja excluir permanentemente o registro da OS ${r.os}?`,
            onConfirm: async () => {
              await db.deleteStayRecord(r.id);
              await loadSessionRecords(selectedSession!.id);
            }
          });
        }} className="p-2 text-slate-300 hover:text-red-500 transition-all hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <StayFeedbackModal isOpen={feedback.isOpen} title={feedback.title} message={feedback.message} type={feedback.type} details={feedback.details} onClose={() => setFeedback({ ...feedback, isOpen: false })} />
      <FeedbackModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} type="confirm" onConfirm={confirmModal.onConfirm} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} />

      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Relatórios de Estadias</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Carência Aplicada sobre a Janela de Previsão</p>
          </div>
          <button onClick={() => setIsCreatingSession(true)} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95">Criar Nova Pasta</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-50">
           <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar Categoria</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all" value={activeCategory} onChange={e => setActiveCategory(e.target.value)}>
                 <option value="GERAL">TODAS AS CATEGORIAS</option>
                 {globalCategories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>)}
              </select>
           </div>
           <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar Ano</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black outline-none focus:border-blue-500 transition-all" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                 <option value="TODOS">TODOS OS ANOS</option>
                 {years.map(y => <option key={y} value={y.toString()}>{y}</option>)}
              </select>
           </div>
           <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar Mês</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                 <option value="TODOS">TODOS OS MESES</option>
                 {monthsList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
           </div>
        </div>
      </div>

      {!selectedSession ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {filteredSessions.map(session => (
             <StayFolderCard 
               key={session.id} 
               session={session} 
               onClick={handleOpenSession} 
               onDelete={handleDeleteSession} 
             />
           ))}
           {filteredSessions.length === 0 && (
             <div className="col-span-full py-24 text-center text-slate-300 font-black uppercase italic text-xs border-2 border-dashed border-slate-100 rounded-[3rem] bg-white/50">Nenhuma pasta localizada</div>
           )}
        </div>
      ) : (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
           <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                 <button onClick={() => setSelectedSession(null)} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg></button>
                 <div><h3 className="text-sm font-black uppercase text-slate-800 leading-none">{selectedSession.category.replace(/\|/g, ' ')}</h3></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsSettingsOpen(true)} className="px-5 py-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg><span className="text-[10px] font-black uppercase">Taxas</span></button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95">{isImporting ? 'Lendo...' : 'Importar Excel'}</button>
              </div>
           </div>
           <div className="stay-table-compact">
             <SmartOperationTable userId={userId} componentId={`stays-records-${selectedSession.id}`} title={`Registros de Permanência na Unidade`} data={sessionRecords} columns={recordColumns} />
           </div>
        </div>
      )}

      {isSettingsOpen && selectedSession && (
        <div className="fixed inset-0 z-[3500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-8 bg-slate-900 text-white text-center">
                <h3 className="text-xl font-black uppercase tracking-tight">Parametrização de Custos</h3>
                <p className="text-[10px] font-bold text-blue-400 uppercase mt-1">{selectedSession.category.replace(/\|/g, ' ')}</p>
             </div>
             <form onSubmit={handleSaveSettings} className="p-10 space-y-8">
                <div className="space-y-2">
                   <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">💰 Valor Hora Adicional (R$)</label>
                   </div>
                   <input type="number" step="0.01" required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 text-lg" value={selectedSession.costPerHour || 0} onChange={e => setSelectedSession({...selectedSession, costPerHour: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">⏱️ Carência (Horas Livre Pós-Previsão)</label>
                   </div>
                   <input type="number" required min="0" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={selectedSession.gracePeriodHours || 0} onChange={e => setSelectedSession({...selectedSession, gracePeriodHours: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                   <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></div>
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">🎯 Arredondar aos (Minutos)</label>
                   </div>
                   <input type="number" required min="0" max="59" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" value={selectedSession.roundUpMinutes || 0} onChange={e => setSelectedSession({...selectedSession, roundUpMinutes: Number(e.target.value)})} />
                </div>
                <div className="grid gap-3 pt-4">
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all">Salvar Regras</button>
                  <button type="button" onClick={() => setIsSettingsOpen(false)} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase">Voltar</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl space-y-6">
            <h3 className="text-lg font-black uppercase text-slate-800 text-center leading-tight">Ajustar Eventos</h3>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-in Real</label><input type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold" value={editForm.arrival} onChange={e => setEditForm({...editForm, arrival: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-out Real</label><input type="datetime-local" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-bold" value={editForm.departure} onChange={e => setEditForm({...editForm, departure: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button onClick={() => setEditingRecord(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase">Cancelar</button>
              <button onClick={handleSaveRecordEdit} className="py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isCreatingSession && (
        <div className="fixed inset-0 z-[3200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
              <div className="p-10 bg-slate-900 text-white text-center">
                 <h3 className="text-xl font-black uppercase tracking-tight">Configurar Nova Pasta</h3>
                 <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest mt-2">O nome será gerado automaticamente por data</p>
              </div>
              <form onSubmit={handleCreateSession} className="p-10 space-y-6">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Categoria Vinculada</label>
                   <select required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800 uppercase" value={newSessionForm.category} onChange={e => setNewSessionForm({...newSessionForm, category: e.target.value})}>
                     <option value="">Selecione...</option>
                     {globalCategories.filter(c => !c.parentId).map(c => <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data Início</label>
                    <input type="date" required className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold" value={newSessionForm.startDate} onChange={e => setNewSessionForm({...newSessionForm, startDate: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data Fim</label>
                    <input type="date" required className="w-full px-4 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-bold" value={newSessionForm.endDate} onChange={e => setNewSessionForm({...newSessionForm, endDate: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Valor p/ Hora Excedente</label>
                  <input type="number" step="0.01" required className="w-full px-5 py-4 rounded-2xl border-2 border-slate-50 bg-slate-50 font-black text-slate-800" placeholder="R$ 40,00" value={newSessionForm.costPerHour} onChange={e => setNewSessionForm({...newSessionForm, costPerHour: Number(e.target.value)})} />
                </div>
                <div className="grid gap-3 pt-6">
                   <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95">Criar e Registrar</button>
                   <button type="button" onClick={() => setIsCreatingSession(false)} className="w-full py-3 text-[10px] font-black text-slate-400 uppercase">Voltar</button>
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
