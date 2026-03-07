
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  hideInternalSearch?: boolean;
}

const SmartOperationTable: React.FC<SmartOperationTableProps> = ({
  userId,
  componentId,
  columns,
  data,
  title,
  defaultVisibleKeys,
  onRowClick,
  hideInternalSearch = false
}) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

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

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    const base = hideInternalSearch ? data : data.filter(row => {
      if (!row) return false;
      const searchStr = searchQuery.toLowerCase();
      
      return Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        
        if (typeof val === 'object') {
          try {
            return Object.values(val).some(v => 
              v !== null && v !== undefined && String(v).toLowerCase().includes(searchStr)
            );
          } catch (e) {
            return false;
          }
        }
        
        return String(val).toLowerCase().includes(searchStr);
      });
    });
    return base;
  }, [data, searchQuery, hideInternalSearch]);

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Resetar para página 1 ao filtrar
  useEffect(() => { setCurrentPage(1); }, [searchQuery, itemsPerPage]);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm animate-in fade-in duration-500 relative flex flex-col">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 rounded-t-[2.5rem]">
        <div className="z-10">
          {title && <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>}
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
            {filteredData.length} registros no total • Página {currentPage} de {totalPages}
          </p>
        </div>

        <div className="flex items-center gap-3 z-20">
          {/* Seletor de Itens por Página */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm shrink-0">
             <span className="text-[8px] font-black text-slate-400 uppercase">Exibir:</span>
             <select 
               className="text-[10px] font-black text-blue-600 outline-none bg-transparent cursor-pointer"
               value={itemsPerPage}
               onChange={(e) => setItemsPerPage(Number(e.target.value))}
             >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
             </select>
          </div>

          {!hideInternalSearch && (
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
          )}

          <div className="relative" ref={pickerRef}>
            <button 
              onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-all ${isColumnPickerOpen ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4h18M3 12h18M3 20h18" /></svg>
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

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px] border-collapse min-w-[1000px]">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest">
            <tr>
              {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                <th key={col.key} className="px-6 py-5 whitespace-nowrap">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {paginatedData.map((row, idx) => (
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

      {/* RODAPÉ COM CONTROLES DE PÁGINA */}
      <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between rounded-b-[2.5rem]">
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
           Exibindo {paginatedData.length} de {filteredData.length} registros
         </p>
         
         <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all active:scale-90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            
            <div className="flex gap-1">
               {/* Lógica simples de páginas */}
               {[...Array(Math.min(5, totalPages))].map((_, i) => {
                 // Mostra páginas ao redor da atual
                 let pageNum = currentPage > 3 ? currentPage - 2 + i : i + 1;
                 if (pageNum > totalPages) return null;
                 
                 return (
                   <button 
                     key={pageNum}
                     onClick={() => setCurrentPage(pageNum)}
                     className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                   >
                     {pageNum}
                   </button>
                 );
               })}
            </div>

            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-30 transition-all active:scale-90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
         </div>
      </div>
    </div>
  );
};

export default SmartOperationTable;
