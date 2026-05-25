import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FreightRoute, FreightVehicleType, FreightRouteVehicleValue } from '../../types';
import { db } from '../../utils/storage';

type View = 'table' | 'calculator';

const DEFAULT_VEHICLE_TYPES: FreightVehicleType[] = [
  { id: 'l',  code: 'L',  name: 'Leve',             sortOrder: 1 },
  { id: 'ls', code: 'LS', name: 'Leve Semi-Reboque', sortOrder: 2 },
  { id: 'm',  code: 'M',  name: 'Médio',             sortOrder: 3 },
  { id: 'ml', code: 'ML', name: 'Médio Rod. Leve',   sortOrder: 4 },
  { id: 've', code: 'VE', name: 'Veículo Especial',  sortOrder: 5 },
];

const fmt = (v: number) =>
  v === 0 ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseMoney = (s: string) => {
  const n = parseFloat(s.replace(/[^\d,.-]/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

// ── Modal de rota ────────────────────────────────────────────────────────────

interface RouteModalProps {
  vehicleTypes: FreightVehicleType[];
  editingRoute: FreightRoute | null;
  onClose: () => void;
  onSave: (route: Omit<FreightRoute, 'createdAt' | 'updatedAt'>) => Promise<void>;
  existingCities: string[];
}

const RouteModal: React.FC<RouteModalProps> = ({ vehicleTypes, editingRoute, onClose, onSave, existingCities }) => {
  const blank = (): FreightRouteVehicleValue => ({ freight: 0, tollGoing: 0, tollReturning: 0 });

  const [origin, setOrigin] = useState(editingRoute?.originCity ?? '');
  const [destination, setDestination] = useState(editingRoute?.destinationCity ?? '');
  const [values, setValues] = useState<{ [code: string]: FreightRouteVehicleValue }>(() => {
    const init: { [code: string]: FreightRouteVehicleValue } = {};
    vehicleTypes.forEach(vt => {
      init[vt.code] = editingRoute?.vehicleValues[vt.code] ?? blank();
    });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const setField = (code: string, field: keyof FreightRouteVehicleValue, raw: string) => {
    setValues(prev => ({ ...prev, [code]: { ...prev[code], [field]: parseMoney(raw) } }));
  };

  const handleSave = async () => {
    if (!origin.trim() || !destination.trim()) return;
    setSaving(true);
    await onSave({
      id: editingRoute?.id ?? `fr-${Date.now()}`,
      originCity: origin.trim(),
      destinationCity: destination.trim(),
      vehicleValues: values,
    });
    setSaving(false);
  };

  const cities = useMemo(() => Array.from(new Set(existingCities)).sort(), [existingCities]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              {editingRoute ? 'Editar Rota' : 'Nova Rota'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Defina os fretes e pedágios por tipo de veículo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Cidades */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cidade Origem</label>
              <input
                list="cities-list"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                placeholder="Ex: Santos"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Cidade Destino</label>
              <input
                list="cities-list"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="Ex: São Paulo"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <datalist id="cities-list">
            {cities.map(c => <option key={c} value={c} />)}
          </datalist>

          {/* Valores por tipo de veículo */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Valores por Tipo de Veículo</p>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Frete (R$)</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedágio Ida (R$)</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Pedágio Volta (R$)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vehicleTypes.map(vt => (
                    <tr key={vt.code} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">{vt.code}</span>
                          <span className="text-xs text-slate-500">{vt.name}</span>
                        </span>
                      </td>
                      {(['freight', 'tollGoing', 'tollReturning'] as const).map(field => (
                        <td key={field} className="px-4 py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={values[vt.code]?.[field] ?? 0}
                            onChange={e => setField(vt.code, field, e.target.value)}
                            className="w-full text-right px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all">
            Cancelar
          </button>
          <button
            disabled={!origin.trim() || !destination.trim() || saving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Salvar Rota'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal de tipos de veículo ─────────────────────────────────────────────────

interface VehicleTypesModalProps {
  vehicleTypes: FreightVehicleType[];
  onClose: () => void;
  onSave: (types: FreightVehicleType[]) => Promise<void>;
}

const VehicleTypesModal: React.FC<VehicleTypesModalProps> = ({ vehicleTypes, onClose, onSave }) => {
  const [types, setTypes] = useState<FreightVehicleType[]>(vehicleTypes);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const addType = () => {
    if (!newCode.trim() || !newName.trim()) return;
    if (types.find(t => t.code === newCode.toUpperCase())) return;
    setTypes(prev => [...prev, {
      id: `vt-${Date.now()}`,
      code: newCode.toUpperCase().trim(),
      name: newName.trim(),
      sortOrder: prev.length + 1,
    }]);
    setNewCode('');
    setNewName('');
  };

  const removeType = (id: string) => setTypes(prev => prev.filter(t => t.id !== id));

  const handleSave = async () => {
    setSaving(true);
    await onSave(types);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tipos de Veículo</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="p-7 space-y-5 overflow-y-auto max-h-[60vh]">
          <div className="space-y-2">
            {types.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase min-w-[40px] text-center">{t.code}</span>
                <span className="flex-1 text-xs text-slate-600 font-medium">{t.name}</span>
                <button onClick={() => removeType(t.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Adicionar Tipo</p>
            <div className="flex gap-2">
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="Código (ex: LT)"
                maxLength={6}
                className="w-24 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome do tipo"
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addType}
                disabled={!newCode.trim() || !newName.trim()}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 disabled:opacity-40 transition-all"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="px-7 py-5 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase hover:bg-slate-200 transition-all">
            Cancelar
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-40"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── View: Tabela de Frete ─────────────────────────────────────────────────────

interface FreightTableViewProps {
  routes: FreightRoute[];
  vehicleTypes: FreightVehicleType[];
  onEdit: (r: FreightRoute) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onManageTypes: () => void;
}

const FreightTableView: React.FC<FreightTableViewProps> = ({ routes, vehicleTypes, onEdit, onDelete, onAdd, onManageTypes }) => {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return routes.filter(r =>
      r.originCity.toLowerCase().includes(q) || r.destinationCity.toLowerCase().includes(q)
    );
  }, [routes, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cidade..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onManageTypes}
            className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
            Tipos
          </button>
          <button
            onClick={onAdd}
            className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Nova Rota
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
            {routes.length === 0 ? 'Nenhuma rota cadastrada' : 'Nenhuma rota encontrada'}
          </p>
          {routes.length === 0 && (
            <p className="text-xs text-slate-400 mt-1">Clique em "Nova Rota" para começar</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="sticky left-0 bg-slate-50 text-left px-5 py-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Origem</th>
                <th className="text-left px-5 py-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Destino</th>
                {vehicleTypes.map(vt => (
                  <th key={vt.code} colSpan={3} className="text-center px-2 py-3.5 border-l border-slate-100">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase">{vt.code}</span>
                  </th>
                ))}
                <th className="text-center px-5 py-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
              </tr>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="sticky left-0 bg-slate-50/50" />
                <th />
                {vehicleTypes.map(vt => (
                  <React.Fragment key={vt.code}>
                    <th className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-100 text-right">Frete</th>
                    <th className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Ped. Ida</th>
                    <th className="px-3 py-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Ped. Volta</th>
                  </React.Fragment>
                ))}
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(route => (
                <tr key={route.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="sticky left-0 bg-white group-hover:bg-blue-50/30 px-5 py-4 font-bold text-slate-800 text-xs">{route.originCity}</td>
                  <td className="px-5 py-4 text-xs text-slate-600 font-medium">{route.destinationCity}</td>
                  {vehicleTypes.map(vt => {
                    const v = route.vehicleValues[vt.code];
                    return (
                      <React.Fragment key={vt.code}>
                        <td className="px-3 py-4 text-xs text-right text-slate-700 border-l border-slate-50 font-medium">{v ? fmt(v.freight) : '—'}</td>
                        <td className="px-3 py-4 text-xs text-right text-slate-600">{v ? fmt(v.tollGoing) : '—'}</td>
                        <td className="px-3 py-4 text-xs text-right text-slate-600">{v ? fmt(v.tollReturning) : '—'}</td>
                      </React.Fragment>
                    );
                  })}
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(route)}
                        className="p-2 hover:bg-blue-100 rounded-lg text-blue-500 transition-all"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(route.id)}
                        className="p-2 hover:bg-red-100 rounded-lg text-red-400 transition-all"
                        title="Excluir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
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

      <p className="text-[10px] text-slate-400 font-medium">
        {filtered.length} {filtered.length === 1 ? 'rota' : 'rotas'} {search ? 'encontradas' : 'cadastradas'}
      </p>
    </div>
  );
};

// ── View: Calculadora de Rota ─────────────────────────────────────────────────

interface CalculatorViewProps {
  routes: FreightRoute[];
  vehicleTypes: FreightVehicleType[];
}

const CalculatorView: React.FC<CalculatorViewProps> = ({ routes, vehicleTypes }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [axlesEmpty, setAxlesEmpty] = useState(4);
  const [axlesFull, setAxlesFull] = useState(6);

  const selectedRoute = useMemo(
    () => routes.find(r => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const totalRow = useMemo(() => {
    if (!selectedRoute) return null;
    return vehicleTypes.reduce<{ freight: number; tollGoing: number; tollReturning: number; total: number }>(
      (acc, vt) => {
        const v = selectedRoute.vehicleValues[vt.code];
        if (!v) return acc;
        return {
          freight: acc.freight + v.freight,
          tollGoing: acc.tollGoing + v.tollGoing,
          tollReturning: acc.tollReturning + v.tollReturning,
          total: acc.total + v.freight + v.tollGoing + v.tollReturning,
        };
      },
      { freight: 0, tollGoing: 0, tollReturning: 0, total: 0 }
    );
  }, [selectedRoute, vehicleTypes]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Seleção de Rota + Eixos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuração</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Rota */}
          <div className="sm:col-span-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rota</label>
            <select
              value={selectedRouteId}
              onChange={e => setSelectedRouteId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecione uma rota...</option>
              {routes.map(r => (
                <option key={r.id} value={r.id}>{r.originCity} → {r.destinationCity}</option>
              ))}
            </select>
          </div>

          {/* Eixos Ida */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Eixos na Ida
              <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black normal-case">Vazio</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAxlesEmpty(v => Math.max(1, v - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all"
              >−</button>
              <input
                type="number"
                min="1"
                max="20"
                value={axlesEmpty}
                onChange={e => setAxlesEmpty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setAxlesEmpty(v => Math.min(20, v + 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all"
              >+</button>
            </div>
          </div>

          {/* Eixos Volta */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Eixos na Volta
              <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-[8px] font-black normal-case">Cheio</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAxlesFull(v => Math.max(1, v - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all"
              >−</button>
              <input
                type="number"
                min="1"
                max="20"
                value={axlesFull}
                onChange={e => setAxlesFull(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setAxlesFull(v => Math.min(20, v + 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all"
              >+</button>
            </div>
          </div>
        </div>

        {selectedRoute && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              {selectedRoute.originCity} → {selectedRoute.destinationCity}
            </span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
        )}
      </div>

      {/* Resultado */}
      {!selectedRoute ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
            </svg>
          </div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Selecione uma rota para ver os valores</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Resultado</p>
              <p className="text-sm font-black text-white mt-0.5">{selectedRoute.originCity} → {selectedRoute.destinationCity}</p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-[8px] font-black text-blue-200 uppercase">Eixos Ida</p>
                <p className="text-lg font-black text-white">{axlesEmpty}</p>
                <p className="text-[8px] text-blue-300 uppercase">vazio</p>
              </div>
              <div className="w-px h-10 bg-blue-500" />
              <div>
                <p className="text-[8px] font-black text-blue-200 uppercase">Eixos Volta</p>
                <p className="text-lg font-black text-white">{axlesFull}</p>
                <p className="text-[8px] text-blue-300 uppercase">cheio</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Tipo de Veículo</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Frete</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Pedágio Ida</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Pedágio Volta</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vehicleTypes.map(vt => {
                  const v = selectedRoute.vehicleValues[vt.code];
                  if (!v && (v === undefined)) return null;
                  const total = (v?.freight ?? 0) + (v?.tollGoing ?? 0) + (v?.tollReturning ?? 0);
                  return (
                    <tr key={vt.code} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">{vt.code}</span>
                          <span className="text-xs text-slate-600 font-medium">{vt.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-bold text-slate-800">{v ? fmt(v.freight) : '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-slate-700">{v ? fmt(v.tollGoing) : '—'}</span>
                          {v && v.tollGoing > 0 && (
                            <span className="text-[9px] text-slate-400">{axlesEmpty} eixos vazios</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-slate-700">{v ? fmt(v.tollReturning) : '—'}</span>
                          {v && v.tollReturning > 0 && (
                            <span className="text-[9px] text-slate-400">{axlesFull} eixos cheios</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm font-black ${total > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                          {total > 0 ? fmt(total) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totalRow && (totalRow.freight > 0 || totalRow.tollGoing > 0 || totalRow.tollReturning > 0) && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={1} className="px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">—</td>
                    <td className="px-5 py-4 text-right text-xs font-black text-slate-700">{fmt(totalRow.freight)}</td>
                    <td className="px-5 py-4 text-right text-xs font-black text-slate-700">{fmt(totalRow.tollGoing)}</td>
                    <td className="px-5 py-4 text-right text-xs font-black text-slate-700">{fmt(totalRow.tollReturning)}</td>
                    <td className="px-5 py-4 text-right text-sm font-black text-blue-700">{fmt(totalRow.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Info sobre eixos */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-6 text-[10px] text-slate-500">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
              Pedágios são valores fixos por rota/tipo de veículo
            </span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              Eixos exibidos para referência operacional
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab principal ─────────────────────────────────────────────────────────────

const FreightTableTab: React.FC = () => {
  const [view, setView] = useState<View>('table');
  const [routes, setRoutes] = useState<FreightRoute[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<FreightVehicleType[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [isVehicleTypesModalOpen, setIsVehicleTypesModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<FreightRoute | null>(null);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [r, vt] = await Promise.all([db.getFreightRoutes(), db.getFreightVehicleTypes()]);
    setRoutes(r);
    setVehicleTypes(vt.length > 0 ? vt : DEFAULT_VEHICLE_TYPES);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const existingCities = useMemo(() => {
    const cities: string[] = [];
    routes.forEach(r => { cities.push(r.originCity); cities.push(r.destinationCity); });
    return cities;
  }, [routes]);

  const handleSaveRoute = async (route: Omit<FreightRoute, 'createdAt' | 'updatedAt'>) => {
    const ok = await db.saveFreightRoute(route as FreightRoute);
    if (ok) {
      showToast('Rota salva com sucesso!');
      setIsRouteModalOpen(false);
      setEditingRoute(null);
      await load();
    } else {
      showToast('Erro ao salvar rota.', 'error');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Excluir esta rota?')) return;
    const ok = await db.deleteFreightRoute(id);
    if (ok) { showToast('Rota excluída.'); await load(); }
    else showToast('Erro ao excluir.', 'error');
  };

  const handleSaveVehicleTypes = async (types: FreightVehicleType[]) => {
    const results = await Promise.all(types.map(t => db.saveFreightVehicleType(t)));
    if (results.every(Boolean)) {
      showToast('Tipos de veículo salvos!');
      setIsVehicleTypesModalOpen(false);
      await load();
    } else {
      showToast('Erro ao salvar tipos.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tabela de Frete</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gerencie fretes e pedágios por rota e tipo de veículo</p>
        </div>

        {/* View switcher */}
        <div className="flex bg-slate-100 rounded-2xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setView('table')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'table'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tabela
          </button>
          <button
            onClick={() => setView('calculator')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'calculator'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Calculadora de Rota
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'table' ? (
        <FreightTableView
          routes={routes}
          vehicleTypes={vehicleTypes}
          onEdit={r => { setEditingRoute(r); setIsRouteModalOpen(true); }}
          onDelete={handleDeleteRoute}
          onAdd={() => { setEditingRoute(null); setIsRouteModalOpen(true); }}
          onManageTypes={() => setIsVehicleTypesModalOpen(true)}
        />
      ) : (
        <CalculatorView routes={routes} vehicleTypes={vehicleTypes} />
      )}

      {/* Modals */}
      {isRouteModalOpen && (
        <RouteModal
          vehicleTypes={vehicleTypes}
          editingRoute={editingRoute}
          onClose={() => { setIsRouteModalOpen(false); setEditingRoute(null); }}
          onSave={handleSaveRoute}
          existingCities={existingCities}
        />
      )}

      {isVehicleTypesModalOpen && (
        <VehicleTypesModal
          vehicleTypes={vehicleTypes}
          onClose={() => setIsVehicleTypesModalOpen(false)}
          onSave={handleSaveVehicleTypes}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3.5 rounded-2xl shadow-xl text-white text-xs font-black uppercase tracking-widest animate-in slide-in-from-bottom-4 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-600 shadow-green-600/20' : 'bg-red-600 shadow-red-600/20'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default FreightTableTab;
