import React, { useState, useEffect, useMemo } from 'react';
import { User, Customer } from '../../../types';
import { db } from '../../../utils/storage';

interface ExternalUsersManagerProps {
  onRefresh: () => void;
}

/* ── Column definitions per page ─────────────────────────────────── */
const STANDARD_COLUMNS = [
  { key: 'os',          label: 'OS / Identificação' },
  { key: 'container',   label: 'Container' },
  { key: 'status',      label: 'Status' },
  { key: 'dateTime',    label: 'Data / Hora' },
  { key: 'driver',      label: 'Motorista' },
  { key: 'customer',    label: 'Cliente' },
  { key: 'destination', label: 'Destino' },
  { key: 'scheduling',  label: 'Agendamento' },
  { key: 'category',    label: 'Categoria' },
  { key: 'type',        label: 'Tipo de Operação' },
];

const DEV_COLUMNS = [
  { key: 'container',        label: 'Container' },
  { key: 'destination',      label: 'Local / Depósito' },
  { key: 'driver',           label: 'Motorista' },
  { key: 'scheduledDateTime', label: 'Agendamento' },
  { key: 'agendamentoDoc',   label: 'Comprovante' },
];

/* Pages are grouped visually. Group 1 = Coleta/Entrega variants, Group 2 = Devoluções */
const PAGE_DEFS = [
  {
    key: 'orgColeta',
    label: 'Coleta (aba separada)',
    description: 'Coleta, Cabotagem e Exportação — aba própria no portal',
    color: 'blue',
    columns: STANDARD_COLUMNS,
    defaultFields: ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'destination', 'scheduling'],
    group: 'coleta-entrega',
  },
  {
    key: 'orgEntrega',
    label: 'Entrega (aba separada)',
    description: 'Entrega e Importação — aba própria no portal',
    color: 'emerald',
    columns: STANDARD_COLUMNS,
    defaultFields: ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'destination', 'scheduling'],
    group: 'coleta-entrega',
  },
  {
    key: 'orgColetaEntrega',
    label: 'Coleta + Entrega (aba combinada)',
    description: 'Coleta, Cabotagem, Exportação, Entrega e Importação — uma única aba',
    color: 'indigo',
    columns: STANDARD_COLUMNS,
    defaultFields: ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'destination', 'scheduling'],
    group: 'coleta-entrega',
  },
  {
    key: 'orgDevolucoes',
    label: 'Devoluções',
    description: 'Registros de Devolução de Vazio — aba própria no portal',
    color: 'orange',
    columns: DEV_COLUMNS,
    defaultFields: ['container', 'destination', 'driver', 'scheduledDateTime'],
    group: 'devolucoes',
  },
] as const;

type PageKey = typeof PAGE_DEFS[number]['key'];

const colorMap: Record<string, { toggle: string; chip: string; check: string; border: string; bg: string }> = {
  blue:    { toggle: 'bg-blue-600',    chip: 'bg-blue-100 text-blue-700 border-blue-200',       check: 'text-blue-600',    border: 'border-blue-300',   bg: 'bg-blue-50' },
  emerald: { toggle: 'bg-emerald-600', chip: 'bg-emerald-100 text-emerald-700 border-emerald-200', check: 'text-emerald-600', border: 'border-emerald-300', bg: 'bg-emerald-50' },
  indigo:  { toggle: 'bg-indigo-600',  chip: 'bg-indigo-100 text-indigo-700 border-indigo-200',   check: 'text-indigo-600',  border: 'border-indigo-300',  bg: 'bg-indigo-50' },
  orange:  { toggle: 'bg-orange-500',  chip: 'bg-orange-100 text-orange-700 border-orange-200',   check: 'text-orange-600',  border: 'border-orange-300',  bg: 'bg-orange-50' },
};


