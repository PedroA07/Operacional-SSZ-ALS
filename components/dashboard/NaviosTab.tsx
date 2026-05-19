import React, { useState, useEffect, useCallback } from 'react';
import { User, Trip, Ship, ShipStatus, TerminalVessel } from '../../types';
import { db, supabase } from '../../utils/storage';

interface NaviosTabProps {
  user: User;
  trips: Trip[];
}

const SHIP_STATUSES: ShipStatus[] = ['EM TRÂNSITO', 'ATRACADO', 'FUNDEADO', 'AGUARDANDO JANELA', 'SAÍDO'];
const TERMINALS = ['ECOPORTO', 'SANTOS BRASIL', 'EMBRAPORT', 'BTP', 'OUTRO'];

const TERMINAL_KEYS: Record<string, string> = {
  ECOPORTO: 'ecoporto',
  'SANTOS BRASIL': 'santosbrasil',
  BTP: 'btp',
};

interface TerminalState {
  vessels: TerminalVessel[];
  loading: boolean;
  error: string | null;
  fetchedAt: string | null;
}

function statusBadgeClass(status: ShipStatus): string {
  switch (status) {
    case 'ATRACADO': return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'EM TRÂNSITO': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'FUNDEADO': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'AGUARDANDO JANELA': return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'SAÍDO': return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }
}

