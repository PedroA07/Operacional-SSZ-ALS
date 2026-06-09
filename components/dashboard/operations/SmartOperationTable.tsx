
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../../../utils/storage';
import CustomSelect from '../../shared/CustomSelect';

interface Column {
  key: string;
  label: string;
  render?: (row: any) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: any) => any;
  width?: number | string; // largura fixa em px ou string CSS
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
  stickyHeaderTop?: number;
  draggableRows?: boolean;
  onRowDragStart?: (row: any, index: number) => void;
  onRowDragOver?: (e: React.DragEvent, index: number) => void;
  onRowDrop?: (e: React.DragEvent, index: number) => void;
  dragOverIndex?: number | null;
}

const SmartOperationTable: React.FC<SmartOperationTableProps> = ({
  userId,
  componentId,
  draggableRows,
  onRowDragStart,
  onRowDragOver,
  onRowDrop,
  dragOverIndex,
  columns,
  data,
  title,
  defaultVisibleKeys,
  onRowClick,
  hideInternalSearch = false,
  getRowClassName,
  getRowStyle,
  noMaxHeight = false,
  stickyHeaderTop
}) => {
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  // Estados de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

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

  // Debounce search — evita filtrar 1000 linhas a cada tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Pré-computa valores únicos por coluna uma única vez quando data muda
  const uniqueValuesMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    columns.forEach(col => {
      const seen = new Set<string>();
      data.forEach(row => {
        let val = col.sortValue ? col.sortValue(row) : row[col.key];
        if (typeof val === 'object' && val !== null) val = val.name || val.id || '';
        const s = String(val || '').trim();
        if (s) seen.add(s);
      });
      map[col.key] = Array.from(seen).sort();
    });
    return map;
  }, [data, columns]);

  const getUniqueValues = useCallback((key: string) => uniqueValuesMap[key] ?? [], [uniqueValuesMap]);

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    
    const searchStr = debouncedSearch.toLowerCase();
    let base = hideInternalSearch ? [...data] : data.filter(row => {
      if (!row) return false;

      // Global search — só itera se há query
      if (searchStr) {
        const matchesGlobal = Object.values(row).some(val => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            try { return Object.values(val).some(v => v != null && String(v).toLowerCase().includes(searchStr)); }
            catch { return false; }
          }
          return String(val).toLowerCase().includes(searchStr);
        });
        if (!matchesGlobal) return false;
      }

      // Column filters
      if (Object.keys(columnFilters).length === 0) return true;
      return Object.entries(columnFilters).every(([key, filterVal]) => {
        if (!filterVal) return true;
        const column = columns.find(c => c.key === key);
        let val = column?.sortValue ? column.sortValue(row) : row[key];
        if (typeof val === 'object' && val !== null) val = val.name || val.id || '';
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
  }, [data, debouncedSearch, columnFilters, hideInternalSearch, sortConfig, columns]);

  // Lógica de Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  // Resetar para página 1 ao filtrar
  useEffect(() => { setCurrentPage(1); }, [searchQuery, columnFilters, itemsPerPage]);

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
             <CustomSelect
               value={String(itemsPerPage)}
               onChange={(v) => setItemsPerPage(Number(v))}
               options={[
                 { value: '100', label: '100' },
                 { value: '500', label: '500' },
                 { value: '1000', label: '1000' },
               ]}
               inputClassName="text-[10px] font-black text-blue-600 outline-none bg-transparent cursor-pointer"
             />
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
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
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

      {/* noMaxHeight: sem overflow no wrapper para o sticky funcionar relativo ao scroll do pai */}
      <div className={`${noMaxHeight ? '' : 'overflow-auto max-h-[calc(100vh-300px)]'} custom-scrollbar border-y border-slate-200`}>
        <table className="w-full text-left text-[10px] border-collapse min-w-[1000px]">
          <thead
            className="bg-slate-100 text-slate-500 font-black uppercase tracking-widest z-20 shadow-sm sticky"
            style={{ top: noMaxHeight ? (stickyHeaderTop ?? 56) : 0 }}
          >
            <tr>
              {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                <th
                  key={col.key}
                  style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width, minWidth: typeof col.width === 'number' ? `${col.width}px` : col.width, maxWidth: typeof col.width === 'number' ? `${col.width}px` : col.width } : undefined}
                  className={`px-2 py-2 whitespace-nowrap border-b-2 border-slate-200 bg-slate-50 text-left relative group/th transition-colors ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-100' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 flex-1" onClick={() => col.sortable !== false && handleSort(col.key)}>
                      {col.label}
                      {col.sortable !== false && (
                        <div className="flex flex-col opacity-40 group-hover/th:opacity-100 transition-all duration-150">
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
                draggable={draggableRows}
                onDragStart={draggableRows ? (e) => { e.dataTransfer.effectAllowed = 'move'; onRowDragStart?.(row, idx); } : undefined}
                onDragOver={draggableRows ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onRowDragOver?.(e, idx); } : undefined}
                onDrop={draggableRows ? (e) => { e.preventDefault(); onRowDrop?.(e, idx); } : undefined}
                className={`group transition-all ${draggableRows ? 'cursor-grab active:cursor-grabbing' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} ${dragOverIndex === idx ? 'bg-blue-50 border-t-2 border-t-blue-400' : ''} ${onRowClick ? 'hover:bg-blue-50/40' : 'hover:bg-slate-50/50'} ${getRowClassName ? getRowClassName(row) : ''}`}
                style={getRowStyle ? getRowStyle(row) : {}}
              >
                {columns.filter(c => visibleColumns.includes(c.key)).map(col => (
                  <td key={col.key} style={col.width ? { width: typeof col.width === 'number' ? `${col.width}px` : col.width, maxWidth: typeof col.width === 'number' ? `${col.width}px` : col.width, overflow: 'hidden' } : undefined} className="px-2 py-1.5 text-slate-600 border-b border-slate-100 align-middle">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="py-16 text-center bg-white">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      </svg>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum registro encontrado</p>
                    {(debouncedSearch || Object.keys(columnFilters).length > 0) && (
                      <button
                        onClick={() => { setSearchQuery(''); setColumnFilters({}); }}
                        className="text-[9px] font-black text-blue-500 uppercase hover:text-blue-700 transition-colors underline underline-offset-2"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* RODAPÉ COM CONTROLES DE PÁGINA */}
      <div className="px-6 py-4 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between rounded-b-[2.5rem] gap-4 flex-wrap">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">
          {filteredData.length === 0 ? '0 registros' : `${(currentPage - 1) * itemsPerPage + 1}–${Math.min(currentPage * itemsPerPage, filteredData.length)} de ${filteredData.length}`}
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-25 transition-all active:scale-90"
              title="Primeira página"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-25 transition-all active:scale-90"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <div className="flex gap-1">
              {(() => {
                const pages: (number | '...')[] = [];
                if (totalPages <= 7) {
                  for (let i = 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  if (currentPage > 3) pages.push('...');
                  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
                  if (currentPage < totalPages - 2) pages.push('...');
                  pages.push(totalPages);
                }
                return pages.map((p, i) =>
                  p === '...' ? (
                    <span key={`e-${i}`} className="w-8 h-8 flex items-center justify-center text-[10px] text-slate-300">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === p ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600'}`}
                    >
                      {p}
                    </button>
                  )
                );
              })()}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-25 transition-all active:scale-90"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-blue-600 disabled:opacity-25 transition-all active:scale-90"
              title="Última página"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M6 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartOperationTable;
