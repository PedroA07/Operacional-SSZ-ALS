
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '../../../utils/storage';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: any) => any;
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
  getRowClassName?: (row: any) => string;
  getRowStyle?: (row: any) => React.CSSProperties;
  noMaxHeight?: boolean;
}

const SmartOperationTable: React.FC<SmartOperationTableProps> = ({
  userId,
  componentId,
  columns,
  data,
  title,
  defaultVisibleKeys,
  onRowClick,
  hideInternalSearch = false,
  getRowClassName,
  getRowStyle,
  noMaxHeight = false,
}) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

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

  const handleSort = (key: string) => {
    const column = columns.find(c => c.key === key);
    if (column && column.sortable === false) return;

    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setActiveFilterColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    let base = hideInternalSearch ? [...data] : data.filter(row => {
      if (!row) return false;
      const searchStr = searchQuery.toLowerCase();
      
      // Global search
      const matchesGlobal = Object.values(row).some(val => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          try {
            return Object.values(val).some(v => 
              v !== null && v !== undefined && String(v).toLowerCase().includes(searchStr)
            );
          } catch (e) { return false; }
        }
        return String(val).toLowerCase().includes(searchStr);
      });

      if (!matchesGlobal) return false;

      // Column filters
      return Object.entries(columnFilters).every(([key, filterVal]) => {
        if (!filterVal) return true;
        const column = columns.find(c => c.key === key);
        let val = column?.sortValue ? column.sortValue(row) : row[key];
        
        if (typeof val === 'object' && val !== null) {
          val = val.name || val.id || JSON.stringify(val);
        }
        
        return String(val || '').toLowerCase() === filterVal.toLowerCase();
      });
    });

    if (sortConfig) {
      const column = columns.find(c => c.key === sortConfig.key);
      base.sort((a, b) => {
        let aValue = column?.sortValue ? column.sortValue(a) : a[sortConfig.key];
        let bValue = column?.sortValue ? column.sortValue(b) : b[sortConfig.key];

        // Se for objeto aninhado (ex: customer.name), tenta extrair um valor representativo
        if (typeof aValue === 'object' && aValue !== null) {
          aValue = aValue.name || aValue.id || JSON.stringify(aValue);
        }
        if (typeof bValue === 'object' && bValue !== null) {
          bValue = bValue.name || bValue.id || JSON.stringify(bValue);
        }

        if (aValue === bValue) return 0;
        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();

        if (aString < bString) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aString > bString) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return base;
  }, [data, searchQuery, hideInternalSearch, sortConfig]);

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Resetar para página 1 ao filtrar
  useEffect(() => { setCurrentPage(1); }, [searchQuery, columnFilters, itemsPerPage]);

  const getUniqueValues = (key: string) => {
    const column = columns.find(c => c.key === key);
    const values = data.map(row => {
      let val = column?.sortValue ? column.sortValue(row) : row[key];
      if (typeof val === 'object' && val !== null) {
        val = val.name || val.id || JSON.stringify(val);
      }
      return String(val || '');
    }).filter(v => v.trim() !== '');
    return Array.from(new Set(values)).sort();
  };

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

      <div className={`overflow-x-auto custom-scrollbar border-y border-slate-200 ${noMaxHeight ? '' : 'max-h-[600px] overflow-y-auto'}`}>
        <table className="w-full text-left text-[10px] border-collapse min-w-[1000px]">
          <thead className="bg-slate-100 text-slate-500 font-black uppercase tracking-widest sticky top-0 z-20 shadow-sm">
            <tr>
              {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                <th 
                  key={col.key} 
                  className={`px-2 py-1.5 whitespace-nowrap border border-slate-200 bg-slate-100 text-left relative group/th ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-200 transition-colors' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 flex-1" onClick={() => col.sortable !== false && handleSort(col.key)}>
                      {col.label}
                      {col.sortable !== false && (
                        <div className="flex flex-col opacity-30 group-hover/th:opacity-100">
                          <svg className={`w-2 h-2 ${sortConfig?.key === col.key && sortConfig.direction === 'asc' ? 'text-blue-600 opacity-100' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"/></svg>
                          <svg className={`w-2 h-2 -mt-0.5 ${sortConfig?.key === col.key && sortConfig.direction === 'desc' ? 'text-blue-600 opacity-100' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
                        </div>
                      )}
                    </div>

                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => setActiveFilterColumn(activeFilterColumn === col.key ? null : col.key)}
                        className={`p-1 rounded hover:bg-slate-300 transition-colors ${columnFilters[col.key] ? 'text-blue-600' : 'text-slate-400'}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                      </button>

                      {activeFilterColumn === col.key && (
                        <div ref={filterRef} className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-[110] p-3 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Filtrar Valor</span>
                            <button onClick={() => {
                              const newFilters = {...columnFilters};
                              delete newFilters[col.key];
                              setColumnFilters(newFilters);
                              setActiveFilterColumn(null);
                            }} className="text-[7px] font-black text-red-500 uppercase hover:underline">Limpar</button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
                            {getUniqueValues(col.key).map(val => (
                              <button 
                                key={val}
                                onClick={() => {
                                  setColumnFilters({...columnFilters, [col.key]: val});
                                  setActiveFilterColumn(null);
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded-lg text-[9px] font-bold truncate hover:bg-slate-50 transition-colors ${columnFilters[col.key] === val ? 'bg-blue-50 text-blue-600' : 'text-slate-600'}`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {paginatedData.map((row, idx) => (
              <tr 
                key={row.id || idx} 
                onClick={() => onRowClick?.(row)}
                className={`group transition-all ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${onRowClick ? 'cursor-pointer hover:bg-blue-50/40' : 'hover:bg-slate-50/50'} ${getRowClassName ? getRowClassName(row) : ''}`}
                style={getRowStyle ? getRowStyle(row) : {}}
              >
                {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                  <td key={col.key} className="px-2 py-1 text-slate-600 border border-slate-200 align-middle">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="px-3 py-10 text-center text-slate-400 font-bold uppercase italic bg-white border border-slate-200">
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
