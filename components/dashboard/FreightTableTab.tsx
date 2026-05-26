import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { FreightRoute, FreightVehicleType, FreightRouteVehicleValue } from '../../types';
import { db } from '../../utils/storage';
import { excelStyles } from '../../utils/excelStyles';
import CustomSelect, { SelectOption } from '../shared/CustomSelect';
import CitySearchSelect from '../shared/CitySearchSelect';
import SmartOperationTable from './operations/SmartOperationTable';

type View = 'table' | 'calculator';

const DEFAULT_VEHICLE_TYPES: FreightVehicleType[] = [
  { id: 'l',  code: 'L',  name: 'Leve',             sortOrder: 1, axlesGoing: 4, axlesReturning: 5 },
  { id: 'ls', code: 'LS', name: 'Leve Semi-Reboque', sortOrder: 2, axlesGoing: 4, axlesReturning: 6 },
  { id: 'm',  code: 'M',  name: 'Médio',             sortOrder: 3, axlesGoing: 4, axlesReturning: 6 },
  { id: 'ml', code: 'ML', name: 'Médio Rod. Leve',   sortOrder: 4, axlesGoing: 5, axlesReturning: 7 },
  { id: 've', code: 'VE', name: 'Veículo Especial',  sortOrder: 5, axlesGoing: 6, axlesReturning: 9 },
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

  // Consulta RotasBrasil
  const [viaConsulta, setViaConsulta]   = useState('');
  const [consultando, setConsultando]   = useState(false);
  const [consultError, setConsultError] = useState<string | null>(null);
  const [consultOk, setConsultOk]       = useState(false);

  const handleConsultarPedagios = async () => {
    if (!origin.trim() || !destination.trim()) return;
    setConsultando(true);
    setConsultError(null);
    setConsultOk(false);

    const orig = toApiCity(origin);
    const dest = toApiCity(destination);
    const via  = viaConsulta ? toApiCity(viaConsulta) : undefined;

    // Deduplica chamadas por quantidade de eixos
    const goingAxles     = [...new Set(vehicleTypes.map(vt => vt.axlesGoing))];
    const returningAxles = [...new Set(vehicleTypes.map(vt => vt.axlesReturning))];

    try {
      const [goingRes, returningRes] = await Promise.all([
        Promise.all(goingAxles.map(ax =>
          db.consultarPedagioRotas(orig, dest, ax, via).then(r => ({ ax, data: r }))
        )),
        Promise.all(returningAxles.map(ax =>
          db.consultarPedagioRotas(orig, dest, ax, via).then(r => ({ ax, data: r }))
        )),
      ]);

      const anyErr = [...goingRes, ...returningRes].find(r => r.data?.error);
      if (anyErr) { setConsultError(String(anyErr.data.error)); return; }

      const goingMap     = new Map(goingRes.map(r => [r.ax, extractToll(r.data)]));
      const returningMap = new Map(returningRes.map(r => [r.ax, extractToll(r.data)]));

      setValues(prev => {
        const next = { ...prev };
        vehicleTypes.forEach(vt => {
          const tg = goingMap.get(vt.axlesGoing)     ?? 0;
          const tv = returningMap.get(vt.axlesReturning) ?? 0;
          const fr = prev[vt.code]?.freight ?? 0;
          next[vt.code] = { ...next[vt.code], tollGoing: tg, tollReturning: tv, repasse: fr + tg + tv };
        });
        return next;
      });
      setConsultOk(true);
    } catch (e) {
      setConsultError(String(e));
    } finally {
      setConsultando(false);
    }
  };

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

          {/* Consulta automática de pedágios */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
              Calcular Pedágios via RotasBrasil
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Via (opcional)
                  <span className="ml-2 text-slate-300 normal-case font-normal">define o trecho/rodovia</span>
                </label>
                <CitySearchSelect
                  value={viaConsulta}
                  onChange={setViaConsulta}
                  placeholder="Ex: Cotia - SP (para usar Rodoanel)..."
                />
              </div>
              <div className="flex flex-col justify-end gap-2">
                <button
                  type="button"
                  onClick={handleConsultarPedagios}
                  disabled={consultando || !origin.trim() || !destination.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {consultando ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Consultando API...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      Calcular e Preencher
                    </>
                  )}
                </button>
                {consultOk && (
                  <p className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                    </svg>
                    Pedágios preenchidos com sucesso
                  </p>
                )}
              </div>
            </div>
            {viaConsulta && origin && destination && (
              <p className="text-[9px] text-slate-400">
                Trajeto: {origin} → <span className="text-blue-600 font-bold">{viaConsulta}</span> → {destination}
              </p>
            )}
            {consultError && (
              <p className="text-[10px] text-red-500 font-medium">{consultError}</p>
            )}
            <p className="text-[9px] text-slate-300">
              Cada tipo de veículo usa seus próprios eixos cadastrados. Preenche automaticamente os campos de Pedágio Ida e Pedágio Volta abaixo.
            </p>
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
                    <th className="text-right px-4 py-3 text-[10px] font-black text-violet-600 uppercase tracking-widest">
                      Repasse
                      <span className="ml-1 normal-case font-normal text-violet-400">(auto)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {vehicleTypes.map(vt => (
                    <tr key={vt.code} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase">{vt.code}</span>
                            <span className="text-[10px] text-slate-400 font-bold">({vt.name})</span>
                          </span>
                          <span className="text-[9px] text-slate-300 pl-0.5">
                            ida {vt.axlesGoing} eixos · volta {vt.axlesReturning} eixos
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <CurrencyInput
                          value={values[vt.code]?.freight ?? 0}
                          onChange={v => setValues(p => {
                            const tg = p[vt.code]?.tollGoing ?? 0;
                            const tv = p[vt.code]?.tollReturning ?? 0;
                            return { ...p, [vt.code]: { ...p[vt.code], freight: v, repasse: v + tg + tv } };
                          })}
                          placeholder="Frete"
                        />
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <CurrencyInput
                          value={values[vt.code]?.tollGoing ?? 0}
                          onChange={v => setValues(p => {
                            const fr = p[vt.code]?.freight ?? 0;
                            const tv = p[vt.code]?.tollReturning ?? 0;
                            return { ...p, [vt.code]: { ...p[vt.code], tollGoing: v, repasse: fr + v + tv } };
                          })}
                          placeholder="Ped. Ida"
                        />
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <CurrencyInput
                          value={values[vt.code]?.tollReturning ?? 0}
                          onChange={v => setValues(p => {
                            const fr = p[vt.code]?.freight ?? 0;
                            const tg = p[vt.code]?.tollGoing ?? 0;
                            return { ...p, [vt.code]: { ...p[vt.code], tollReturning: v, repasse: fr + tg + v } };
                          })}
                          placeholder="Ped. Volta"
                        />
                      </td>
                      <td className="px-3 py-2.5 w-36">
                        <div className="w-full text-right px-3 py-2 rounded-lg border border-violet-100 bg-violet-50 text-sm font-bold text-violet-700 tabular-nums">
                          {fmt(values[vt.code]?.repasse ?? 0)}
                        </div>
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
  const [newCode, setNewCode]           = useState('');
  const [newName, setNewName]           = useState('');
  const [newAxlesGoing, setNewAxlesGoing]         = useState(4);
  const [newAxlesReturning, setNewAxlesReturning] = useState(6);
  const [saving, setSaving] = useState(false);

  const addType = () => {
    if (!newCode.trim() || !newName.trim()) return;
    if (types.find(t => t.code === newCode.toUpperCase())) return;
    setTypes(prev => [...prev, {
      id: crypto.randomUUID(),
      code: newCode.toUpperCase().trim(),
      name: newName.trim(),
      sortOrder: prev.length + 1,
      axlesGoing:     newAxlesGoing,
      axlesReturning: newAxlesReturning,
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
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-600 font-medium truncate">{t.name}</p>
                  <p className="text-[9px] text-slate-400">
                    ida {t.axlesGoing ?? 4} eixos · volta {t.axlesReturning ?? 6} eixos
                  </p>
                </div>
                <button onClick={() => removeType(t.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400 transition-all shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Adicionar Tipo</p>
            <div className="flex gap-2 flex-wrap">
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value)}
                placeholder="Código"
                maxLength={6}
                className="w-20 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Nome do tipo"
                className="flex-1 min-w-[120px] px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">Ida</span>
                <input type="number" min="1" max="20" value={newAxlesGoing}
                  onChange={e => setNewAxlesGoing(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center px-2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">Volta</span>
                <input type="number" min="1" max="20" value={newAxlesReturning}
                  onChange={e => setNewAxlesReturning(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-12 text-center px-2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
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

// ── Exportação Excel ──────────────────────────────────────────────────────────
async function exportFreightExcel(
  routes: FreightRoute[],
  vehicleTypes: FreightVehicleType[],
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ALS Logística';
  wb.created = new Date();

  const ws = wb.addWorksheet('Tabela de Frete', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // ── Linha 1: título mesclado ──────────────────────────────────────────────
  const totalCols = 2 + vehicleTypes.length * 4; // origem + destino + 4 cols por tipo
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell('A1');
  titleCell.value = 'TABELA DE FRETE — ALS LOGÍSTICA';
  titleCell.font   = { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  titleCell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } } as ExcelJS.Fill;
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // ── Linha 2: cabeçalhos ───────────────────────────────────────────────────
  const headerLabels: string[] = ['ORIGEM', 'DESTINO'];
  vehicleTypes.forEach(vt => {
    headerLabels.push(`${vt.code} (${vt.name}) — FRETE`);
    headerLabels.push(`${vt.code} (${vt.name}) — PED. IDA`);
    headerLabels.push(`${vt.code} (${vt.name}) — PED. VOLTA`);
    headerLabels.push(`${vt.code} (${vt.name}) — REPASSE`);
  });

  const headerRow = ws.getRow(2);
  headerRow.height = 36;
  headerLabels.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.style = { ...excelStyles.HEADER_STYLE };
  });

  // AutoFilter na linha de cabeçalho
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: totalCols } };

  // ── Dados ─────────────────────────────────────────────────────────────────
  routes.forEach((route, rowIdx) => {
    const isEven = rowIdx % 2 === 0;
    const rowFill: ExcelJS.Fill = isEven
      ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
      : excelStyles.ZEBRA_ROW_EVEN;

    const values: (string | number)[] = [route.originCity, route.destinationCity];
    vehicleTypes.forEach(vt => {
      const v = route.vehicleValues[vt.code];
      values.push(v?.freight      ?? 0);
      values.push(v?.tollGoing    ?? 0);
      values.push(v?.tollReturning ?? 0);
      values.push(v?.repasse       ?? 0);
    });

    const dataRow = ws.addRow(values);
    dataRow.height = 20;
    dataRow.eachCell((cell, colNum) => {
      cell.border = excelStyles.BORDER_THIN;
      cell.fill   = rowFill;
      if (colNum <= 2) {
        cell.font      = { bold: true, name: 'Calibri', size: 10 };
        cell.alignment = excelStyles.DATA_STYLE_LEFT;
      } else {
        cell.numFmt    = excelStyles.FORMATS.CURRENCY;
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.font      = { name: 'Calibri', size: 10 };
      }
    });
  });

  // ── Largura das colunas ───────────────────────────────────────────────────
  ws.getColumn(1).width = 30; // origem
  ws.getColumn(2).width = 30; // destino
  let colIdx = 3;
  vehicleTypes.forEach(() => {
    ws.getColumn(colIdx).width     = 20; // frete
    ws.getColumn(colIdx + 1).width = 20; // ped. ida
    ws.getColumn(colIdx + 2).width = 20; // ped. volta
    ws.getColumn(colIdx + 3).width = 18; // repasse
    colIdx += 4;
  });

  // ── Download ──────────────────────────────────────────────────────────────
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tabela-frete-als-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

const FreightTableView: React.FC<FreightTableViewProps> = ({
  userId, routes, vehicleTypes, onEdit, onDelete, onAdd, onManageTypes,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try { await exportFreightExcel(routes, vehicleTypes); }
    finally { setExporting(false); }
  };
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
          onClick={handleExport}
          disabled={exporting || routes.length === 0}
          className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 shadow-sm transition-all flex items-center gap-2 disabled:opacity-40"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          {exporting ? 'Exportando...' : 'Baixar Planilha'}
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

// ── Conversão cidade "NOME - UF" → "nome,estado" para a API RotasBrasil ───────
const UF_ESTADO: Record<string, string> = {
  AC:'acre',AL:'alagoas',AM:'amazonas',AP:'amapa',BA:'bahia',CE:'ceara',
  DF:'distrito federal',ES:'espirito santo',GO:'goias',MA:'maranhao',
  MG:'minas gerais',MS:'mato grosso do sul',MT:'mato grosso',PA:'para',
  PB:'paraiba',PE:'pernambuco',PI:'piaui',PR:'parana',
  RJ:'rio de janeiro',RN:'rio grande do norte',RO:'rondonia',RR:'roraima',
  RS:'rio grande do sul',SC:'santa catarina',SE:'sergipe',SP:'sao paulo',TO:'tocantins',
};
function toApiCity(label: string): string {
  const m = label.match(/^(.+?)\s*-\s*([A-Z]{2})$/);
  if (!m) return label.toLowerCase().replace(/\s*-\s*/g, ',');
  return `${m[1].trim().toLowerCase()},${UF_ESTADO[m[2]] ?? m[2].toLowerCase()}`;
}
function extractToll(data: any): number {
  if (!data) return 0;
  for (const k of ['pedagio','pedagioTotal','total_pedagio','totalPedagio','valor_pedagio','vl_pedagio']) {
    const v = (data as any)[k];
    if (typeof v === 'number') return v;
    if (typeof v === 'string') { const n = parseFloat(v.replace(/[^0-9,]/g,'').replace(',','.')); if (!isNaN(n) && n > 0) return n; }
  }
  if (Array.isArray(data?.pedagios)) {
    const sum = data.pedagios.reduce((s: number, p: any) => {
      const v = p.valor ?? p.value ?? p.vl_pedagio ?? 0;
      return s + (typeof v === 'number' ? v : 0);
    }, 0);
    if (sum > 0) return sum;
  }
  return 0;
}

const CalculatorView: React.FC<CalculatorViewProps> = ({ routes, vehicleTypes }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    () => new Set(vehicleTypes.map(vt => vt.code))
  );
  // API RotasBrasil
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [viaCity, setViaCity] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [tollLive, setTollLive] = useState<{
    ida: number; volta: number; routeLabel: string; distancia: string; creditos: number | null;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Sync selectedTypes when vehicleTypes prop changes (e.g. after first load)
  const prevVtRef = React.useRef(vehicleTypes);
  useEffect(() => {
    if (prevVtRef.current !== vehicleTypes) {
      prevVtRef.current = vehicleTypes;
      setSelectedTypes(new Set(vehicleTypes.map(vt => vt.code)));
    }
  }, [vehicleTypes]);

  const toggleType = (code: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(code)) { if (next.size > 1) next.delete(code); }
      else next.add(code);
      return next;
    });
  };

  const routeOptions = useMemo<SelectOption[]>(() =>
    routes.map(r => ({ value: r.id, label: `${r.originCity} → ${r.destinationCity}` })),
    [routes]
  );

  const selectedRoute = useMemo(
    () => routes.find(r => r.id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  );

  const visibleTypes = useMemo(
    () => vehicleTypes.filter(vt => selectedTypes.has(vt.code)),
    [vehicleTypes, selectedTypes]
  );

  const totals = useMemo(() => {
    if (!selectedRoute) return null;
    return visibleTypes.reduce(
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
  }, [selectedRoute, visibleTypes]);

  const handleConsultar = async () => {
    if (!selectedRoute) return;
    setConsultando(true);
    setApiError(null);
    setTollLive(null);
    const origin = toApiCity(selectedRoute.originCity);
    const dest   = toApiCity(selectedRoute.destinationCity);
    const via    = viaCity ? toApiCity(viaCity) : undefined;
    // Usa eixos do primeiro tipo visível como referência para exibição
    const refType = visibleTypes[0];
    const axlesGoing    = refType?.axlesGoing     ?? 4;
    const axlesReturning = refType?.axlesReturning ?? 6;
    try {
      const [resIda, resVolta] = await Promise.all([
        db.consultarPedagioRotas(origin, dest, axlesGoing,    via),
        db.consultarPedagioRotas(origin, dest, axlesReturning, via),
      ]);
      if (resIda?.error)   { setApiError(String(resIda.error));   return; }
      if (resVolta?.error) { setApiError(String(resVolta.error)); return; }
      const routeLabel = resIda?.rota ?? resIda?.nome ?? resIda?.highway ?? resIda?.rodovia ?? '';
      const distancia  = String(resIda?.distancia ?? resIda?.distance ?? '');
      const creditos   = resIda?.creditos ?? resIda?.credits ?? null;
      setTollLive({ ida: extractToll(resIda), volta: extractToll(resVolta), routeLabel, distancia, creditos });
    } catch (e) {
      setApiError(String(e));
    } finally {
      setConsultando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Configuração */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuração</p>

        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Rota</label>
          <CustomSelect
            value={selectedRouteId}
            onChange={setSelectedRouteId}
            options={routeOptions}
            placeholder="Selecione uma rota..."
            searchable={routes.length > 5}
          />
        </div>

        {/* Filtro de tipos de veículo */}
        {vehicleTypes.length > 0 && (
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Tipos de Veículo Exibidos
            </label>
            <div className="flex flex-wrap gap-2">
              {vehicleTypes.map(vt => {
                const active = selectedTypes.has(vt.code);
                return (
                  <button
                    key={vt.code}
                    type="button"
                    onClick={() => toggleType(vt.code)}
                    className={[
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border',
                      active
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                        : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300',
                    ].join(' ')}
                  >
                    <span>{vt.code}</span>
                    <span className={`font-medium normal-case ${active ? 'text-blue-200' : 'text-slate-300'}`}>
                      {vt.name}
                    </span>
                    {active && (
                      <svg className="w-3 h-3 text-blue-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Consulta Online (RotasBrasil) ── */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowApiPanel(v => !v)}
            className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
            Consultar Pedágios Online · RotasBrasil
            <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${showApiPanel ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          {showApiPanel && (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Via (cidade intermediária)
                  <span className="ml-2 text-slate-300 normal-case font-medium">opcional · define o trecho/rodovia</span>
                </label>
                <CitySearchSelect
                  value={viaCity}
                  onChange={setViaCity}
                  placeholder="Ex: Cotia - SP (para usar Rodoanel)..."
                />
              </div>

              {viaCity && selectedRoute && (
                <p className="text-[9px] text-slate-400 font-medium -mt-1">
                  Trajeto: {selectedRoute.originCity}
                  {' → '}
                  <span className="text-blue-600 font-black">{viaCity}</span>
                  {' → '}
                  {selectedRoute.destinationCity}
                </p>
              )}

              <p className="text-[9px] text-slate-300 -mt-1">
                Para alterar o trecho, adicione uma cidade intermediária. Ex: para usar o Rodoanel ao invés da Bandeirantes, adicione uma cidade ao longo do Rodoanel (ex: Cotia - SP).
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleConsultar}
                  disabled={consultando || !selectedRoute}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  {consultando ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Consultando...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                      </svg>
                      Calcular Pedágios
                    </>
                  )}
                </button>
                {tollLive && (
                  <button
                    type="button"
                    onClick={() => { setTollLive(null); setApiError(null); }}
                    className="text-[9px] font-black text-slate-400 uppercase hover:text-slate-600 transition-colors"
                  >
                    Limpar resultado
                  </button>
                )}
              </div>

              {apiError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                  <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <p className="text-[10px] text-red-600 font-medium break-words">{apiError}</p>
                </div>
              )}
            </div>
          )}
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

      {/* ── Resultado da consulta online ── */}
      {tollLive && selectedRoute && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Pedágios Calculados · RotasBrasil</p>
              </div>
              {tollLive.routeLabel && (
                <p className="text-xs font-bold text-slate-700">{tollLive.routeLabel}</p>
              )}
              <p className="text-[9px] text-slate-400 mt-0.5">
                {selectedRoute.originCity}
                {viaCity ? <> → <span className="text-blue-600 font-bold">{viaCity}</span></> : null}
                {' → '}{selectedRoute.destinationCity}
                {tollLive.distancia ? ` · ${tollLive.distancia}` : ''}
              </p>
            </div>
            {tollLive.creditos !== null && (
              <span className="text-[9px] font-bold text-slate-400 shrink-0 bg-white/70 px-2 py-1 rounded-lg">
                {tollLive.creditos} créditos
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-orange-100">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-2">
                Pedágio Ida · {visibleTypes[0]?.axlesGoing ?? 4} eixos vazios
              </p>
              <p className="text-2xl font-black text-slate-800 tabular-nums">
                {tollLive.ida > 0
                  ? tollLive.ida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : <span className="text-slate-300">—</span>
                }
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-emerald-100">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">
                Pedágio Volta · {visibleTypes[0]?.axlesReturning ?? 6} eixos cheios
              </p>
              <p className="text-2xl font-black text-slate-800 tabular-nums">
                {tollLive.volta > 0
                  ? tollLive.volta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : <span className="text-slate-300">—</span>
                }
              </p>
            </div>
          </div>

          <p className="text-[9px] text-slate-300 mt-3">
            Valores calculados pela API RotasBrasil para veículo tipo caminhão. Para salvar estes valores no cadastro da rota, edite a rota e preencha os campos de pedágio manualmente.
          </p>
        </div>
      )}

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
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {visibleTypes.map(vt => (
                <span key={vt.code} className="text-[8px] font-black text-blue-200 bg-blue-500/30 px-2 py-1 rounded-lg">
                  {vt.code} · {vt.axlesGoing}↑ {vt.axlesReturning}↓
                </span>
              ))}
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
                {visibleTypes.map(vt => {
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
                            <span className="text-[9px] text-slate-400">{vt.axlesGoing} eixos vazios</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-emerald-700">{v ? fmt(v.tollReturning) : '—'}</span>
                          {v && v.tollReturning > 0 && (
                            <span className="text-[9px] text-slate-400">{vt.axlesReturning} eixos cheios</span>
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
