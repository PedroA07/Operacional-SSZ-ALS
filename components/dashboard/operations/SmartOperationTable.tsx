
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../utils/storage';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  sortable?: boolean;
}

interface SmartOperationTableProps {
  userId: string;
  componentId: string;
  columns: Column[];
  data: any[];
  title?: string;
  defaultVisibleKeys?: string[];
  onRowClick?: (row: any) => void;
}

const SmartOperationTable: React.FC<SmartOperationTableProps> = ({
  userId,
  componentId,
  columns,
  data,
  title,
  defaultVisibleKeys,
  onRowClick
}) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefs = db.getPreferences(userId);
    const saved = prefs.visibleColumns[componentId];
    if (saved && saved.length > 0) {
      setVisibleColumns(saved);
    } else {
      setVisibleColumns(defaultVisibleKeys || columns.map(c => c.key));
    }
  }, [userId, componentId, defaultVisibleKeys, columns]);

  const toggleColumn = (key: string) => {
    const newCols = visibleColumns.includes(key)
      ? visibleColumns.filter(c => c !== key)
      : [...visibleColumns, key];
    if (newCols.length === 0) return;
    setVisibleColumns(newCols);
    db.savePreference(userId, componentId, newCols);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsColumnPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredData = data.filter(row => {
    const searchStr = searchQuery.toLowerCase();
    return Object.values(row).some(val => {
      if (typeof val === 'object' && val !== null) {
        return Object.values(val).some(v => String(v).toLowerCase().includes(searchStr));
      }
      return String(val).toLowerCase().includes(searchStr);
    });
  });

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in duration-500 relative">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 rounded-t-[2.5rem]">
        <div className="z-10">
          {title && <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>}
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{filteredData.length} registros exibidos</p>
        </div>

        <div className="flex items-center gap-3 z-20">
          <div className="relative">
            <input 
              type="text" 
              placeholder="BUSCAR..." 
              className="pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-[10px] font-bold uppercase focus:border-blue-500 focus:bg-white outline-none w-48 transition-all bg-slate-100/50"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>

          <div className="relative" ref={pickerRef}>
            <button 
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${isColumnPickerOpen ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              <span className="text-[9px] font-black uppercase tracking-widest">Colunas</span>
            </button>

            {isColumnPickerOpen && (
              <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[100] p-5 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Exibição</p>
                  <button onClick={() => setVisibleColumns(columns.map(c => c.key))} className="text-[8px] font-black text-blue-600 uppercase hover:underline">Resetar</button>
                </div>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {columns.map(col => (
                    <button 
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-blue-50 transition-all group"
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 transition-all flex items-center justify-center ${visibleColumns.includes(col.key) ? 'bg-blue-600 border-blue-600 shadow-sm' : 'bg-white border-slate-200'}`}>
                        {visibleColumns.includes(col.key) && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                      </div>
                      <span className={`text-[10px] font-black uppercase text-left transition-colors flex-1 ${visibleColumns.includes(col.key) ? 'text-slate-800' : 'text-slate-400'}`}>
                        {col.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-b-[2.5rem]">
        <table className="w-full text-left text-[10px] border-collapse min-w-[1000px]">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
            <tr>
              {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                <th key={col.key} className="px-6 py-5 whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredData.map((row, idx) => (
              <tr 
                key={row.id || idx} 
                onClick={() => onRowClick?.(row)}
                className={`group transition-all ${onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-slate-50/50'}`}
              >
                {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                  <td key={col.key} className="px-6 py-5 text-slate-600">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="px-6 py-20 text-center text-slate-300 font-bold uppercase italic bg-white">
                  Nenhum registro localizado para os critérios atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SmartOperationTable;
