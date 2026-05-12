
import React, { useState, useRef, useCallback } from 'react';
import { SILProgramacao } from '../../../types';
import { silExcelImporter } from '../../../utils/silExcelImporter';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: SILProgramacao[]) => void;
}

const TIPO_COLOR: Record<string, string> = {
  'exportação': 'bg-blue-100 text-blue-700',
  'importação':  'bg-emerald-100 text-emerald-700',
};

const SILExcelImporter: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
  const [rows, setRows] = useState<SILProgramacao[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Arquivo inválido. Selecione um arquivo Excel (.xlsx ou .xls).');
      return;
    }
    setLoading(true);
    setError('');
    setRows([]);
    setSelected(new Set());
    setFileName(file.name);
    try {
      const parsed = await silExcelImporter.parse(file);
      if (parsed.length === 0) {
        setError('Nenhuma programação encontrada. Verifique se o arquivo é a exportação correta do SIL.');
      } else {
        setRows(parsed);
        setSelected(new Set(parsed.map(r => r._rowIndex)));
      }
    } catch {
      setError('Erro ao ler o arquivo. Verifique se não está corrompido ou protegido por senha.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const toggleRow = (idx: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });
  };

  const toggleAll = () => {
    setSelected(prev => prev.size === rows.length ? new Set() : new Set(rows.map(r => r._rowIndex)));
  };

  const handleImport = () => {
    const toImport = rows.filter(r => selected.has(r._rowIndex));
    onImport(toImport);
    onClose();
    setRows([]);
    setSelected(new Set());
    setFileName('');
  };

  const reset = () => {
    setRows([]);
    setSelected(new Set());
    setFileName('');
    setError('');
  };

  if (!isOpen) return null;

  const allSelected = selected.size === rows.length && rows.length > 0;
  const tipoColor = (tipo: string) => TIPO_COLOR[tipo.toLowerCase()] || 'bg-slate-100 text-slate-600';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="bg-white w-full max-w-7xl rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
           style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="bg-[#001e50] px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-[#001e50] font-black text-sm italic">SIL</span>
            </div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-tight">Importar Programações do SIL</h3>
              <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest opacity-70 mt-0.5">
                Excel exportado pelo módulo de Programação Detalhada
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Drop zone / file selector */}
          {rows.length === 0 && (
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center gap-4 transition-all ${
                dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'
              }`}
            >
              <input ref={inputRef} type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFile} />

              {loading ? (
                <>
                  <svg className="w-10 h-10 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Lendo arquivo...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-black text-slate-700 uppercase tracking-tight">Arraste o arquivo aqui</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">ou clique para selecionar</p>
                    <p className="text-[9px] font-bold text-slate-300 mt-3 uppercase tracking-widest">Excel exportado pelo SIL · .xlsx ou .xls</p>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-black text-red-600 uppercase text-center">
              {error}
            </div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <>
              {/* File info + controles */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <span className="text-[9px] font-black text-emerald-700 uppercase">{fileName}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase">
                    {rows.length} programaç{rows.length !== 1 ? 'ões' : 'ão'} encontrada{rows.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <button onClick={reset} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors">
                  Trocar arquivo
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-[9px] min-w-[1400px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-3 text-left w-10">
                        <input type="checkbox" checked={allSelected} onChange={toggleAll}
                          className="rounded accent-blue-600 cursor-pointer w-3.5 h-3.5"/>
                      </th>
                      {[
                        'Nº Prog.', 'Tipo', 'Container', 'Tp. Cont.', 'Booking',
                        'Previsão Atend.', 'Situação',
                        'Motorista', 'CPF', 'Placa', 'Carreta',
                        'Cidade Atend.', 'Local Atend.', 'Embarcador', 'Navio', 'BL',
                      ].map(h => (
                        <th key={h} className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSelected = selected.has(row._rowIndex);
                      return (
                        <tr
                          key={row._rowIndex}
                          onClick={() => toggleRow(row._rowIndex)}
                          className={`border-b border-slate-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <input type="checkbox" checked={isSelected} onChange={() => toggleRow(row._rowIndex)}
                              onClick={e => e.stopPropagation()}
                              className="rounded accent-blue-600 cursor-pointer w-3.5 h-3.5"/>
                          </td>
                          <td className="px-3 py-2.5 font-black text-blue-700 whitespace-nowrap">{row.numeroProgramacao}</td>
                          <td className="px-3 py-2.5">
                            {row.tipoProgramado && (
                              <span className={`px-2 py-0.5 rounded-lg font-black uppercase text-[8px] ${tipoColor(row.tipoProgramado)}`}>
                                {row.tipoProgramado}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-mono font-black text-slate-800 whitespace-nowrap">{row.container}</td>
                          <td className="px-3 py-2.5 text-slate-500 font-bold">{row.tipoContainer}</td>
                          <td className="px-3 py-2.5 font-black text-slate-700 whitespace-nowrap">{row.booking}</td>
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{row.previsaoAtendimento}</td>
                          <td className="px-3 py-2.5">
                            {row.situacao && (
                              <span className={`px-2 py-0.5 rounded-lg font-black uppercase text-[8px] ${
                                row.situacao.toLowerCase().includes('encerr') ? 'bg-slate-100 text-slate-500' :
                                row.situacao.toLowerCase().includes('prazo') ? 'bg-emerald-100 text-emerald-700' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                {row.situacao}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-800 uppercase whitespace-nowrap max-w-[140px] truncate">{row.nomeMotorista}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-400">{row.cpfMotorista}</td>
                          <td className="px-3 py-2.5">
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-black text-[8px]">{row.placaVeiculo}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {row.placaCarreta && <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold text-[8px]">{row.placaCarreta}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 font-bold uppercase whitespace-nowrap">{row.cidadeAtendimento}</td>
                          <td className="px-3 py-2.5 text-slate-500 max-w-[120px] truncate">{row.nomeLocalAtendimento}</td>
                          <td className="px-3 py-2.5 text-slate-600 font-bold uppercase whitespace-nowrap">{row.embarcador}</td>
                          <td className="px-3 py-2.5 text-slate-500 font-bold uppercase whitespace-nowrap">{row.navio}</td>
                          <td className="px-3 py-2.5 font-mono text-slate-400">{row.bl}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase">
            {rows.length > 0 ? `${selected.size} de ${rows.length} selecionada${selected.size !== 1 ? 's' : ''}` : 'Nenhum arquivo carregado'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-2xl text-[10px] font-black text-slate-500 uppercase hover:bg-slate-100 transition-all">
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className="px-8 py-3 bg-[#001e50] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Importar {selected.size > 0 ? `${selected.size} Programaç${selected.size !== 1 ? 'ões' : 'ão'}` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SILExcelImporter;
