
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { db } from '../../utils/storage';
import { Icons } from '../../constants/icons';
import ThirdPartyModal from './third-party/ThirdPartyModal';

interface ThirdPartyTabProps {
  currentUser: User;
}

const ThirdPartyTab: React.FC<ThirdPartyTabProps> = ({ currentUser }) => {
  const [thirdParties, setThirdParties] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadThirdParties = async () => {
    setIsLoading(true);
    try {
      const allUsers = await db.getUsers();
      setThirdParties(allUsers.filter(u => u.role === 'third_party'));
    } catch (error) {
      console.error("Erro ao carregar terceiros:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadThirdParties();
  }, []);

  const handleSave = async (user: User) => {
    const success = await db.saveUser(user);
    if (success) {
      await loadThirdParties();
    }
  };

  const handleDelete = async (id: string) => {
    console.log('Tentando excluir usuário com ID:', id);
    if (window.confirm('Deseja realmente excluir este acesso de terceiro?')) {
      try {
        console.log('Confirmação aceita, chamando db.deleteUser...');
        const success = await db.deleteUser(id);
        console.log('Resultado da exclusão (success):', success);
        
        if (success) {
          await loadThirdParties();
          console.log('Lista recarregada com sucesso.');
        } else {
          console.error('Falha ao excluir usuário no banco de dados.');
          alert('Erro ao excluir usuário. Verifique se existem registros vinculados.');
        }
      } catch (error) {
        console.error('Erro crítico ao tentar excluir:', error);
        alert('Erro crítico ao excluir usuário. Verifique o console.');
      }
    } else {
      console.log('Confirmação cancelada.');
    }
  };

  const filteredThirdParties = thirdParties.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Gestão de Terceiros</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2">Controle de acessos externos e visualização de dados</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          className="flex items-center gap-3 px-8 py-5 bg-slate-900 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/20 hover:bg-blue-600 transition-all active:scale-95 group"
        >
          <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
            <Icons.Plus className="w-4 h-4" />
          </div>
          Novo Acesso Terceiro
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome ou usuário..."
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total:</span>
            <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700">{filteredThirdParties.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Terceiro</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Campos Visíveis</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carregando terceiros...</p>
                  </td>
                </tr>
              ) : filteredThirdParties.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Icons.Users className="w-8 h-8" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum terceiro encontrado</p>
                  </td>
                </tr>
              ) : (
                filteredThirdParties.map(tp => (
                  <tr key={tp.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner border border-blue-100">
                          {tp.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-700 uppercase tracking-tight">{tp.displayName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">ID: {tp.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {tp.username}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {tp.thirdPartyConfig?.visibleFields.map(field => (
                          <span key={field} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tight">
                            {field}
                          </span>
                        ))}
                        {(!tp.thirdPartyConfig?.visibleFields || tp.thirdPartyConfig.visibleFields.length === 0) && (
                          <span className="text-[10px] text-slate-400 italic">Nenhum campo selecionado</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                        tp.status === 'Ativo' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {tp.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button 
                          onClick={() => { setEditingUser(tp); setIsModalOpen(true); }}
                          className="p-3 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-2xl transition-all border border-transparent hover:border-blue-100"
                          title="Editar"
                        >
                          <Icons.Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(tp.id)}
                          className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-2xl transition-all border border-transparent hover:border-red-100"
                          title="Excluir"
                        >
                          <Icons.Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ThirdPartyModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingUser={editingUser}
      />
    </div>
  );
};

export default ThirdPartyTab;
