
import React, { useState } from 'react';
import { SILProgramacao, Trip, Driver, Customer } from '../../../types';
import SILExcelImporter from './SILExcelImporter';

interface SILMonitoringViewProps {
  trips: Trip[];
  drivers: Driver[];
  customers: Customer[];
  onUpdateTrip: (trip: Trip) => Promise<void>;
}

interface ImportedRow {
  sil: SILProgramacao;
  tripOs: string | null;       // OS do trip vinculado (para exibição)
  tripDriverName: string | null;
  tripCategory: string | null;
  tripType: string | null;
}

const TIPO_COLOR = (tipo: string) => {
  const l = tipo.toLowerCase();
  if (l.includes('export')) return 'bg-blue-100 text-blue-700';
  if (l.includes('import')) return 'bg-emerald-100 text-emerald-700';
  return 'bg-slate-100 text-slate-600';
};

const SILMonitoringView: React.FC<SILMonitoringViewProps> = ({ trips, drivers, customers, onUpdateTrip }) => {
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [importedOs, setImportedOs] = useState<Set<string>>(new Set());
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [filters, setFilters] = useState({ prog: '', motorista: '', tipo: '', situacao: '', vinculo: '' });
  const [lastImport, setLastImport] = useState<{ linked: number; unlinked: number } | null>(null);

  const handleImport = async (
    matched: { sil: SILProgramacao; trip: Trip }[],
    unmatched: SILProgramacao[]
  ) => {
    // Atualiza cada trip vinculada com os dados do SIL
    for (const { sil, trip } of matched) {
      const updated: Trip = {
        ...trip,
        booking:    sil.booking    || trip.booking,
        container:  sil.container  || trip.container,
        ship:       sil.navio      || trip.ship,
        bu:         sil.bl         || trip.bu,
        embarcador: sil.embarcador || trip.embarcador,
        tara:       sil.taraEspecifica || trip.tara,
        seal:       sil.lacre1     || trip.seal,
      };
      await onUpdateTrip(updated);
    }

    // Registra OS importados para deduplicação futura
    const newOs = new Set(importedOs);
    [...matched, ...unmatched.map(s => ({ sil: s }))].forEach(r =>
      newOs.add(r.sil.numeroProgramacao.trim().toLowerCase())
    );
    setImportedOs(newOs);

    // Adiciona às linhas exibidas (sem duplicar)
    const existingKeys = new Set(rows.map(r => r.sil.numeroProgramacao.trim().toLowerCase() + '|' + r.sil.container));

    const newRows: ImportedRow[] = [
      ...matched.map(({ sil, trip }) => ({
        sil,
        tripOs:         trip.os,
        tripDriverName: trip.driver?.name || null,
        tripCategory:   trip.category || null,
        tripType:       trip.type || null,
      })),
      ...unmatched.map(sil => ({
        sil,
        tripOs:         null,
        tripDriverName: null,
        tripCategory:   null,
        tripType:       null,
      })),
    ].filter(r => !existingKeys.has(r.sil.numeroProgramacao.trim().toLowerCase() + '|' + r.sil.container));

    setRows(prev => [...newRows, ...prev]);
    setLastImport({ linked: matched.length, unlinked: unmatched.length });
  };

  const filtered = rows.filter(r =>
    (filters.prog      === '' || r.sil.numeroProgramacao.includes(filters.prog)) &&
    (filters.motorista === '' || r.sil.nomeMotorista.toLowerCase().includes(filters.motorista.toLowerCase())) &&
    (filters.tipo      === '' || r.sil.tipoProgramado.toLowerCase().includes(filters.tipo.toLowerCase())) &&
    (filters.situacao  === '' || r.sil.situacao.toLowerCase().includes(filters.situacao.toLowerCase())) &&
    (filters.vinculo   === '' ||
      (filters.vinculo === 'vinculado'   && r.tripOs !== null) ||
      (filters.vinculo === 'nao_vinculado' && r.tripOs === null))
  );

  const stats = {
    total:    rows.length,
    vinculado: rows.filter(r => r.tripOs !== null).length,
    sem:       rows.filter(r => r.tripOs === null).length,
    export:    rows.filter(r => r.sil.tipoProgramado.toLowerCase().includes('export')).length,
    import:    rows.filter(r => r.sil.tipoProgramado.toLowerCase().includes('import')).length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SILExcelImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        trips={trips}
        importedOs={importedOs}
        onImport={handleImport}
      />

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#001e50] uppercase tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 bg-[#001e50] text-white rounded-lg flex items-center justify-center text-xs italic shadow-lg">SIL</div>
            Programações SIL — Opentech
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Vinculação automática por OS · trips atualizadas com booking, container, navio e BL
          </p>
        </div>
        <div className="flex items-center gap-3">
          {rows.length > 0 && (
            <button onClick={() => { setRows([]); setImportedOs(new Set()); setLastImport(null); }}
              className="px-4 py-3 text-slate-400 hover:text-red-500 rounded-2xl text-[9px] font-black uppercase transition-all hover:bg-red-50">
              Limpar lista
            </button>
          )}
          <button
            onClick={() => setIsImporterOpen(true)}
            className="px-6 py-4 bg-[#001e50] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-900 transition-all shadow-xl flex items-center gap-3 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            Importar Excel SIL
          </button>
        </div>
      </div>

      {/* Feedback da última importação */}
      {lastImport && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in duration-300">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          <p className="text-[10px] font-black text-emerald-700 uppercase">
            Importação concluída · <span className="text-emerald-900">{lastImport.linked} trip{lastImport.linked !== 1 ? 's' : ''} atualizada{lastImport.linked !== 1 ? 's' : ''}</span>
            {lastImport.unlinked > 0 && <span className="text-amber-600"> · {lastImport.unlinked} sem OS no sistema</span>}
          </p>
          <button onClick={() => setLastImport(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',       value: stats.total,    color: 'text-slate-800', border: '' },
          { label: 'Vinculadas',  value: stats.vinculado, color: 'text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
          { label: 'Sem OS',      value: stats.sem,      color: 'text-amber-600', border: 'border-l-4 border-l-amber-400' },
          { label: 'Exportação',  value: stats.export,   color: 'text-blue-600', border: 'border-l-4 border-l-blue-500' },
          { label: 'Importação',  value: stats.import,   color: 'text-teal-600', border: 'border-l-4 border-l-teal-500' },
        ].map(k => (
          <div key={k.label} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center ${k.border}`}>
            <p className="text-[8px] font-black text-slate-400 uppercase">{k.label}</p>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Nº Programação', key: 'prog',      placeholder: '35906178' },
            { label: 'Motorista',      key: 'motorista', placeholder: 'Nome...' },
            { label: 'Situação',       key: 'situacao',  placeholder: 'Encerrada...' },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-1">{f.label}</label>
              <input type="text" placeholder={f.placeholder}
                value={(filters as any)[f.key]}
                onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all"/>
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Tipo</label>
            <select value={filters.tipo} onChange={e => setFilters({ ...filters, tipo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none">
              <option value="">Todos</option>
              <option value="exportação">Exportação</option>
              <option value="importação">Importação</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Vínculo</label>
            <select value={filters.vinculo} onChange={e => setFilters({ ...filters, vinculo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none">
              <option value="">Todos</option>
              <option value="vinculado">Vinculadas</option>
              <option value="nao_vinculado">Sem OS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[9px] border-collapse min-w-[1300px]">
            <thead className="bg-[#001e50] text-white font-black uppercase tracking-widest">
              <tr>
                {['Vínculo', 'Nº OS (SIL)', 'Tipo', 'Trip no sistema', 'Container', 'Booking', 'Motorista SIL', 'Placa', 'Navio', 'BL', 'Cidade', 'Previsão', 'Situação'].map(h => (
                  <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((row, idx) => (
                <tr key={`${row.sil.numeroProgramacao}-${row.sil._rowIndex}`}
                    className={`hover:bg-slate-50 transition-colors align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>

                  {/* Vínculo */}
                  <td className="px-3 py-2.5">
                    {row.tripOs ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-700 font-black text-[8px] uppercase whitespace-nowrap">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                        Vinculada
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-black text-[8px] uppercase whitespace-nowrap">Sem OS</span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 font-black text-blue-700 whitespace-nowrap">{row.sil.numeroProgramacao}</td>

                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-lg font-black text-[8px] uppercase ${TIPO_COLOR(row.sil.tipoProgramado)}`}>
                      {row.sil.tipoProgramado}
                    </span>
                  </td>

                  {/* Trip vinculada */}
                  <td className="px-3 py-2.5">
                    {row.tripOs ? (
                      <div className="flex flex-col">
                        <span className="font-black text-slate-800 text-[9px]">OS {row.tripOs}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">{row.tripDriverName}</span>
                        <span className="text-[7px] text-slate-300 font-bold uppercase">{row.tripCategory} · {row.tripType}</span>
                      </div>
                    ) : (
                      <span className="text-slate-300 italic text-[8px]">—</span>
                    )}
                  </td>

                  <td className="px-3 py-2.5 font-mono font-black text-slate-800 whitespace-nowrap">{row.sil.container}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-700 whitespace-nowrap">{row.sil.booking}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-800 uppercase whitespace-nowrap max-w-[130px] truncate">{row.sil.nomeMotorista}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-black text-[8px]">{row.sil.placaVeiculo}</span>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-600 uppercase whitespace-nowrap">{row.sil.navio}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-500 whitespace-nowrap">{row.sil.bl}</td>
                  <td className="px-3 py-2.5 text-slate-600 font-bold uppercase whitespace-nowrap">{row.sil.cidadeAtendimento}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{row.sil.previsaoAtendimento}</td>
                  <td className="px-3 py-2.5">
                    {row.sil.situacao && (
                      <span className={`px-2 py-0.5 rounded-lg font-black text-[8px] uppercase ${
                        row.sil.situacao.toLowerCase().includes('encerr') ? 'bg-slate-100 text-slate-500' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>{row.sil.situacao}</span>
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                          {rows.length > 0 ? 'Nenhuma programação com esses filtros' : 'Nenhuma programação importada'}
                        </p>
                        {rows.length === 0 && (
                          <p className="text-[9px] font-bold text-slate-300 mt-1">
                            Exporte o Excel no SIL e clique em "Importar Excel SIL"
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase">
              {filtered.length} exibida{filtered.length !== 1 ? 's' : ''}{filtered.length !== rows.length && ` (de ${rows.length} total)`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SILMonitoringView;
