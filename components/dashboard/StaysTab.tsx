
import React, { useState, useMemo, useRef } from 'react';
import { Trip, Category, StatusHistoryEntry, User } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import * as XLSX from 'xlsx';
import { stayImporter } from '../../utils/stayImporter';
import { stayCalculations } from '../../utils/stayCalculations';
import { db } from '../../utils/storage';

interface StaysTabProps {
  trips: Trip[];
  categories: Category[];
  userId: string;
}

const StaysTab: React.FC<StaysTabProps> = ({ userId }) => {
  const [activeCategory, setActiveCategory] = useState<string>('GERAL');
  const [isImporting, setIsImporting] = useState(false);
  const [importedStays, setImportedStays] = useState<Trip[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(importedStays.map(t => t.category).filter(Boolean)));
    return ['GERAL', ...cats.sort()];
  }, [importedStays]);

  const filteredData = useMemo(() => {
    if (activeCategory === 'GERAL') return importedStays;
    return importedStays.filter(t => t.category === activeCategory);
  }, [importedStays, activeCategory]);

  const handleClear = () => {
    if (confirm("Deseja limpar todos os dados importados desta tela?")) {
      setImportedStays([]);
      setActiveCategory('GERAL');
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const session = sessionStorage.getItem('als_active_session');
      const user: User = session ? JSON.parse(session) : { id: userId, displayName: 'Operacional' };
      const result = await stayImporter.processExcelAndReturn(file, user);
      setImportedStays(result.data);
      setActiveCategory('GERAL');
    } catch (err) {
      alert("Erro ao importar. Verifique o padrão do arquivo.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const columns = [
    { 
      key: 'os_info', 
      label: 'Tipo / OS', 
      render: (t: Trip) => (
        <div className="flex flex-col min-w-[100px]">
          <span className="text-[7px] font-black text-blue-600 uppercase leading-none">{t.type}</span>
          <span className="font-black text-slate-900 text-[10px] mt-0.5">{t.os}</span>
        </div>
      )
    },
    { 
      key: 'local', 
      label: 'Atendimento', 
      render: (t: Trip) => (
        <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[150px] block">
          {t.scheduling?.location || '---'}
        </span>
      )
    },
    { 
      key: 'resource', 
      label: 'Recurso / Equipamento', 
      render: (t: Trip) => (
        <div className="flex flex-col min-w-[130px]">
          <span className="font-bold text-[9px] uppercase text-slate-500 truncate">{t.driver.name}</span>
          <div className="flex gap-2 mt-0.5">
            <span className="text-[8px] font-black text-blue-500">{t.container || '---'}</span>
            <span className="text-[8px] font-bold text-slate-400 italic truncate">{t.ship || ''}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'scheduled', 
      label: 'Previsão', 
      render: (t: Trip) => (
        <div className="flex flex-col items-center min-w-[70px]">
          <span className="font-black text-slate-700 text-[10px]">{new Date(t.dateTime).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</span>
          <span className="text-blue-500 font-bold text-[9px]">{new Date(t.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
      )
    },
    { 
      key: 'io_times', 
      label: 'Janela (Entrada / Saída)', 
      render: (t: Trip) => {
        const inEntry = t.statusHistory.find(h => h.status === 'Chegou no cliente');
        const outEntry = t.statusHistory.find(h => h.status === 'Saiu do cliente');
        return (
          <div className="flex items-center gap-2 min-w-[140px] bg-slate-50 p-1.5 rounded-lg border border-slate-100">
             <div className="flex flex-col text-center flex-1">
                <span className="text-[6px] font-black text-slate-400 uppercase">Chegada</span>
                <span className="text-[9px] font-black text-emerald-600">
                  {inEntry ? new Date(inEntry.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                </span>
             </div>
             <div className="w-[1px] h-6 bg-slate-200"></div>
             <div className="flex flex-col text-center flex-1">
                <span className="text-[6px] font-black text-slate-400 uppercase">Saída</span>
                <span className="text-[9px] font-black text-red-600">
                  {outEntry ? new Date(outEntry.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}) : '--:--'}
                </span>
             </div>
          </div>
        );
      }
    },
    { 
      key: 'on_time', 
      label: 'Prazo', 
      render: (t: Trip) => {
        const { onTime, diffMinutes } = stayCalculations.isArrivedOnTime(t.dateTime, t.statusHistory);
        if (!t.statusHistory.some(h => h.status === 'Chegou no cliente')) return <span className="text-[8px] text-slate-300 italic">---</span>;
        return (
          <div className="flex flex-col items-center">
            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${onTime ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {onTime ? 'OK' : 'ATRASO'}
            </span>
            {!onTime && <span className="text-[7px] font-bold text-red-400 mt-0.5">+{diffMinutes}m</span>}
          </div>
        );
      }
    },
    { 
      key: 'stay_duration', 
      label: 'Estadia', 
      render: (t: Trip) => {
        const details = stayCalculations.getStayDetails(t.dateTime, t.statusHistory);
        return (
          <div className="flex flex-col items-center min-w-[60px]">
            <span className={`text-[10px] font-black ${details.isExceeded ? 'text-red-600' : 'text-slate-700'}`}>
              {details.text}
            </span>
            {details.isExceeded && (
              <span className="text-[7px] bg-red-600 text-white px-1 rounded font-black uppercase mt-0.5 animate-pulse">Excedido</span>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Análise de Estadias</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Conformidade de Janelas e Permanência</p>
          </div>
          <div className="flex gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-5 py-3.5 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isImporting ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>}
              Importar
            </button>
            {importedStays.length > 0 && (
              <button 
                onClick={handleClear}
                className="px-5 py-3.5 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white transition-all active:scale-95"
              >
                Limpar Lista
              </button>
            )}
          </div>
        </div>

        {importedStays.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 mt-6 border-t border-slate-50 pt-6">
             {availableCategories.map(cat => (
               <button 
                 key={cat} 
                 onClick={() => setActiveCategory(cat)}
                 className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border ${activeCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
               >
                 {cat}
               </button>
             ))}
          </div>
        )}
      </div>

      {importedStays.length > 0 ? (
        <div className="stay-table-compact">
          <SmartOperationTable 
            userId={userId}
            componentId={`stays-v3-${activeCategory}`}
            title={`Monitoramento ${activeCategory}`}
            data={filteredData}
            columns={columns}
          />
        </div>
      ) : (
        <div className="bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 py-24 text-center">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Aguardando planilha de estadias...</p>
        </div>
      )}

      <style>{`
        .stay-table-compact table td { padding: 0.75rem 0.5rem !important; }
        .stay-table-compact table th { padding: 0.75rem 0.5rem !important; }
      `}</style>
    </div>
  );
};

export default StaysTab;
