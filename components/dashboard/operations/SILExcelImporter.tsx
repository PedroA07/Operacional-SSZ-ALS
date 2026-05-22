
import React, { useState, useRef, useCallback } from 'react';
import { SILProgramacao, Trip } from '../../../types';
import { silExcelImporter } from '../../../utils/silExcelImporter';

interface MatchedRow {
  sil: SILProgramacao;
  trip: Trip | null;       // null = sem correspondência no sistema
  alreadyImported: boolean; // OS já foi importada nesta sessão
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trips: Trip[];
  importedOs: Set<string>;  // OS já importados (deduplicação entre sessões)
  onImport: (matched: { sil: SILProgramacao; trip: Trip }[], unmatched: SILProgramacao[]) => void;
}

const SILExcelImporter: React.FC<Props> = ({ isOpen, onClose, trips, importedOs, onImport }) => {
  const [rows, setRows] = useState<MatchedRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Mapa OS → trip para busca rápida (case-insensitive, sem espaços)
  const tripsByOs = useCallback(() => {
    const m = new Map<string, Trip>();
    trips.forEach(t => m.set(t.os.trim().toLowerCase(), t));
    return m;
  }, [trips]);

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
        setError('Nenhuma programação encontrada. Verifique se é a exportação correta do SIL.');
      } else {
        const osMap = tripsByOs();
        const matched: MatchedRow[] = parsed.map(sil => {
          const key = sil.numeroProgramacao.trim().toLowerCase();
          const trip = osMap.get(key) || null;
          // alreadyImported só bloqueia SEM OS (evita criar a mesma trip duas vezes)
          // VINCULADAS podem sempre ser re-importadas para atualizar dados
          const alreadyImported = !trip && importedOs.has(key);
          return { sil, trip, alreadyImported };
        });
        setRows(matched);
        // Padrão: seleciona apenas SEM OS (serão criadas como novas trips)
        setSelected(new Set(matched.filter(r => !r.alreadyImported && !r.trip).map(r => r.sil._rowIndex)));
      }
    } catch {
      setError('Erro ao ler o arquivo. Verifique se não está corrompido ou protegido por senha.');
    } finally {
      setLoading(false);
    }
  }, [trips, importedOs, tripsByOs]);

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

  const toggle = (idx: number) => setSelected(prev => {
    const n = new Set(prev);
    n.has(idx) ? n.delete(idx) : n.add(idx);
    return n;
  });

  const toggleAll = () => {
    const selectable = rows.filter(r => !r.alreadyImported).map(r => r.sil._rowIndex);
    setSelected(prev => prev.size === selectable.length ? new Set() : new Set(selectable));
  };

  const handleImport = () => {
    const chosenRows = rows.filter(r => selected.has(r.sil._rowIndex));
    const matched  = chosenRows.filter(r => r.trip !== null) as { sil: SILProgramacao; trip: Trip; alreadyImported: boolean }[];
    const unmatched = chosenRows.filter(r => r.trip === null).map(r => r.sil);
    onImport(matched, unmatched);
    onClose();
    reset();
  };

  const reset = () => { setRows([]); setSelected(new Set()); setFileName(''); setError(''); };

  if (!isOpen) return null;

  const stats = {
    total:    rows.length,
    vinculado: rows.filter(r => r.trip !== null).length,
    sem:      rows.filter(r => r.trip === null).length,
    dupli:    rows.filter(r => r.alreadyImported).length,
  };

  const selectable = rows.filter(r => !r.alreadyImported);
  const allSelectable = selectable.length;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="bg-white w-full max-w-7xl rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
           style={{ maxHeight: '92vh' }}>

        {/* Header */}
        <div className="bg-[#001e50] px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-[#001e50] font-black text-sm italic">SIL</span>
            </div>
            <div>
              <h3 className="font-black text-white text-base uppercase tracking-tight">Importar Programações do SIL</h3>
              <p className="text-[9px] font-bold text-blue-200 opacity-70 uppercase tracking-widest mt-0.5">
                Vinculação automática por Nº OS · sem duplicatas
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* Drop zone */}
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
                  <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Lendo e vinculando...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-[13px] font-black text-slate-700 uppercase tracking-tight">Arraste o arquivo Excel aqui</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">ou clique para selecionar · .xlsx ou .xls</p>
                    <p className="text-[9px] font-bold text-slate-300 mt-3 uppercase tracking-widest">Exportado pelo módulo de Programação Detalhada do SIL</p>
                  </div>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[10px] font-black text-red-600 uppercase text-center">{error}</div>
          )}

          {/* Resumo de matching */}
          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4"/></svg>
                  <span className="text-[9px] font-black text-emerald-700 uppercase">{stats.vinculado} vinculadas ao sistema</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span className="text-[9px] font-black text-amber-700 uppercase">{stats.sem} sem OS no sistema</span>
                </div>
                {stats.dupli > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                    <span className="text-[9px] font-black text-slate-500 uppercase">{stats.dupli} já importadas</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase">{fileName}</span>
                  <button onClick={reset} className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase transition-colors">Trocar</button>
                </div>
              </div>

              {/* Tabela preview */}
              <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-[9px] min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-3 text-left w-10">
                        <input type="checkbox"
                          checked={selected.size === allSelectable && allSelectable > 0}
                          onChange={toggleAll}
                          className="rounded accent-blue-600 cursor-pointer w-3.5 h-3.5"/>
                      </th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Nº OS (SIL)</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tipo</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Trip no sistema</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Container</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Booking</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Motorista SIL</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Placa SIL</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Navio</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">BL</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Cidade</th>
                      <th className="px-3 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Previsão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const { sil, trip, alreadyImported } = row;
                      const isSelected = selected.has(sil._rowIndex);
                      const isLinked = trip !== null;

                      return (
                        <tr
                          key={sil._rowIndex}
                          onClick={() => !alreadyImported && toggle(sil._rowIndex)}
                          className={`border-b border-slate-50 transition-colors ${
                            alreadyImported ? 'opacity-40 cursor-not-allowed bg-slate-50' :
                            isSelected ? 'bg-blue-50/60 hover:bg-blue-50 cursor-pointer' :
                            'bg-white hover:bg-slate-50 cursor-pointer'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-2.5">
                            <input type="checkbox" checked={isSelected} disabled={alreadyImported}
                              onChange={() => !alreadyImported && toggle(sil._rowIndex)}
                              onClick={e => e.stopPropagation()}
                              className="rounded accent-blue-600 cursor-pointer w-3.5 h-3.5 disabled:cursor-not-allowed"/>
                          </td>

                          {/* Status badge */}
                          <td className="px-3 py-2.5">
                            {alreadyImported ? (
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-400 font-black text-[8px] uppercase">Já importada</span>
                            ) : isLinked ? (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-black text-[8px] uppercase whitespace-nowrap">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                                Vinculada
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-black text-[8px] uppercase whitespace-nowrap">Sem OS</span>
                            )}
                          </td>

                          {/* OS SIL */}
                          <td className="px-3 py-2.5 font-black text-blue-700 whitespace-nowrap">{sil.numeroProgramacao}</td>

                          {/* Tipo */}
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-lg font-black text-[8px] uppercase ${
                              sil.tipoProgramado.toLowerCase().includes('export') ? 'bg-blue-100 text-blue-700' :
                              sil.tipoProgramado.toLowerCase().includes('import') ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>{sil.tipoProgramado}</span>
                          </td>

                          {/* Trip vinculada no sistema */}
                          <td className="px-3 py-2.5">
                            {trip ? (
                              <div className="flex flex-col">
                                <span className="font-black text-slate-800 text-[9px] uppercase">{trip.driver?.name}</span>
                                <span className="text-[8px] text-slate-400 font-bold">{trip.category} · {trip.type}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300 italic text-[8px]">—</span>
                            )}
                          </td>

                          {/* Container */}
                          <td className="px-3 py-2.5 font-mono font-black text-slate-800 whitespace-nowrap">{sil.container}</td>

                          {/* Booking */}
                          <td className="px-3 py-2.5 font-bold text-slate-700 whitespace-nowrap">{sil.booking}</td>

                          {/* Motorista SIL */}
                          <td className="px-3 py-2.5 font-bold text-slate-800 uppercase whitespace-nowrap max-w-[130px] truncate">{sil.nomeMotorista}</td>

                          {/* Placa SIL */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-black text-[8px]">{sil.placaVeiculo}</span>
                          </td>

                          {/* Navio */}
                          <td className="px-3 py-2.5 font-bold text-slate-600 uppercase whitespace-nowrap">{sil.navio}</td>

                          {/* BL */}
                          <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">{sil.bl}</td>

                          {/* Cidade */}
                          <td className="px-3 py-2.5 text-slate-600 font-bold uppercase whitespace-nowrap">{sil.cidadeAtendimento}</td>

                          {/* Previsão */}
                          <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{sil.previsaoAtendimento}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Aviso de substituição quando VINCULADAS estão selecionadas */}
        {(() => {
          const vinculadasSelecionadas = rows.filter(r => selected.has(r.sil._rowIndex) && !!r.trip).length;
          if (!vinculadasSelecionadas) return null;
          return (
            <div className="mx-8 mb-0 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 shrink-0">
              <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
              <p className="text-[9px] font-black text-amber-700 uppercase leading-relaxed">
                <span className="text-amber-900">{vinculadasSelecionadas} programaç{vinculadasSelecionadas !== 1 ? 'ões vinculadas' : 'ão vinculada'} selecionada{vinculadasSelecionadas !== 1 ? 's' : ''}</span>
                {' — '}ao importar, os dados cadastrados dessas OS serão substituídos pelas informações da planilha.
              </p>
            </div>
          );
        })()}

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase">
            {rows.length > 0 ? (() => {
              const sel = rows.filter(r => selected.has(r.sil._rowIndex));
              const toCreate = sel.filter(r => !r.trip).length;
              const toUpdate = sel.filter(r => !!r.trip).length;
              const parts = [];
              if (toCreate) parts.push(`${toCreate} serão criadas`);
              if (toUpdate) parts.push(`${toUpdate} atualizarão existentes`);
              return `${selected.size} selecionada${selected.size !== 1 ? 's' : ''} · ${parts.join(' · ') || 'nenhuma ação'}`;
            })() : 'Nenhum arquivo carregado'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-3 rounded-2xl text-[10px] font-black text-slate-500 uppercase hover:bg-slate-100 transition-all">
              Cancelar
            </button>
            {(() => {
              const hasVinculadas = rows.some(r => selected.has(r.sil._rowIndex) && !!r.trip);
              return (
                <button
                  onClick={handleImport}
                  disabled={selected.size === 0}
                  className={`px-8 py-3 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 ${
                    hasVinculadas ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#001e50] hover:bg-blue-900'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  Importar {selected.size > 0 ? `${selected.size} Programaç${selected.size !== 1 ? 'ões' : 'ão'}` : ''}
                </button>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SILExcelImporter;