function situacaoBadgeClass(situacao: string): string {
  const s = situacao.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (s.includes('em operac') || s.includes('operando')) return 'bg-green-500/20 text-green-400';
  if (s.includes('previsto') || s.includes('prev')) return 'bg-blue-500/20 text-blue-400';
  if (s.includes('desatrac') || s.includes('encerr') || s.includes('saido') || s.includes('saiu')) return 'bg-slate-500/20 text-slate-400';
  return 'bg-amber-500/20 text-amber-400';
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

const emptyShip = (): Partial<Ship> => ({
  name: '',
  imo: '',
  armador: '',
  viagem: '',
  terminal: '',
  berco: '',
  eta: '',
  etd: '',
  status: 'EM TRÂNSITO',
  observacoes: '',
  tripIds: [],
});

const NaviosTab: React.FC<NaviosTabProps> = ({ user, trips }) => {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loadingShips, setLoadingShips] = useState(true);

  const [terminalData, setTerminalData] = useState<Record<string, TerminalState>>({
    ECOPORTO: { vessels: [], loading: false, error: null, fetchedAt: null },
    'SANTOS BRASIL': { vessels: [], loading: false, error: null, fetchedAt: null },
    BTP: { vessels: [], loading: false, error: null, fetchedAt: null },
    EMBRAPORT: { vessels: [], loading: false, error: null, fetchedAt: null },
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingShip, setEditingShip] = useState<Partial<Ship>>(emptyShip());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadShips = useCallback(async () => {
    setLoadingShips(true);
    try {
      const data = await db.getShips();
      setShips(data);
    } catch (e) {
      console.error('[NaviosTab] loadShips error:', e);
    } finally {
      setLoadingShips(false);
    }
  }, []);

  useEffect(() => {
    loadShips();
  }, [loadShips]);

  const fetchTerminal = useCallback(async (terminalLabel: string) => {
    const terminalKey = TERMINAL_KEYS[terminalLabel];
    if (!terminalKey) return; // EMBRAPORT has no public data

    setTerminalData(prev => ({
      ...prev,
      [terminalLabel]: { ...prev[terminalLabel], loading: true, error: null },
    }));

    try {
      if (!supabase) throw new Error('Supabase não configurado');
      const { data, error } = await supabase.functions.invoke('terminal-vessels', {
        body: { terminal: terminalKey },
      });
      if (error) throw error;
      const result = data as { vessels: TerminalVessel[]; error?: string; terminal: string; fetchedAt: string };
      setTerminalData(prev => ({
        ...prev,
        [terminalLabel]: {
          vessels: result.vessels || [],
          loading: false,
          error: result.error || null,
          fetchedAt: result.fetchedAt,
        },
      }));
    } catch (e: any) {
      setTerminalData(prev => ({
        ...prev,
        [terminalLabel]: {
          ...prev[terminalLabel],
          loading: false,
          error: e?.message || 'Erro ao buscar dados',
          fetchedAt: new Date().toISOString(),
        },
      }));
    }
  }, []);

  const openNewModal = () => {
    setEditingShip(emptyShip());
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (ship: Ship) => {
    setEditingShip({ ...ship });
    setModalError(null);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingShip.name?.trim()) {
      setModalError('O nome do navio é obrigatório.');
      return;
    }
    if (!editingShip.status) {
      setModalError('O status é obrigatório.');
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      await db.saveShip(editingShip);
      setModalOpen(false);
      await loadShips();
    } catch (e: any) {
      setModalError(e?.message || 'Erro ao salvar navio.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este navio do registro?')) return;
    try {
      await db.deleteShip(id);
      setShips(prev => prev.filter(s => s.id !== id));
    } catch (e: any) {
      alert('Erro ao excluir: ' + (e?.message || e));
    }
  };

  const updateField = (field: keyof Ship, value: any) => {
    setEditingShip(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Monitoramento de Navios</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acompanhe a situação dos navios nos terminais de Santos</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Novo Navio
        </button>
      </div>

      {/* Terminal Status Cards */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Status dos Terminais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {(['ECOPORTO', 'SANTOS BRASIL', 'BTP', 'EMBRAPORT'] as const).map(term => {
            const state = terminalData[term];
            const hasKey = !!TERMINAL_KEYS[term];
            return (
              <div key={term} className="bg-[#0f172a] rounded-2xl p-5 flex flex-col gap-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-100 uppercase tracking-widest">{term}</span>
                  <div className="flex items-center gap-2">
                    {state.vessels.length > 0 && (
                      <span className="text-[9px] font-black bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                        {state.vessels.length}
                      </span>
                    )}
                    {hasKey ? (
                      <button
                        onClick={() => fetchTerminal(term)}
                        disabled={state.loading}
                        className="text-[9px] font-black uppercase px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-all disabled:opacity-50"
                      >
                        {state.loading ? '...' : 'Buscar'}
                      </button>
                    ) : null}
                  </div>
                </div>

                {state.fetchedAt && (
                  <p className="text-[8px] text-slate-600 font-bold">
                    Atualizado: {new Date(state.fetchedAt).toLocaleTimeString('pt-BR')}
                  </p>
                )}

                {state.error && (
                  <p className="text-[9px] text-red-400 font-bold">{state.error}</p>
                )}

                {!hasKey && (
                  <p className="text-[9px] text-slate-600 font-bold italic">Sem dados públicos disponíveis</p>
                )}

                {hasKey && !state.loading && state.vessels.length === 0 && !state.error && !state.fetchedAt && (
                  <p className="text-[9px] text-slate-600 font-bold">Clique em "Buscar" para carregar</p>
                )}

                {state.vessels.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {state.vessels.slice(0, 5).map((v, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-800/50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-slate-200 truncate uppercase">{v.navio}</p>
                          {v.previsao && <p className="text-[8px] text-slate-500 font-bold">{v.previsao}</p>}
                          {v.berco && <p className="text-[8px] text-slate-600 font-bold">Berço {v.berco}</p>}
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap ${situacaoBadgeClass(v.situacao)}`}>
                          {v.situacao.length > 14 ? v.situacao.slice(0, 14) + '…' : v.situacao}
                        </span>
                      </div>
                    ))}
                    {state.vessels.length > 5 && (
                      <p className="text-[8px] text-slate-600 font-bold pt-1">+{state.vessels.length - 5} navios</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Ships Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Navios Cadastrados</p>
          <span className="text-[9px] font-black text-slate-400">{ships.length} navio(s)</span>
        </div>

        {loadingShips ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ships.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400">
            <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="1.5" d="M5 12H3l9-9 9 9h-2M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[10px] font-black uppercase tracking-widest">Nenhum navio cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Navio', 'IMO', 'Armador', 'Terminal', 'Status', 'ETA', 'ETD', 'Viagem', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ships.map(ship => (
                  <tr key={ship.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-black text-slate-800 uppercase whitespace-nowrap">{ship.name}</td>
                    <td className="px-4 py-3 text-slate-500 font-bold">{ship.imo || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{ship.armador || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold">{ship.terminal || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full font-black uppercase text-[8px] ${statusBadgeClass(ship.status)}`}>
                        {ship.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{formatDate(ship.eta)}</td>
                    <td className="px-4 py-3 text-slate-600 font-bold whitespace-nowrap">{formatDate(ship.etd)}</td>
                    <td className="px-4 py-3 text-slate-500 font-bold">{ship.viagem || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* VesselFinder */}
                        <a
                          href={`https://www.vesselfinder.com/?name=${encodeURIComponent(ship.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Buscar no VesselFinder"
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                          </svg>
                        </a>
                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(ship)}
                          title="Editar"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(ship.id)}
                          title="Excluir"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Ship Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-[11px] font-black text-slate-100 uppercase tracking-widest">
                {editingShip.id ? 'Editar Navio' : 'Novo Navio'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-500 hover:text-slate-300 rounded-xl hover:bg-slate-800 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeWidth="2.5" strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {modalError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-[10px] font-black text-red-400 uppercase">
                  {modalError}
                </div>
              )}

              {/* Nome */}
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome do Navio *</label>
                  <a
                    href={`https://www.vesselfinder.com/?name=${encodeURIComponent(editingShip.name || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[8px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-colors"
                  >
                    Buscar no VesselFinder →
                  </a>
                </div>
                <input
                  value={editingShip.name || ''}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="Ex: MSC ANNA"
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* IMO */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">IMO</label>
                  <input
                    value={editingShip.imo || ''}
                    onChange={e => updateField('imo', e.target.value)}
                    placeholder="Ex: 9876543"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                {/* Armador */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Armador</label>
                  <input
                    value={editingShip.armador || ''}
                    onChange={e => updateField('armador', e.target.value)}
                    placeholder="Ex: MSC, Maersk..."
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Nº Viagem */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nº Viagem</label>
                  <input
                    value={editingShip.viagem || ''}
                    onChange={e => updateField('viagem', e.target.value)}
                    placeholder="Ex: 001N"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                {/* Berço */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Berço</label>
                  <input
                    value={editingShip.berco || ''}
                    onChange={e => updateField('berco', e.target.value)}
                    placeholder="Ex: 310"
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Terminal */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Terminal</label>
                  <select
                    value={editingShip.terminal || ''}
                    onChange={e => updateField('terminal', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  >
                    <option value="">Selecionar...</option>
                    {TERMINALS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* Status */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status *</label>
                  <select
                    value={editingShip.status || 'EM TRÂNSITO'}
                    onChange={e => updateField('status', e.target.value as ShipStatus)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  >
                    {SHIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* ETA */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ETA (Chegada Prevista)</label>
                  <input
                    type="date"
                    value={editingShip.eta || ''}
                    onChange={e => updateField('eta', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                {/* ETD */}
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">ETD (Saída Prevista)</label>
                  <input
                    type="date"
                    value={editingShip.etd || ''}
                    onChange={e => updateField('etd', e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Observações</label>
                <textarea
                  value={editingShip.observacoes || ''}
                  onChange={e => updateField('observacoes', e.target.value)}
                  rows={3}
                  placeholder="Observações sobre o navio ou viagem..."
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-800 flex items-center gap-3 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NaviosTab;
