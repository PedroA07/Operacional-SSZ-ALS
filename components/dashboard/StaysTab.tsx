
import React, { useState, useMemo, useRef } from 'react';
import { Trip, Category, StatusHistoryEntry, User } from '../../types';
import SmartOperationTable from './operations/SmartOperationTable';
import * as XLSX from 'xlsx';
import { stayImporter } from '../../utils/stayImporter';
import { db } from '../../utils/storage';

interface StaysTabProps {
  trips: Trip[];
  categories: Category[];
  userId: string;
}

const StaysTab: React.FC<StaysTabProps> = ({ trips, categories, userId }) => {
  const [activeCategory, setActiveCategory] = useState<string>('Aliança');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(trips.map(t => t.category).filter(Boolean)));
    // Garante que Aliança e Mercosul apareçam mesmo sem dados
    const baseCats = ['Aliança', 'Mercosul', 'Indústria'];
    const combined = Array.from(new Set([...baseCats, ...cats]));
    return combined;
  }, [trips]);

  const filteredTrips = useMemo(() => {
    return trips.filter(t => t.category === activeCategory);
  }, [trips, activeCategory]);

  const getStatusTime = (history: StatusHistoryEntry[], statusName: string): string => {
    const entry = history?.find(h => h.status === statusName);
    if (!entry) return '---';
    const date = new Date(entry.dateTime);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const handleExportXLSX = () => {
    const data = filteredTrips.map(t => ({
      'MODALIDADE + OS': `${t.type} - ${t.os}`,
      'LOCAL ATENDIMENTO': t.scheduling?.location || t.destination?.name || 'A DEFINIR',
      'MOTORISTA': t.driver.name,
      'NAVIO': t.ship || '---',
      'CONTAINER': t.container || '---',
      'PREVISÃO INÍCIO': new Date(t.dateTime).toLocaleString('pt-BR'),
      'CHEGADA LOCAL': getStatusTime(t.statusHistory, 'Chegou no cliente'),
      'SAÍDA LOCAL': getStatusTime(t.statusHistory, 'Saiu do cliente')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estadias " + activeCategory);
    
    XLSX.writeFile(wb, `ALS_ESTADIAS_${activeCategory.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const session = sessionStorage.getItem('als_active_session');
      const user: User = session ? JSON.parse(session) : { id: userId, displayName: 'Sistema' };
      
      const result = await stayImporter.processExcel(file, activeCategory, user);
      
      await db.addNotification(
        user, 
        'SYSTEM', 
        'Importação de Estadias', 
        `Concluída para ${activeCategory}: ${result.added} adicionados, ${result.skipped} duplicados ignorados.`,
        { os: 'IMPORT' }
      );

      // Força refresh dos dados no Dashboard.tsx
      window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
      
      alert(`Importação Concluída!\n\nRegistros Novos: ${result.added}\nJá existiam (Ignorados): ${result.skipped}`);
    } catch (err) {
      console.error(err);
      alert("Falha ao processar arquivo. Verifique se o formato está correto.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const columns = [
    { 
      key: 'os_info', 
      label: 'Modalidade + OS', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="text-[7px] font-black text-blue-500 uppercase">{t.type}</span>
          <span className="font-black text-slate-800 text-[11px]">{t.os}</span>
        </div>
      )
    },
    { 
      key: 'local', 
      label: 'Local Atendimento', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-700 uppercase">
            {t.scheduling?.location || t.destination?.name || 'A DEFINIR'}
          </span>
          <span className="text-[8px] text-slate-400 font-bold uppercase">{t.customer.name}</span>
        </div>
      )
    },
    { key: 'driver', label: 'Motorista', render: (t: Trip) => <span className="font-bold text-[10px] uppercase text-slate-600">{t.driver.name}</span> },
    { key: 'ship', label: 'Navio', render: (t: Trip) => <span className="font-bold text-[10px] uppercase text-blue-600">{t.ship || '---'}</span> },
    { key: 'container', label: 'Container', render: (t: Trip) => <span className="font-mono font-black text-[10px] text-slate-800">{t.container || '---'}</span> },
    { 
      key: 'scheduled', 
      label: 'Previsão Início', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-700 text-[10px]">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className="text-blue-500 font-bold text-[9px]">{new Date(t.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
      )
    },
    { 
      key: 'arrival', 
      label: 'Chegada Local', 
      render: (t: Trip) => (
        <span className="font-black text-emerald-600 text-[10px]">{getStatusTime(t.statusHistory, 'Chegou no cliente')}</span>
      )
    },
    { 
      key: 'departure', 
      label: 'Saída Local', 
      render: (t: Trip) => (
        <span className="font-black text-red-600 text-[10px]">{getStatusTime(t.statusHistory, 'Saiu do cliente')}</span>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Relatório de Estadias</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1">Análise de Permanência em Terminais e Clientes</p>
          </div>
          <div className="flex gap-3">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileImport} />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isImporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              )}
              {isImporting ? 'Processando...' : 'Importar Planilha'}
            </button>
            <button 
              onClick={handleExportXLSX}
              className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-3 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Exportar (.XLSX)
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 mt-8 border-t border-slate-100 pt-8">
           {availableCategories.map(cat => (
             <button 
               key={cat} 
               onClick={() => setActiveCategory(cat)}
               className={`px-8 py-3.5 rounded-[1.4rem] text-[10px] font-black uppercase transition-all border ${activeCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'}`}
             >
               {cat}
             </button>
           ))}
        </div>
      </div>

      <SmartOperationTable 
        userId={userId}
        componentId={`stays-${activeCategory}`}
        title={`Análise de Tempos - ${activeCategory}`}
        data={filteredTrips}
        columns={columns}
      />
    </div>
  );
};

export default StaysTab;
