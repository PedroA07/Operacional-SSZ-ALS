import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FreightRoute, FreightVehicleType, FreightRouteVehicleValue } from '../../types';
import { db } from '../../utils/storage';
import CustomSelect, { SelectOption } from '../shared/CustomSelect';
import CitySearchSelect from '../shared/CitySearchSelect';
import SmartOperationTable from './operations/SmartOperationTable';

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

// ── Input de moeda estilo ATM (vírgula antes dos 2 últimos dígitos) ───────────
const CurrencyInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = 'R$ 0,00' }) => {
  // Trabalha em centavos internamente
  const [cents, setCents] = useState(() => Math.round(value * 100));

  useEffect(() => {
    const incoming = Math.round(value * 100);
    setCents(prev => prev === incoming ? prev : incoming);
  }, [value]);

  const display = cents === 0
    ? ''
    : (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const push = (next: number) => {
    setCents(next);
    onChange(next / 100);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const next = cents * 10 + parseInt(e.key);
      if (next <= 999_999_999) push(next);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      push(Math.floor(cents / 10));
    } else if (e.key === 'Delete' || e.key === 'Escape') {
      e.preventDefault();
      push(0);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      placeholder={placeholder}
      onChange={() => {}}
      onKeyDown={onKeyDown}
      className="w-full text-right px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300 tabular-nums"
    />
  );
};

// ── Modal de rota ────────────────────────────────────────────────────────────

interface RouteModalProps {
  vehicleTypes: FreightVehicleType[];
  editingRoute: FreightRoute | null;
  onClose: () => void;
  onSave: (route: Omit<FreightRoute, 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const RouteModal: React.FC<RouteModalProps> = ({ vehicleTypes, editingRoute, onClose, onSave }) => {
  const blank = (): FreightRouteVehicleValue => ({ freight: 0, tollGoing: 0, tollReturning: 0, repasse: 0 });

  const [origin, setOrigin]           = useState(editingRoute?.originCity ?? '');
  const [destination, setDestination] = useState(editingRoute?.destinationCity ?? '');
  const [values, setValues] = useState<{ [code: string]: FreightRouteVehicleValue }>(() => {
    const init: { [code: string]: FreightRouteVehicleValue } = {};
    vehicleTypes.forEach(vt => {
      init[vt.code] = editingRoute?.vehicleValues[vt.code] ?? blank();
    });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!origin.trim() || !destination.trim()) return;
    setSaving(true);
    await onSave({
      id: editingRoute?.id ?? crypto.randomUUID(),
      originCity: origin.trim(),
      destinationCity: destination.trim(),
      vehicleValues: values,
    });
    setSaving(false);
  };

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
          {/* Cidades — CitySearchSelect */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Cidade Origem
              </label>
              <CitySearchSelect
                value={origin}
                onChange={setOrigin}
                placeholder="Buscar cidade de origem..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Cidade Destino
              </label>
              <CitySearchSelect
                value={destination}
                onChange={setDestination}
                placeholder="Buscar cidade de destino..."
              />
            </div>
          </div>

          {/* Valores por tipo de veículo */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
              Valores por Tipo de Veículo
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-blue-600 uppercase tracking-widest">Frete</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-orange-500 uppercase tracking-widest">Ped. Ida</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-emerald-600 uppercase tracking-widest">Ped. Volta</th>
                    <th className="text-right px-4 py-3 text-[10px] font-black text-violet-600 uppercase tracking-widest">Repasse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vehicleTypes.map(vt => (
                    <tr key={vt.code} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">{vt.code}</span>
                          <span className="text-[10px] text-slate-400 font-bold">({vt.name})</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <CurrencyInput
                          value={values[vt.code]?.freight ?? 0}
                          onChange={v => setValues(p => ({ ...p, [vt.code]: { ...p[vt.code], freight: v } }))}
                          placeholder="Frete"
                        />
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <CurrencyInput
                          value={values[vt.code]?.tollGoing ?? 0}
                          onChange={v => setValues(p => ({ ...p, [vt.code]: { ...p[vt.code], tollGoing: v } }))}
                          placeholder="Ped. Ida"
                        />
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <CurrencyInput
                          value={values[vt.code]?.tollReturning ?? 0}
                          onChange={v => setValues(p => ({ ...p, [vt.code]: { ...p[vt.code], tollReturning: v } }))}
                          placeholder="Ped. Volta"
                        />
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <CurrencyInput
                          value={values[vt.code]?.repasse ?? 0}
                          onChange={v => setValues(p => ({ ...p, [vt.code]: { ...p[vt.code], repasse: v } }))}
                          placeholder="Repasse"
                        />
                      </td>
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
      id: crypto.randomUUID(),
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

// ── View: Tabela de Frete (SmartOperationTable) ───────────────────────────────

interface FreightTableViewProps {
  userId: string;
  routes: FreightRoute[];
  vehicleTypes: FreightVehicleType[];
  onEdit: (r: FreightRoute) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onManageTypes: () => void;
}

const FreightTableView: React.FC<FreightTableViewProps> = ({
  userId, routes, vehicleTypes, onEdit, onDelete, onAdd, onManageTypes,
}) => {
  // Achata dados para SmartOperationTable
  const tableData = useMemo(() => routes.map(r => {
    const row: any = {
      id: r.id,
      originCity: r.originCity,
      destinationCity: r.destinationCity,
      _route: r,
    };
    vehicleTypes.forEach(vt => {
      const v = r.vehicleValues[vt.code];
      row[`${vt.code}_frete`]   = v?.freight      ?? 0;
      row[`${vt.code}_ida`]     = v?.tollGoing     ?? 0;
      row[`${vt.code}_volta`]   = v?.tollReturning ?? 0;
      row[`${vt.code}_repasse`] = v?.repasse       ?? 0;
    });
    return row;
  }), [routes, vehicleTypes]);

  // Colunas dinâmicas por tipo de veículo
  const columns = useMemo(() => {
    const base = [
      {
        key: 'originCity',
        label: 'Origem',
        sortable: true,
        render: (row: any) => (
          <span className="font-bold text-slate-800 text-xs">{row.originCity}</span>
        ),
      },
      {
        key: 'destinationCity',
        label: 'Destino',
        sortable: true,
        render: (row: any) => (
          <span className="text-slate-600 text-xs font-medium">{row.destinationCity}</span>
        ),
      },
    ];

    const money = (v: number) =>
      v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

    const vtCols = [
      {
        key: 'col_frete',
        label: 'Frete',
        sortable: false,
        render: (row: any) => (
          <div className="flex flex-col gap-1">
            {vehicleTypes.map(vt => {
              const val = money(row[`${vt.code}_frete`] ?? 0);
              return (
                <div key={vt.code} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase leading-none shrink-0">
                    {vt.code}
                  </span>
                  <span className="text-xs font-bold text-slate-700 tabular-nums">
                    {val ?? <span className="text-slate-300 font-normal">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ),
      },
      {
        key: 'col_ida',
        label: 'Pedágio Ida',
        sortable: false,
        render: (row: any) => (
          <div className="flex flex-col gap-1">
            {vehicleTypes.map(vt => {
              const val = money(row[`${vt.code}_ida`] ?? 0);
              return (
                <div key={vt.code} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded text-[9px] font-black uppercase leading-none shrink-0">
                    {vt.code}
                  </span>
                  <span className="text-xs text-slate-600 tabular-nums">
                    {val ?? <span className="text-slate-300">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ),
      },
      {
        key: 'col_volta',
        label: 'Pedágio Volta',
        sortable: false,
        render: (row: any) => (
          <div className="flex flex-col gap-1">
            {vehicleTypes.map(vt => {
              const val = money(row[`${vt.code}_volta`] ?? 0);
              return (
                <div key={vt.code} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase leading-none shrink-0">
                    {vt.code}
                  </span>
                  <span className="text-xs text-slate-600 tabular-nums">
                    {val ?? <span className="text-slate-300">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ),
      },
      {
        key: 'col_repasse',
        label: 'Repasse',
        sortable: false,
        render: (row: any) => (
          <div className="flex flex-col gap-1">
            {vehicleTypes.map(vt => {
              const val = money(row[`${vt.code}_repasse`] ?? 0);
              return (
                <div key={vt.code} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-[9px] font-black uppercase leading-none shrink-0">
                    {vt.code}
                  </span>
                  <span className="text-xs text-slate-600 tabular-nums">
                    {val ?? <span className="text-slate-300">—</span>}
                  </span>
                </div>
              );
            })}
          </div>
        ),
      },
    ];

    const actions = {
      key: 'actions',
      label: 'Ações',
      sortable: false,
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onEdit(row._route); }}
            className="p-2 hover:bg-blue-100 rounded-lg text-blue-500 transition-all"
            title="Editar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(row.id); }}
            className="p-2 hover:bg-red-100 rounded-lg text-red-400 transition-all"
            title="Excluir"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      ),
    };

    return [...base, ...vtCols, actions];
  }, [vehicleTypes, onEdit, onDelete]);

  const defaultVisibleKeys = useMemo(
    () => ['originCity', 'destinationCity', 'col_frete', 'col_ida', 'col_volta', 'col_repasse', 'actions'],
    []
  );

  return (
    <div className="space-y-4">
      {/* Botões de ação acima da tabela */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onManageTypes}
          className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 shadow-sm transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
          Tipos de Veículo
        </button>
        <button
          onClick={onAdd}
          className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Nova Rota
        </button>
      </div>

      <SmartOperationTable
        userId={userId}
        componentId="freight-routes-table"
        title="Rotas Cadastradas"
        columns={columns}
        data={tableData}
        defaultVisibleKeys={defaultVisibleKeys}
        noMaxHeight
      />
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
  const [axlesFull, setAxlesFull]   = useState(6);

  const routeOptions = useMemo<SelectOption[]>(() =>
    routes.map(r => ({ value: r.id, label: `${r.originCity} → ${r.destinationCity}` })),
    [routes]
  );

  const selectedRoute = useMemo(
    () => routes.find(r => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const totals = useMemo(() => {
    if (!selectedRoute) return null;
    return vehicleTypes.reduce(
      (acc, vt) => {
        const v = selectedRoute.vehicleValues[vt.code];
        if (!v) return acc;
        return {
          freight:       acc.freight       + v.freight,
          tollGoing:     acc.tollGoing     + v.tollGoing,
          tollReturning: acc.tollReturning + v.tollReturning,
          repasse:       acc.repasse       + (v.repasse ?? 0),
          total:         acc.total         + v.freight + v.tollGoing + v.tollReturning + (v.repasse ?? 0),
        };
      },
      { freight: 0, tollGoing: 0, tollReturning: 0, repasse: 0, total: 0 }
    );
  }, [selectedRoute, vehicleTypes]);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Configuração */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuração</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Rota — CustomSelect personalizado */}
          <div className="sm:col-span-1">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rota</label>
            <CustomSelect
              value={selectedRouteId}
              onChange={setSelectedRouteId}
              options={routeOptions}
              placeholder="Selecione uma rota..."
              searchable={routes.length > 5}
            />
          </div>

          {/* Eixos Ida */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Eixos na Ida
              <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] font-black normal-case">Vazio</span>
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => setAxlesEmpty(v => Math.max(1, v - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all">−</button>
              <input
                type="number" min="1" max="20"
                value={axlesEmpty}
                onChange={e => setAxlesEmpty(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => setAxlesEmpty(v => Math.min(20, v + 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all">+</button>
            </div>
          </div>

          {/* Eixos Volta */}
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Eixos na Volta
              <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-600 rounded text-[8px] font-black normal-case">Cheio</span>
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => setAxlesFull(v => Math.max(1, v - 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all">−</button>
              <input
                type="number" min="1" max="20"
                value={axlesFull}
                onChange={e => setAxlesFull(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={() => setAxlesFull(v => Math.min(20, v + 1))}
                className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 text-lg font-black flex items-center justify-center hover:bg-slate-200 transition-all">+</button>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
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
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">Frete</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-orange-500 uppercase tracking-widest">Pedágio Ida</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest">Pedágio Volta</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-violet-600 uppercase tracking-widest">Repasse</th>
                  <th className="text-right px-5 py-3.5 text-[9px] font-black text-slate-700 uppercase tracking-widest">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vehicleTypes.map(vt => {
                  const v = selectedRoute.vehicleValues[vt.code];
                  const rep = v?.repasse ?? 0;
                  const total = (v?.freight ?? 0) + (v?.tollGoing ?? 0) + (v?.tollReturning ?? 0) + rep;
                  return (
                    <tr key={vt.code} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">{vt.code}</span>
                          <span className="text-[10px] text-slate-400 font-bold">({vt.name})</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-bold text-blue-700">{v ? fmt(v.freight) : '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-orange-600">{v ? fmt(v.tollGoing) : '—'}</span>
                          {v && v.tollGoing > 0 && (
                            <span className="text-[9px] text-slate-400">{axlesEmpty} eixos vazios</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-emerald-700">{v ? fmt(v.tollReturning) : '—'}</span>
                          {v && v.tollReturning > 0 && (
                            <span className="text-[9px] text-slate-400">{axlesFull} eixos cheios</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-bold text-violet-700">{rep > 0 ? fmt(rep) : '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={`text-sm font-black ${total > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                          {total > 0 ? fmt(total) : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {totals && totals.total > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase">Total Geral</td>
                    <td className="px-5 py-4 text-right text-xs font-black text-blue-700">{fmt(totals.freight)}</td>
                    <td className="px-5 py-4 text-right text-xs font-black text-orange-600">{fmt(totals.tollGoing)}</td>
                    <td className="px-5 py-4 text-right text-xs font-black text-emerald-700">{fmt(totals.tollReturning)}</td>
                    <td className="px-5 py-4 text-right text-xs font-black text-violet-700">{fmt(totals.repasse)}</td>
                    <td className="px-5 py-4 text-right text-sm font-black text-slate-800">{fmt(totals.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-6 text-[10px] text-slate-400">
            <span>Pedágios fixos por rota/tipo de veículo · Eixos exibidos para referência operacional</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Tab principal ─────────────────────────────────────────────────────────────

interface FreightTableTabProps {
  userId: string;
}

const FreightTableTab: React.FC<FreightTableTabProps> = ({ userId }) => {
  const [view, setView] = useState<View>('table');
  const [routes, setRoutes] = useState<FreightRoute[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<FreightVehicleType[]>([]);
  const [loading, setLoading] = useState(true);

  const [isRouteModalOpen, setIsRouteModalOpen]         = useState(false);
  const [isVehicleTypesModalOpen, setIsVehicleTypesModalOpen] = useState(false);
  const [editingRoute, setEditingRoute]                 = useState<FreightRoute | null>(null);

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tabela de Frete</h1>
          <p className="text-xs text-slate-400 mt-0.5">Gerencie fretes e pedágios por rota e tipo de veículo</p>
        </div>

        <div className="flex bg-slate-100 rounded-2xl p-1 self-start sm:self-auto">
          <button
            onClick={() => setView('table')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Tabela
          </button>
          <button
            onClick={() => setView('calculator')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              view === 'calculator' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Calculadora de Rota
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'table' ? (
        <FreightTableView
          userId={userId}
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

      {isRouteModalOpen && (
        <RouteModal
          vehicleTypes={vehicleTypes}
          editingRoute={editingRoute}
          onClose={() => { setIsRouteModalOpen(false); setEditingRoute(null); }}
          onSave={handleSaveRoute}
        />
      )}

      {isVehicleTypesModalOpen && (
        <VehicleTypesModal
          vehicleTypes={vehicleTypes}
          onClose={() => setIsVehicleTypesModalOpen(false)}
          onSave={handleSaveVehicleTypes}
        />
      )}

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
