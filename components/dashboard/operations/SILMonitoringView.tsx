
import React, { useState } from 'react';
import { SILProgramacao, Driver, Customer } from '../../../types';
import { maskPlate, maskCPF } from '../../../utils/masks';
import SILExcelImporter from './SILExcelImporter';

interface SILMonitoringViewProps {
  drivers: Driver[];
  customers: Customer[];
}

const TIPO_COLOR: Record<string, string> = {
  exportação: 'bg-blue-100 text-blue-700',
  importação:  'bg-emerald-100 text-emerald-700',
};

const SILMonitoringView: React.FC<SILMonitoringViewProps> = () => {
  const [programacoes, setProgramacoes] = useState<SILProgramacao[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [filters, setFilters] = useState({ prog: '', placa: '', motorista: '', tipo: '', situacao: '' });

  const handleImport = (rows: SILProgramacao[]) => {
    setProgramacoes(prev => {
      // Evita duplicatas por numeroProgramacao+container
      const existingKeys = new Set(prev.map(p => `${p.numeroProgramacao}|${p.container}`));
      const novos = rows.filter(r => !existingKeys.has(`${r.numeroProgramacao}|${r.container}`));
      return [...novos, ...prev];
    });
  };

  const filtered = programacoes.filter(p =>
    (filters.prog      === '' || p.numeroProgramacao.includes(filters.prog)) &&
    (filters.placa     === '' || p.placaVeiculo.toLowerCase().includes(filters.placa.toLowerCase()) || p.placaCarreta.toLowerCase().includes(filters.placa.toLowerCase())) &&
    (filters.motorista === '' || p.nomeMotorista.toLowerCase().includes(filters.motorista.toLowerCase())) &&
    (filters.tipo      === '' || p.tipoProgramado.toLowerCase() === filters.tipo.toLowerCase()) &&
    (filters.situacao  === '' || p.situacao.toLowerCase().includes(filters.situacao.toLowerCase()))
  );

  const stats = {
    total:       programacoes.length,
    exportacao:  programacoes.filter(p => p.tipoProgramado.toLowerCase().includes('export')).length,
    importacao:  programacoes.filter(p => p.tipoProgramado.toLowerCase().includes('import')).length,
    encerradas:  programacoes.filter(p => p.situacao.toLowerCase().includes('encerr')).length,
  };

  const tipoColor = (tipo: string) => TIPO_COLOR[tipo.toLowerCase()] || 'bg-slate-100 text-slate-600';
  const situacaoColor = (s: string) => {
    const sl = s.toLowerCase();
    if (sl.includes('encerr')) return 'bg-slate-100 text-slate-500';
    if (sl.includes('prazo'))  return 'bg-emerald-100 text-emerald-700';
    return 'bg-amber-100 text-amber-700';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SILExcelImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImport={handleImport}
      />

      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-[#001e50] uppercase tracking-tight flex items-center gap-3">
            <div className="w-8 h-8 bg-[#001e50] text-white rounded-lg flex items-center justify-center text-xs italic shadow-lg">SIL</div>
            Programações Detalhadas — SIL Opentech
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Importação via Excel exportado do módulo de Programação Detalhada
          </p>
        </div>
        <div className="flex items-center gap-3">
          {programacoes.length > 0 && (
            <button
              onClick={() => setProgramacoes([])}
              className="px-4 py-3 text-slate-400 hover:text-red-500 rounded-2xl text-[9px] font-black uppercase transition-all hover:bg-red-50"
            >
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total importado', value: stats.total, color: 'text-slate-800', border: '' },
          { label: 'Exportação', value: stats.exportacao, color: 'text-blue-600', border: 'border-l-4 border-l-blue-500' },
          { label: 'Importação', value: stats.importacao, color: 'text-emerald-600', border: 'border-l-4 border-l-emerald-500' },
          { label: 'Encerradas', value: stats.encerradas, color: 'text-slate-400', border: 'border-l-4 border-l-slate-300' },
        ].map(k => (
          <div key={k.label} className={`bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center ${k.border}`}>
            <p className="text-[9px] font-black text-slate-400 uppercase">{k.label}</p>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Nº Programação', key: 'prog',      placeholder: '35906178' },
            { label: 'Placa',          key: 'placa',     placeholder: 'ABC-1D23' },
            { label: 'Motorista',      key: 'motorista', placeholder: 'Nome...' },
            { label: 'Situação',       key: 'situacao',  placeholder: 'Encerrada...' },
          ].map(f => (
            <div key={f.key} className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-1">{f.label}</label>
              <input
                type="text"
                placeholder={f.placeholder}
                value={(filters as any)[f.key]}
                onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Tipo</label>
            <select
              value={filters.tipo}
              onChange={e => setFilters({ ...filters, tipo: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-[10px] font-bold uppercase focus:border-blue-500 outline-none transition-all"
            >
              <option value="">Todos</option>
              <option value="Exportação">Exportação</option>
              <option value="Importação">Importação</option>
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
                {[
                  'Nº Prog.', 'Tipo', 'Container', 'Tp. Cont.',
                  'Booking', 'Previsão Atend.', 'Situação',
                  'Motorista', 'CPF', 'Placa', 'Carreta',
                  'Cidade Atend.', 'Local', 'Embarcador', 'Navio', 'BL',
                ].map(h => (
                  <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((p, idx) => (
                <tr key={`${p.numeroProgramacao}-${p._rowIndex}`}
                    className={`hover:bg-slate-50 transition-colors align-middle ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                  <td className="px-3 py-2.5 font-black text-blue-700 whitespace-nowrap">{p.numeroProgramacao}</td>
                  <td className="px-3 py-2.5">
                    {p.tipoProgramado && (
                      <span className={`px-2 py-0.5 rounded-lg font-black uppercase text-[8px] ${tipoColor(p.tipoProgramado)}`}>
                        {p.tipoProgramado}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-black text-slate-800 whitespace-nowrap">{p.container}</td>
                  <td className="px-3 py-2.5 text-slate-500 font-bold">{p.tipoContainer}</td>
                  <td className="px-3 py-2.5 font-black text-slate-700 whitespace-nowrap">{p.booking}</td>
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{p.previsaoAtendimento}</td>
                  <td className="px-3 py-2.5">
                    {p.situacao && (
                      <span className={`px-2 py-0.5 rounded-lg font-black uppercase text-[8px] ${situacaoColor(p.situacao)}`}>
                        {p.situacao}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-slate-800 uppercase whitespace-nowrap max-w-[160px] truncate">{p.nomeMotorista}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">{p.cpfMotorista}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-mono font-black text-[8px]">{p.placaVeiculo}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {p.placaCarreta && (
                      <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded font-mono font-bold text-[8px]">{p.placaCarreta}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 font-bold uppercase whitespace-nowrap">{p.cidadeAtendimento}</td>
                  <td className="px-3 py-2.5 text-slate-500 max-w-[120px] truncate">{p.nomeLocalAtendimento}</td>
                  <td className="px-3 py-2.5 text-slate-600 font-bold uppercase whitespace-nowrap">{p.embarcador}</td>
                  <td className="px-3 py-2.5 text-slate-500 font-bold uppercase whitespace-nowrap">{p.navio}</td>
                  <td className="px-3 py-2.5 font-mono text-slate-400 whitespace-nowrap">{p.bl}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={16} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                          {programacoes.length > 0 ? 'Nenhuma programação com esses filtros' : 'Nenhuma programação importada'}
                        </p>
                        {programacoes.length === 0 && (
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
              {filtered.length} programaç{filtered.length !== 1 ? 'ões' : 'ão'} exibida{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== programacoes.length && ` (de ${programacoes.length} total)`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SILMonitoringView;