const STATUS_DEFS = [
  { key: 'Pendente',              color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { key: 'Em viagem',             color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { key: 'Retirada de vazio',     color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'Retirada do cheio',     color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'Chegou no cliente',     color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'Pegou NF',              color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'Saiu do cliente',       color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { key: 'Chegou no destino',     color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'Devolução do cheio',    color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { key: 'Container sobre rodas', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  { key: 'Agendamento realizado', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { key: 'Emissão Solicitada',    color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { key: 'Aguardando carregar',   color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { key: 'Viagem concluída',      color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { key: 'Viagem cancelada',      color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'Cancelado',             color: 'bg-red-100 text-red-700 border-red-300' },
  { key: 'Frete Morto',           color: 'bg-slate-100 text-slate-500 border-slate-300' },
  { key: 'Reutilização',          color: 'bg-teal-100 text-teal-700 border-teal-300' },
];

/* ── Component ──────────────────────────────────────────────────── */
const ExternalUsersManager: React.FC<ExternalUsersManagerProps> = ({ onRefresh }) => {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [categories, setCategories]         = useState<any[]>([]);
  const [opTypes, setOpTypes]               = useState<any[]>([]);
  const [customers, setCustomers]           = useState<Customer[]>([]);
  const [containerTypes, setContainerTypes] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving]         = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPassword, setShowPassword]     = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [newUser, setNewUser] = useState({ displayName: '', username: '', password: '' });
  const [creatingError, setCreatingError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [allUsers, allCats, allTypes, allCustomers, allContainerTypes] = await Promise.all([
      db.getUsers(),
      db.getCategories(),
      db.getOperationTypes(),
      db.getCustomers(),
      db.getContainerTypes(),
    ]);
    setUsers(allUsers.filter(u => u.role === 'third_party'));
    setCategories(allCats);
    setOpTypes(allTypes);
    setCustomers(allCustomers);
    setContainerTypes(allContainerTypes);
    setLoading(false);
  };

  /* ── Create ─────────────────────────────────────────────────── */
  const handleCreateUser = async () => {
    if (!newUser.displayName || !newUser.username || !newUser.password) {
      setCreatingError('Preencha todos os campos');
      return;
    }
    setSaving(true);
    setCreatingError('');
    try {
      const existingUsers = await db.getUsers();
      if (existingUsers.some(u => u.username === newUser.username)) {
        setCreatingError('Este nome de usuário já está em uso');
        setSaving(false);
        return;
      }
      const userToCreate: Omit<User, 'id'> = {
        username: newUser.username,
        password: newUser.password,
        displayName: newUser.displayName,
        role: 'third_party',
        lastLogin: new Date().toISOString(),
        thirdPartyConfig: {
          visibleFields: [],
          allowedCategories: [],
          allowedTypes: [],
          pages: {
            orgColeta:        { enabled: false, visibleFields: [...PAGE_DEFS[0].defaultFields] },
            orgEntrega:       { enabled: false, visibleFields: [...PAGE_DEFS[1].defaultFields] },
            orgColetaEntrega: { enabled: false, visibleFields: [...PAGE_DEFS[2].defaultFields] },
            orgDevolucoes:    { enabled: false, visibleFields: [...PAGE_DEFS[3].defaultFields] },
          },
        },
      };
      await db.saveUser({ ...userToCreate, id: `ext-${Date.now()}` });
      await loadData();
      setIsCreatingUser(false);
      setNewUser({ displayName: '', username: '', password: '' });
      onRefresh();
    } catch {
      setCreatingError('Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  /* ── Save config ─────────────────────────────────────────────── */
  const handleSaveConfig = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await db.saveUser(editingUser);
      await loadData();
      setEditingUser(null);
      onRefresh();
    } catch {
      console.error('Error saving user config');
    } finally {
      setSaving(false);
    }
  };

  /* ── Page toggle helpers ─────────────────────────────────────── */
  const togglePage = (pageKey: PageKey) => {
    if (!editingUser) return;
    const pageDef = PAGE_DEFS.find(p => p.key === pageKey)!;
    const pages = editingUser.thirdPartyConfig?.pages || {};
    const current = pages[pageKey];
    setEditingUser({
      ...editingUser,
      thirdPartyConfig: {
        ...editingUser.thirdPartyConfig,
        visibleFields: editingUser.thirdPartyConfig?.visibleFields || [],
        pages: {
          ...pages,
          [pageKey]: {
            enabled: !current?.enabled,
            visibleFields: current?.visibleFields?.length ? current.visibleFields : [...pageDef.defaultFields],
          },
        },
      },
    });
  };

  const togglePageField = (pageKey: PageKey, fieldKey: string) => {
    if (!editingUser) return;
    const pages = editingUser.thirdPartyConfig?.pages || {};
    const current = pages[pageKey];
    const fields = current?.visibleFields || [];
    setEditingUser({
      ...editingUser,
      thirdPartyConfig: {
        ...editingUser.thirdPartyConfig,
        visibleFields: editingUser.thirdPartyConfig?.visibleFields || [],
        pages: {
          ...pages,
          [pageKey]: {
            enabled: current?.enabled || false,
            visibleFields: fields.includes(fieldKey)
              ? fields.filter(f => f !== fieldKey)
              : [...fields, fieldKey],
          },
        },
      },
    });
  };

  /* ── Data filter helpers ────────────────────────────────────── */
  const toggleFilter = (
    field: 'allowedCategories' | 'allowedTypes' | 'allowedContainerTypes' | 'allowedStatuses' | 'allowedCustomers',
    value: string,
  ) => {
    if (!editingUser) return;
    const current: string[] = (editingUser.thirdPartyConfig as any)?.[field] || [];
    setEditingUser({
      ...editingUser,
      thirdPartyConfig: {
        ...editingUser.thirdPartyConfig,
        visibleFields: editingUser.thirdPartyConfig?.visibleFields || [],
        [field]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
      },
    });
  };

  const clearFilter = (field: 'allowedCategories' | 'allowedTypes' | 'allowedContainerTypes' | 'allowedStatuses' | 'allowedCustomers') => {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      thirdPartyConfig: {
        ...editingUser.thirdPartyConfig,
        visibleFields: editingUser.thirdPartyConfig?.visibleFields || [],
        [field]: [],
      },
    });
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) || c.legalName?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  /* ── Rendering helpers ───────────────────────────────────────── */
  const togglePasswordVisibility = (id: string) =>
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const EyeOpen = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
    </svg>
  );
  const EyeOff = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
    </svg>
  );

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gerenciar Usuários Externos</h2>
        <button
          onClick={() => setIsCreatingUser(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-black uppercase rounded-xl hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          Novo Usuário
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(user => {
            const enabledPages = PAGE_DEFS.filter(p => user.thirdPartyConfig?.pages?.[p.key]?.enabled);
            return (
              <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="font-black text-slate-800">{user.displayName}</p>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <p className="text-xs text-slate-500"><span className="font-bold">Login:</span> {user.username}</p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs text-slate-500">
                        <span className="font-bold">Senha:</span> {visiblePasswords[user.id] ? user.password : '••••••••'}
                      </p>
                      <button onClick={() => togglePasswordVisibility(user.id)} className="text-slate-400 hover:text-slate-600 ml-1">
                        {visiblePasswords[user.id] ? <EyeOff/> : <EyeOpen/>}
                      </button>
                    </div>
                    {enabledPages.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {enabledPages.map(p => (
                          <span key={p.key} className={`text-[8px] px-2 py-0.5 rounded-full font-black border uppercase ${colorMap[p.color].chip}`}>
                            {p.label.split('—')[1]?.trim() || p.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setEditingUser(user)}
                  className="text-xs font-black text-blue-600 uppercase hover:underline shrink-0 ml-4"
                >
                  Configurar Acessos
                </button>
              </div>
            );
          })}
          {users.length === 0 && (
            <p className="text-sm text-slate-500 italic text-center py-4">Nenhum usuário externo encontrado.</p>
          )}
        </div>
      )}

      {/* ── Modal: Criar usuário ─────────────────────────────────── */}
      {isCreatingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Novo Usuário Externo</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase">Preencha os dados do usuário</p>
              </div>
              <button onClick={() => setIsCreatingUser(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {creatingError && (
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 uppercase">{creatingError}</div>
              )}
              {[
                { label: 'Nome de Exibição', field: 'displayName', placeholder: 'Ex: Cliente ABC', type: 'text' },
                { label: 'Nome de Usuário (Login)', field: 'username', placeholder: 'Ex: cliente.abc', type: 'text' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">{label}</label>
                  <input
                    type={type}
                    value={(newUser as any)[field]}
                    onChange={e => setNewUser({ ...newUser, [field]: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-10"
                    placeholder="Senha de acesso"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff/> : <EyeOpen/>}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setIsCreatingUser(false)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" disabled={saving}>Cancelar</button>
              <button onClick={handleCreateUser} disabled={saving} className="px-6 py-2.5 text-xs font-black text-white uppercase bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Configurar acessos ─────────────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Configurar Acessos</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase">{editingUser.displayName}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Selecione quais páginas e dados o usuário pode visualizar
              </p>

              {/* ── Grupo: Coleta / Entrega ─────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Organização — Operações Portuárias</p>
                  <div className="flex-1 h-px bg-slate-200"/>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Escolha abas separadas <span className="text-slate-300 mx-1">ou</span> uma aba combinada — não é necessário ativar as duas opções simultaneamente
                  </p>
                  <div className="space-y-2">
                    {PAGE_DEFS.filter(p => p.group === 'coleta-entrega').map((page, idx, arr) => {
                      const c = colorMap[page.color];
                      const pageConfig = editingUser.thirdPartyConfig?.pages?.[page.key];
                      const isEnabled = pageConfig?.enabled ?? false;
                      const fields = pageConfig?.visibleFields || [];
                      const isCombined = page.key === 'orgColetaEntrega';

                      return (
                        <React.Fragment key={page.key}>
                          {/* Divider before combined option */}
                          {isCombined && (
                            <div className="flex items-center gap-2 py-1">
                              <div className="flex-1 h-px bg-slate-200"/>
                              <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest px-2">ou</span>
                              <div className="flex-1 h-px bg-slate-200"/>
                            </div>
                          )}
                          <div className={`rounded-xl border-2 transition-all overflow-hidden ${isEnabled ? `${c.border} ${c.bg}` : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-center justify-between p-3">
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-black uppercase tracking-tight ${isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>{page.label}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{page.description}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => togglePage(page.key)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ml-4 ${isEnabled ? c.toggle : 'bg-slate-200'}`}
                                role="switch" aria-checked={isEnabled}
                              >
                                <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}/>
                              </button>
                            </div>
                            {isEnabled && (
                              <div className="px-3 pb-3 border-t border-white/60">
                                <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest mt-2 mb-2">Dados visíveis</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                                  {page.columns.map(col => {
                                    const checked = fields.includes(col.key);
                                    return (
                                      <label key={col.key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-[9px] font-bold uppercase ${checked ? `bg-white ${c.border} text-slate-800` : 'bg-white/60 border-white text-slate-400 hover:border-slate-200'}`}>
                                        <input type="checkbox" checked={checked} onChange={() => togglePageField(page.key, col.key)} className={`w-3.5 h-3.5 rounded border-slate-300 focus:ring-0 ${c.check}`}/>
                                        {col.label}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Grupo: Devoluções ───────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Organização — Devoluções</p>
                  <div className="flex-1 h-px bg-slate-200"/>
                </div>
                {PAGE_DEFS.filter(p => p.group === 'devolucoes').map(page => {
                const c = colorMap[page.color];
                const pageConfig = editingUser.thirdPartyConfig?.pages?.[page.key];
                const isEnabled = pageConfig?.enabled ?? false;
                const fields = pageConfig?.visibleFields || [];

                return (
                  <div
                    key={page.key}
                    className={`rounded-2xl border-2 transition-all overflow-hidden ${isEnabled ? `${c.border} ${c.bg}` : 'border-slate-200 bg-white'}`}
                  >
                    {/* Page header with toggle */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black uppercase tracking-tight ${isEnabled ? 'text-slate-900' : 'text-slate-500'}`}>{page.label}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{page.description}</p>
                      </div>
                      {/* Toggle switch */}
                      <button
                        type="button"
                        onClick={() => togglePage(page.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ml-4 ${isEnabled ? c.toggle : 'bg-slate-200'}`}
                        role="switch"
                        aria-checked={isEnabled}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    {/* Columns — only shown when enabled */}
                    {isEnabled && (
                      <div className="px-4 pb-4 border-t border-white/60">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-3 mb-2">Dados visíveis</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {page.columns.map(col => {
                            const checked = fields.includes(col.key);
                            return (
                              <label
                                key={col.key}
                                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-[10px] font-bold uppercase
                                  ${checked ? `bg-white ${c.border} text-slate-800` : 'bg-white/60 border-white text-slate-400 hover:border-slate-200'}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => togglePageField(page.key, col.key)}
                                  className={`w-3.5 h-3.5 rounded border-slate-300 focus:ring-0 ${c.check}`}
                                />
                                {col.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>{/* end space-y-3 devolucoes */}

              {/* ── Filtros de Dados ────────────────────────────── */}
              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Filtros de Dados</p>
                  <div className="flex-1 h-px bg-slate-200"/>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-[8px] font-bold text-amber-700 uppercase leading-relaxed">
                    Sem seleção = mostra todos os registros. Marque itens para restringir o que este usuário visualiza.
                  </p>
                </div>

                {/* Categorias */}
                {categories.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Categorias</p>
                      {(editingUser.thirdPartyConfig?.allowedCategories?.length || 0) > 0 && (
                        <button onClick={() => clearFilter('allowedCategories')} className="text-[7px] font-black text-red-500 uppercase hover:underline">
                          Limpar ({editingUser.thirdPartyConfig?.allowedCategories?.length})
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.map((c: any) => {
                        const selected = editingUser.thirdPartyConfig?.allowedCategories?.includes(c.name);
                        return (
                          <button
                            key={c.name}
                            onClick={() => toggleFilter('allowedCategories', c.name)}
                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                              selected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                          >
                            {selected && <span className="mr-1">✓</span>}{c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tipos de Operação */}
                {opTypes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tipos de Operação</p>
                      {(editingUser.thirdPartyConfig?.allowedTypes?.length || 0) > 0 && (
                        <button onClick={() => clearFilter('allowedTypes')} className="text-[7px] font-black text-red-500 uppercase hover:underline">
                          Limpar ({editingUser.thirdPartyConfig?.allowedTypes?.length})
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {opTypes.map((t: any) => {
                        const selected = editingUser.thirdPartyConfig?.allowedTypes?.includes(t.name);
                        return (
                          <button
                            key={t.name}
                            onClick={() => toggleFilter('allowedTypes', t.name)}
                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase transition-all ${
                              selected
                                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                            }`}
                          >
                            {selected && <span className="mr-1">✓</span>}{t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tipos de Container */}
                {containerTypes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tipos de Container</p>
                      {(editingUser.thirdPartyConfig?.allowedContainerTypes?.length || 0) > 0 && (
                        <button onClick={() => clearFilter('allowedContainerTypes')} className="text-[7px] font-black text-red-500 uppercase hover:underline">
                          Limpar ({editingUser.thirdPartyConfig?.allowedContainerTypes?.length})
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {containerTypes.map((ct: any) => {
                        const selected = editingUser.thirdPartyConfig?.allowedContainerTypes?.includes(ct.name);
                        return (
                          <button
                            key={ct.id || ct.name}
                            onClick={() => toggleFilter('allowedContainerTypes', ct.name)}
                            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                              selected
                                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-800'
                            }`}
                          >
                            {ct.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Status</p>
                    {(editingUser.thirdPartyConfig?.allowedStatuses?.length || 0) > 0 && (
                      <button onClick={() => clearFilter('allowedStatuses')} className="text-[7px] font-black text-red-500 uppercase hover:underline">
                        Limpar ({editingUser.thirdPartyConfig?.allowedStatuses?.length})
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_DEFS.map(s => {
                      const selected = editingUser.thirdPartyConfig?.allowedStatuses?.includes(s.key);
                      return (
                        <button
                          key={s.key}
                          onClick={() => toggleFilter('allowedStatuses', s.key)}
                          className={`px-2.5 py-1.5 rounded-xl border text-[8px] font-black uppercase transition-all cursor-pointer ${s.color} ${
                            selected
                              ? 'ring-2 ring-slate-400 ring-offset-1 shadow-sm scale-[1.03]'
                              : 'opacity-40 hover:opacity-80'
                          }`}
                        >
                          {s.key}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Clientes */}
                {customers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Clientes</p>
                      <div className="flex items-center gap-2">
                        {(editingUser.thirdPartyConfig?.allowedCustomers?.length || 0) > 0 && (
                          <>
                            <span className="text-[7px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              {editingUser.thirdPartyConfig?.allowedCustomers?.length} selecionado(s)
                            </span>
                            <button onClick={() => clearFilter('allowedCustomers')} className="text-[7px] font-black text-red-500 uppercase hover:underline">
                              Limpar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {filteredCustomers.map((c: Customer) => {
                        const val = c.name || '';
                        const selected = editingUser.thirdPartyConfig?.allowedCustomers?.includes(val) || false;
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                              selected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleFilter('allowedCustomers', val)}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-0 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className={`text-[10px] font-black uppercase leading-tight ${selected ? 'text-emerald-700' : 'text-slate-700'}`}>{c.name}</p>
                              {c.legalName && c.legalName !== c.name && (
                                <p className="text-[8px] text-slate-400 uppercase truncate">{c.legalName}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                      {filteredCustomers.length === 0 && (
                        <p className="text-[9px] text-slate-400 italic text-center py-4">Nenhum cliente encontrado</p>
                      )}
                    </div>
                  </div>
                )}
              </div>{/* end filtros de dados */}

            </div>{/* end overflow-y-auto */}

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50 rounded-b-2xl">
              <button onClick={() => setEditingUser(null)} className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors" disabled={saving}>Cancelar</button>
              <button onClick={handleSaveConfig} disabled={saving} className="px-6 py-2.5 text-xs font-black text-white uppercase bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalUsersManager;
