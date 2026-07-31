
import React, { useState, useMemo } from 'react';
import { Driver, FrotaLegal, FrotaLegalStatus } from '../../types';
import { maskPhone, normalizeSearch } from '../../utils/masks';
import ListFilters from './shared/ListFilters';

interface FrotaLegalTabProps {
  drivers: Driver[];
  onSaveDriver: (driver: Partial<Driver>, id?: string) => Promise<void>;
}

const STATUSES: { value: FrotaLegalStatus; label: string; on: string; off: string }[] = [
  { value: 'Liberado',  label: 'Liberado',   on: 'bg-emerald-500 text-white border-emerald-500', off: 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50' },
  { value: 'Bloqueado', label: 'Bloqueado',  on: 'bg-red-500 text-white border-red-500',          off: 'bg-white text-red-600 border-red-200 hover:bg-red-50' },
  { value: 'Em Análise',label: 'Em Análise', on: 'bg-amber-500 text-white border-amber-500',      off: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50' },
  { value: 'Pendente',  label: 'Pendente',   on: 'bg-slate-600 text-white border-slate-600',      off: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50' },
];

const badgeCls = (s?: FrotaLegalStatus) =>
  s === 'Liberado' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
  : s === 'Bloqueado' ? 'bg-red-50 text-red-600 border-red-200'
  : s === 'Em Análise' ? 'bg-amber-50 text-amber-600 border-amber-200'
  : 'bg-slate-100 text-slate-500 border-slate-200';

const defaultFL = (): FrotaLegal => ({ enrolled: true, cavaloStatus: 'Pendente', carretaStatus: 'Pendente' });

const FrotaLegalTab: React.FC<FrotaLegalTabProps> = ({ drivers, onSaveDriver }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [onlyEnrolled, setOnlyEnrolled] = useState(false);
  // Edições locais (por motorista) ainda não salvas
  const [edits, setEdits] = useState<Record<string, FrotaLegal>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const current = (d: Driver): FrotaLegal => edits[d.id] ?? d.frotaLegal ?? { enrolled: false };
  const isDirty = (d: Driver) => !!edits[d.id];

  const setFL = (d: Driver, patch: Partial<FrotaLegal>) => {
    setEdits(prev => ({ ...prev, [d.id]: { ...current(d), ...patch } }));
  };

  const enroll = (d: Driver, on: boolean) => {
    if (on) setFL(d, { ...defaultFL(), ...current(d), enrolled: true });
    else setFL(d, { ...current(d), enrolled: false });
  };

  const save = async (d: Driver) => {
    const fl = { ...current(d), updatedAt: new Date().toISOString() };
    setSavingId(d.id);
    await onSaveDriver({ ...d, frotaLegal: fl }, d.id);
    setSavingId(null);
    setEdits(prev => { const n = { ...prev }; delete n[d.id]; return n; });
  };

  const filtered = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    let result = drivers.filter(d => {
      if (onlyEnrolled && !(current(d).enrolled)) return false;
      if (!q) return true;
      return normalizeSearch([d.name, d.cpf, d.plateHorse, d.plateTrailer].filter(Boolean).join(' ')).includes(q);
    });
    result.sort((a, b) => sortBy === 'name_desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, searchQuery, sortBy, onlyEnrolled, edits]);

  const enrolledCount = drivers.filter(d => (edits[d.id] ?? d.frotaLegal)?.enrolled).length;

  const StatusRow = ({ d, kind }: { d: Driver; kind: 'cavalo' | 'carreta' }) => {
    const fl = current(d);
    const value = kind === 'cavalo' ? fl.cavaloStatus : fl.carretaStatus;
    return (
      <div className="space-y-1.5">
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{kind === 'cavalo' ? 'Cavalo' : 'Carreta'}</span>
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(s => {
            const active = value === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setFL(d, kind === 'cavalo' ? { cavaloStatus: s.value } : { carretaStatus: s.value })}
                className={`px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider border-2 transition-all ${active ? s.on : s.off}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-full mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <div className="flex-1 w-full">
          <ListFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            placeholder="BUSCAR MOTORISTA, CPF OU PLACA..."
          />
        </div>
        <button
          onClick={() => setOnlyEnrolled(v => !v)}
          className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm h-[68px] shrink-0 border-2 ${onlyEnrolled ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'}`}
        >
          {onlyEnrolled ? 'Somente Vinculados' : 'Mostrar Todos'}
        </button>
      </div>

      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Frota Legal</h3>
        <span className="text-[10px] font-black text-slate-400">{enrolledCount} vinculado{enrolledCount === 1 ? '' : 's'} · {filtered.length} exibido{filtered.length === 1 ? '' : 's'}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-200 py-20 text-center">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nenhum motorista encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(d => {
            const fl = current(d);
            const dirty = isDirty(d);
            return (
              <div key={d.id} className={`bg-white rounded-3xl border shadow-sm flex flex-col overflow-hidden transition-all ${fl.enrolled ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className="p-5 flex items-start gap-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 border overflow-hidden shrink-0 shadow-inner">
                    {d.photo ? <img src={d.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-white"><img src="/logo.jpg" alt="ALS" className="w-6 h-6 object-contain opacity-60" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 uppercase text-[12px] leading-tight truncate">{d.name}</p>
                    <p className="text-[9px] font-mono font-bold text-slate-400 mt-0.5">{d.plateHorse || '—'} / {d.plateTrailer || '—'}</p>
                    <p className="text-[8px] font-bold text-slate-400 mt-0.5">{maskPhone(d.phone)}</p>
                  </div>
                  <label className="flex flex-col items-center gap-1 shrink-0 cursor-pointer">
                    <span className="text-[7px] font-black text-slate-400 uppercase">Vincular</span>
                    <button
                      type="button"
                      onClick={() => enroll(d, !fl.enrolled)}
                      className={`relative w-11 h-6 rounded-full transition-all ${fl.enrolled ? 'bg-amber-500' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${fl.enrolled ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </label>
                </div>

                {fl.enrolled ? (
                  <div className="p-5 space-y-4 flex-1">
                    <StatusRow d={d} kind="cavalo" />
                    <StatusRow d={d} kind="carreta" />
                    <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Observações</span>
                      <textarea
                        rows={2}
                        value={fl.notes || ''}
                        onChange={e => setFL(d, { notes: e.target.value })}
                        placeholder="Pendências, documentos, validade..."
                        className="w-full px-3 py-2 rounded-xl border-2 border-slate-100 bg-slate-50 text-[10px] font-medium outline-none focus:border-amber-400 focus:bg-white transition-all resize-none"
                      />
                    </div>
                    <button
                      onClick={() => save(d)}
                      disabled={!dirty || savingId === d.id}
                      className={`w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${dirty ? 'bg-slate-900 text-white hover:bg-amber-600' : 'bg-slate-100 text-slate-400'} disabled:opacity-60`}
                    >
                      {savingId === d.id
                        ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        : dirty ? 'Salvar Alterações' : 'Salvo'}
                    </button>
                    {fl.updatedAt && !dirty && (
                      <p className="text-[8px] font-bold text-slate-400 uppercase text-center">Atualizado {new Date(fl.updatedAt).toLocaleDateString('pt-BR')}</p>
                    )}
                  </div>
                ) : (
                  <div className="p-5 flex-1 flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${badgeCls(d.frotaLegal?.cavaloStatus)}`}>Cavalo: {d.frotaLegal?.cavaloStatus || '—'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${badgeCls(d.frotaLegal?.carretaStatus)}`}>Carreta: {d.frotaLegal?.carretaStatus || '—'}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-300 uppercase">Não vinculado à Frota Legal</p>
                    {dirty && (
                      <button onClick={() => save(d)} disabled={savingId === d.id} className="mt-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase bg-slate-900 text-white hover:bg-red-600 transition-all">
                        {savingId === d.id ? 'Salvando...' : 'Salvar (desvincular)'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FrotaLegalTab;
