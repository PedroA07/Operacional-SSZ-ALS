import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../../utils/storage';
import { OperationTypeConfig, OperationTypeTripRule } from '../../../types';

interface OT { id: string; name: string; color: string; config: OperationTypeConfig }
interface Cat { id: string; name: string; color?: string }
interface TipoViagem { id: string; name: string; color: string }
interface Customer { id: string; name: string }

// ─── Mini customer multi-select ──────────────────────────────────────────────
function CustomerPicker({ all, selected, onChange }: {
  all: Customer[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = all.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="p-2 border-b border-slate-100">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full px-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>
      <div className="max-h-36 overflow-y-auto divide-y divide-slate-50">
        {filtered.length === 0 && (
          <p className="text-[9px] text-slate-400 text-center py-3">Nenhum cliente encontrado</p>
        )}
        {filtered.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 transition-colors ${selected.includes(c.id) ? 'bg-blue-50' : ''}`}
          >
            <div className={`w-3 h-3 rounded border-2 shrink-0 flex items-center justify-center transition-all ${selected.includes(c.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
              {selected.includes(c.id) && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg>}
            </div>
            <span className="text-[10px] font-bold text-slate-700 truncate">{c.name}</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="p-2 border-t border-slate-100 flex flex-wrap gap-1">
          {selected.map(id => {
            const c = all.find(x => x.id === id);
            return c ? (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[8px] font-black uppercase">
                {c.name}
                <button type="button" onClick={() => toggle(id)} className="hover:text-red-500 transition-colors">✕</button>
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

// ─── Trip-type rule row ───────────────────────────────────────────────────────
function TripTypeRuleRow({ rule, tiposViagem, allCustomers, onUpdate, onRemove }: {
  rule: OperationTypeTripRule;
  tiposViagem: TipoViagem[];
  allCustomers: Customer[];
  onUpdate: (r: OperationTypeTripRule) => void;
  onRemove: () => void;
}) {
  const tipo = tiposViagem.find(t => t.id === rule.tripTypeId);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className={`flex items-center gap-3 px-3 py-2.5 ${expanded ? 'bg-slate-50 border-b border-slate-200' : 'bg-white'}`}>
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tipo?.color || '#94a3b8' }} />
        <span className="text-[10px] font-black text-slate-700 uppercase flex-1 truncate">{tipo?.name || rule.tripTypeId}</span>
        {rule.isDefault && (
          <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase shrink-0">Padrão</span>
        )}
        <span className="text-[9px] text-slate-400 shrink-0">
          {(rule.customerIds?.length ?? 0) === 0 ? 'Todos clientes' : `${rule.customerIds!.length} cliente(s)`}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="p-1 text-slate-400 hover:text-blue-500 transition-colors rounded-lg hover:bg-blue-50"
          title="Expandir"
        >
          <svg className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
          title="Remover"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-3 bg-slate-50/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => onUpdate({ ...rule, isDefault: !rule.isDefault })}
              className={`w-8 h-4 rounded-full transition-all relative ${rule.isDefault ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${rule.isDefault ? 'left-4' : 'left-0.5'}`} />
            </div>
            <span className="text-[10px] font-black text-slate-600 uppercase">Tipo padrão para esta operação</span>
          </label>

          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1.5">
              Clientes vinculados <span className="font-normal">(vazio = todos)</span>
            </p>
            <CustomerPicker
              all={allCustomers}
              selected={rule.customerIds || []}
              onChange={ids => onUpdate({ ...rule, customerIds: ids })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Config panel (per operation type) ───────────────────────────────────────
function ConfigPanel({ ot, categories, tiposViagem, allCustomers, onSave }: {
  ot: OT;
  categories: Cat[];
  tiposViagem: TipoViagem[];
  allCustomers: Customer[];
  onSave: (config: OperationTypeConfig) => Promise<void>;
}) {
  const [config, setConfig] = useState<OperationTypeConfig>(ot.config || {});
  const [saving, setSaving] = useState(false);
  const [addingTripType, setAddingTripType] = useState(false);
  const [newTripTypeId, setNewTripTypeId] = useState('');

  const usedIds = new Set((config.tripTypeRules || []).map(r => r.tripTypeId));
  const availableToAdd = tiposViagem.filter(t => !usedIds.has(t.id));

  const updateRule = (idx: number, updated: OperationTypeTripRule) => {
    const rules = [...(config.tripTypeRules || [])];
    rules[idx] = updated;
    setConfig(c => ({ ...c, tripTypeRules: rules }));
  };

  const removeRule = (idx: number) => {
    const rules = [...(config.tripTypeRules || [])];
    rules.splice(idx, 1);
    setConfig(c => ({ ...c, tripTypeRules: rules }));
  };

  const addRule = () => {
    if (!newTripTypeId) return;
    setConfig(c => ({
      ...c,
      tripTypeRules: [...(c.tripTypeRules || []), { tripTypeId: newTripTypeId, customerIds: [] }]
    }));
    setNewTripTypeId('');
    setAddingTripType(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(config);
    setSaving(false);
  };

  return (
    <div className="mt-3 border border-blue-100 rounded-2xl p-4 bg-blue-50/30 space-y-4">
      {/* Categoria padrão */}
      <div>
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Categoria Padrão</label>
        <select
          value={config.defaultCategoryId || ''}
          onChange={e => setConfig(c => ({ ...c, defaultCategoryId: e.target.value || undefined }))}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">— Sem categoria padrão —</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Tipos de viagem */}
      <div>
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Tipos de Viagem</label>
        <div className="space-y-2">
          {(config.tripTypeRules || []).length === 0 && (
            <p className="text-[9px] text-slate-400 italic py-1">Nenhum tipo de viagem configurado — todos serão exibidos sem regra.</p>
          )}
          {(config.tripTypeRules || []).map((rule, idx) => (
            <TripTypeRuleRow
              key={rule.tripTypeId}
              rule={rule}
              tiposViagem={tiposViagem}
              allCustomers={allCustomers}
              onUpdate={updated => updateRule(idx, updated)}
              onRemove={() => removeRule(idx)}
            />
          ))}
        </div>

        {addingTripType ? (
          <div className="flex gap-2 mt-2">
            <select
              value={newTripTypeId}
              onChange={e => setNewTripTypeId(e.target.value)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            >
              <option value="">Selecionar tipo de viagem...</option>
              {availableToAdd.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addRule}
              disabled={!newTripTypeId}
              className="px-3 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={() => { setAddingTripType(false); setNewTripTypeId(''); }}
              className="px-3 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAddingTripType(true)}
            disabled={availableToAdd.length === 0}
            className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase hover:text-blue-700 disabled:opacity-40 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 4v16m8-8H4"/></svg>
            Adicionar Tipo de Viagem
          </button>
        )}
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar Configuração'}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OperationTypesManager() {
  const [types, setTypes] = useState<OT[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [tiposViagem, setTiposViagem] = useState<TipoViagem[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#3B82F6');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [defaultTypeId, setDefaultTypeId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, tv, cust] = await Promise.all([
        db.getOperationTypes(),
        db.getCategories(),
        db.getColetaTiposViagem(),
        db.getCustomers(),
      ]);
      setTypes(t as OT[]);
      setCategories(c as Cat[]);
      setTiposViagem(tv as TipoViagem[]);
      setAllCustomers((cust as any[]).map(c => ({ id: c.id, name: c.name })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const saved = localStorage.getItem('defaultOperationType');
    if (saved) setDefaultTypeId(saved);
  }, [load]);

  const handleSetDefault = (id: string) => {
    if (defaultTypeId === id) {
      setDefaultTypeId('');
      localStorage.removeItem('defaultOperationType');
    } else {
      setDefaultTypeId(id);
      localStorage.setItem('defaultOperationType', id);
    }
  };

  const handleEdit = (type: OT) => {
    setEditingId(type.id);
    setNewTypeName(type.name);
    setNewTypeColor(type.color || '#3B82F6');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setNewTypeName('');
    setNewTypeColor('#3B82F6');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setIsSaving(true);
    try {
      const existing = editingId ? types.find(t => t.id === editingId) : null;
      const success = await db.saveOperationType({
        id: editingId || undefined,
        name: newTypeName.trim().toUpperCase(),
        color: newTypeColor,
        config: existing?.config || {},
      });
      if (success) {
        setEditingId(null);
        setNewTypeName('');
        setNewTypeColor('#3B82F6');
        await load();
      } else alert('Erro ao salvar tipo de operação.');
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este tipo de operação?')) return;
    const success = await db.deleteOperationType(id);
    if (success) await load();
    else alert('Erro ao remover tipo de operação.');
  };

  const handleSaveConfig = async (type: OT, config: OperationTypeConfig) => {
    await db.saveOperationType({ ...type, config });
    await load();
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Tipos de Programação</h3>
        <p className="text-xs text-slate-500 mt-1">Gerencie modalidades e configure categoria padrão, tipos de viagem e clientes por operação.</p>
      </div>

      {/* Formulário novo/editar tipo */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-6">
        <input
          type="text"
          value={newTypeName}
          onChange={e => setNewTypeName(e.target.value)}
          placeholder="Ex: EXPORTAÇÃO, IMPORTAÇÃO, COLETA..."
          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSaving}
        />
        <input
          type="color"
          value={newTypeColor}
          onChange={e => setNewTypeColor(e.target.value)}
          className="w-12 h-12 p-1 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
          disabled={isSaving}
          title="Cor de destaque"
        />
        {editingId && (
          <button type="button" onClick={handleCancelEdit} disabled={isSaving}
            className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase hover:bg-slate-300 disabled:opacity-50 transition-colors">
            Cancelar
          </button>
        )}
        <button type="submit" disabled={isSaving || !newTypeName.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isSaving ? 'Salvando...' : editingId ? 'Salvar' : 'Adicionar'}
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">Carregando...</div>
      ) : types.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
          Nenhum tipo de operação cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {types.map(type => {
            const isExpanded = expandedId === type.id;
            const hasConfig = !!(type.config?.defaultCategoryId || (type.config?.tripTypeRules?.length ?? 0) > 0);
            const defaultCat = categories.find(c => c.id === type.config?.defaultCategoryId);
            return (
              <div key={type.id} className={`border rounded-2xl transition-all ${isExpanded ? 'border-blue-200 bg-blue-50/20 shadow-sm' : 'border-slate-200 bg-slate-50'}`}>
                {/* Cabeçalho do tipo */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: type.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-700">{type.name}</span>
                      {defaultTypeId === type.id && (
                        <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded uppercase">Padrão</span>
                      )}
                      {hasConfig && (
                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase">Configurado</span>
                      )}
                      {defaultCat && (
                        <span className="text-[8px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded uppercase font-bold">{defaultCat.name}</span>
                      )}
                      {(type.config?.tripTypeRules?.length ?? 0) > 0 && (
                        <span className="text-[8px] text-slate-500">· {type.config!.tripTypeRules!.length} tipo(s) de viagem</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Configurar */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : type.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${isExpanded ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600'}`}
                      title="Configurar regras"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
                      Configurar
                    </button>
                    {/* Editar nome/cor */}
                    <button onClick={() => handleEdit(type)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Editar nome/cor">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    {/* Padrão */}
                    <button onClick={() => handleSetDefault(type.id)}
                      className={`p-1.5 rounded-lg transition-all ${defaultTypeId === type.id ? 'text-yellow-500 bg-yellow-50' : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'}`}
                      title={defaultTypeId === type.id ? 'Remover padrão' : 'Definir como padrão'}>
                      <svg className="w-4 h-4" fill={defaultTypeId === type.id ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                    </button>
                    {/* Excluir */}
                    <button onClick={() => handleDelete(type.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Remover">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>

                {/* Painel de configuração */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    <ConfigPanel
                      ot={type}
                      categories={categories}
                      tiposViagem={tiposViagem}
                      allCustomers={allCustomers}
                      onSave={config => handleSaveConfig(type, config)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
