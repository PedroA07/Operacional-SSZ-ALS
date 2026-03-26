import React, { useState, useEffect } from 'react';
import { User, Category } from '../../../types';
import { db } from '../../../utils/storage';

interface ExternalUsersManagerProps {
  onRefresh: () => void;
}

const AVAILABLE_COLUMNS = [
  { key: 'os', label: 'OS' },
  { key: 'container', label: 'Container' },
  { key: 'status', label: 'Status' },
  { key: 'dateTime', label: 'Data' },
  { key: 'driver', label: 'Motorista' },
  { key: 'customer', label: 'Cliente' },
  { key: 'destination', label: 'Destino' },
  { key: 'category', label: 'Categoria' },
  { key: 'type', label: 'Tipo' }
];

const ExternalUsersManager: React.FC<ExternalUsersManagerProps> = ({ onRefresh }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [operationTypes, setOperationTypes] = useState<any[]>([]);
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados para o modal de criação de usuário
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [newUser, setNewUser] = useState({
    displayName: '',
    username: '',
    password: ''
  });

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };
  const [creatingError, setCreatingError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [allUsers, allCategories, allTypes] = await Promise.all([
      db.getUsers(),
      db.getCategories(),
      db.getOperationTypes()
    ]);
    setUsers(allUsers.filter(u => u.role === 'third_party'));
    setCategories(allCategories);
    setOperationTypes(allTypes);
    setLoading(false);
  };

  const handleCreateUser = async () => {
    if (!newUser.displayName || !newUser.username || !newUser.password) {
      setCreatingError('Preencha todos os campos');
      return;
    }

    setSaving(true);
    setCreatingError('');

    try {
      // Verifica se o usuário já existe
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
          visibleFields: ['os', 'container', 'status', 'dateTime', 'driver', 'customer', 'destination', 'category', 'type'],
          allowedCategories: [],
          allowedTypes: []
        }
      };

      await db.saveUser({ ...userToCreate, id: `ext-${Date.now()}` });
      await loadData();
      setIsCreatingUser(false);
      setNewUser({ displayName: '', username: '', password: '' });
      onRefresh();
    } catch (error) {
      console.error('Error creating user:', error);
      setCreatingError('Erro ao criar usuário');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await db.saveUser(editingUser);
      await loadData();
      setEditingUser(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving user config:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleColumn = (key: string) => {
    if (!editingUser) return;
    const currentFields = editingUser.thirdPartyConfig?.visibleFields || [];
    const newFields = currentFields.includes(key)
      ? currentFields.filter(f => f !== key)
      : [...currentFields, key];
      
    setEditingUser({
      ...editingUser,
      thirdPartyConfig: {
        ...editingUser.thirdPartyConfig,
        visibleFields: newFields
      }
    });
  };

  const toggleCategory = (categoryName: string) => {
    if (!editingUser) return;
    const currentCats = editingUser.thirdPartyConfig?.allowedCategories || [];
    const newCats = currentCats.includes(categoryName)
      ? currentCats.filter(c => c !== categoryName)
      : [...currentCats, categoryName];

    setEditingUser({
      ...editingUser,
      thirdPartyConfig: {
        ...editingUser.thirdPartyConfig,
        visibleFields: editingUser.thirdPartyConfig?.visibleFields || [],
        allowedCategories: newCats
      }
    });
  };

  const toggleType = (typeName: string) => {
    if (!editingUser) return;
    const currentTypes = editingUser.thirdPartyConfig?.allowedTypes || [];
    const newTypes = currentTypes.includes(typeName)
      ? currentTypes.filter(t => t !== typeName)
      : [...currentTypes, typeName];

    setEditingUser({
      ...editingUser,
      thirdPartyConfig: {
        ...editingUser.thirdPartyConfig,
        visibleFields: editingUser.thirdPartyConfig?.visibleFields || [],
        allowedTypes: newTypes
      }
    });
  };

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
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <p className="font-black text-slate-800">{user.displayName}</p>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-xs text-slate-500"><span className="font-bold">Login:</span> {user.username}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-slate-500">
                      <span className="font-bold">Senha:</span> {visiblePasswords[user.id] ? user.password : '••••••••'}
                    </p>
                    <button 
                      onClick={() => togglePasswordVisibility(user.id)}
                      className="text-slate-400 hover:text-slate-600 ml-1"
                      title={visiblePasswords[user.id] ? "Ocultar senha" : "Ver senha"}
                    >
                      {visiblePasswords[user.id] ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setEditingUser(user)}
                className="text-xs font-black text-blue-600 uppercase hover:underline"
              >
                Configurar Acessos
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-slate-500 italic text-center py-4">Nenhum usuário externo encontrado.</p>
          )}
        </div>
      )}

      {/* Modal de Criação de Usuário */}
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
                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 uppercase">
                  {creatingError}
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">Nome de Exibição</label>
                <input
                  type="text"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Ex: Cliente ABC"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">Nome de Usuário (Login)</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Ex: cliente.abc"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-tight mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-10"
                    placeholder="Senha de acesso"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50 rounded-b-2xl">
              <button 
                onClick={() => setIsCreatingUser(false)}
                className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateUser}
                disabled={saving}
                className="px-6 py-2.5 text-xs font-black text-white uppercase bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                {saving ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

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

            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
              {/* Colunas Visíveis */}
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Colunas Visíveis</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {AVAILABLE_COLUMNS.map(col => {
                    const isSelected = editingUser.thirdPartyConfig?.visibleFields?.includes(col.key);
                    return (
                      <label key={col.key} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected || false}
                          onChange={() => toggleColumn(col.key)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className={`text-xs font-bold uppercase ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Categorias Permitidas */}
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Categorias Permitidas</h4>
                <p className="text-[10px] text-slate-500 mb-3 uppercase font-bold">Se nenhuma for selecionada, todas serão exibidas.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map(cat => {
                    const isSelected = editingUser.thirdPartyConfig?.allowedCategories?.includes(cat.name);
                    return (
                      <label key={cat.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected || false}
                          onChange={() => toggleCategory(cat.name)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                        <span className={`text-xs font-bold uppercase ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tipos Permitidos */}
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Tipos de Operação Permitidos</h4>
                <p className="text-[10px] text-slate-500 mb-3 uppercase font-bold">Se nenhum for selecionado, todos serão exibidos.</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {operationTypes.map(type => {
                    const isSelected = editingUser.thirdPartyConfig?.allowedTypes?.includes(type.name);
                    return (
                      <label key={type.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:border-purple-200'}`}>
                        <input 
                          type="checkbox" 
                          checked={isSelected || false}
                          onChange={() => toggleType(type.name)}
                          className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        />
                        <span className={`text-xs font-bold uppercase ${isSelected ? 'text-purple-700' : 'text-slate-600'}`}>{type.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50 rounded-b-2xl">
              <button 
                onClick={() => setEditingUser(null)}
                className="px-6 py-2.5 text-xs font-black text-slate-600 uppercase bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2.5 text-xs font-black text-white uppercase bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
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
