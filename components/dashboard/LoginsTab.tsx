import React, { useState, useEffect, useMemo } from 'react';
import { LoginCredential } from '../../types';
import { db } from '../../utils/storage';
import LoginModal from './logins/LoginModal';

const LoginsTab: React.FC = () => {
  const [logins, setLogins] = useState<LoginCredential[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLogin, setEditingLogin] = useState<LoginCredential | null>(null);
  const [search, setSearch] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    const data = await db.getLogins();
    setLogins(data);
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    return logins.filter(l => 
      l.siteName.toLowerCase().includes(search.toLowerCase()) ||
      l.username.toLowerCase().includes(search.toLowerCase())
    );
  }, [logins, search]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este login permanentemente?')) return;
    setIsDeleting(id);
    await db.deleteLogin(id);
    await loadData();
    setIsDeleting(null);
  };

  const togglePass = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
         <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cofre de Logins Operacional</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Acessos Rápidos a Sistemas Externos</p>
         </div>
         <button 
           onClick={() => { setEditingLogin(null); setIsModalOpen(true); }}
           className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
         >
           Novo Acesso
         </button>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
         <div className="relative">
            <input 
              type="text" 
              placeholder="PESQUISAR SITE OU USUÁRIO..." 
              className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-500 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="flex justify-between items-start mb-6 gap-4">
               <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black italic shrink-0">
                    {item.siteName.substring(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-slate-800 uppercase whitespace-normal break-words leading-tight">
                      {item.siteName}
                    </h3>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-blue-500 hover:underline uppercase tracking-tighter block mt-1">Acessar Link</a>
                    )}
                  </div>
               </div>
               <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditingLogin(item); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="3"/></svg></button>
                  <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="3"/></svg></button>
               </div>
            </div>

            <div className="space-y-4 flex-1">
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Usuário / ID</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-700 truncate">{item.username}</span>
                    <button onClick={() => handleCopy(item.username, 'Usuário')} className="p-1 text-blue-400 hover:bg-blue-100 rounded transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="3"/></svg></button>
                  </div>
               </div>

               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative overflow-hidden">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Senha</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-mono font-black text-slate-700">{visiblePasswords[item.id] ? item.password : '••••••••'}</span>
                    <div className="flex gap-1">
                      <button onClick={() => togglePass(item.id)} className="p-1 text-slate-400 hover:text-slate-600"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" strokeWidth="2.5"/></svg></button>
                      <button onClick={() => handleCopy(item.password, 'Senha')} className="p-1 text-blue-400 hover:bg-blue-100 rounded transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="3"/></svg></button>
                    </div>
                  </div>
               </div>

               {item.additionalFields && item.additionalFields.length > 0 && (
                 <div className="pt-4 border-t border-slate-50 space-y-2">
                    {item.additionalFields.map((f, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[9px] font-bold uppercase">
                        <span className="text-slate-400">{f.label}:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">{f.value}</span>
                          <button onClick={() => handleCopy(f.value, f.label)} className="text-slate-300 hover:text-blue-500"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" strokeWidth="4"/></svg></button>
                        </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        ))}
      </div>

      <LoginModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingLogin={editingLogin}
        onSuccess={loadData}
      />
    </div>
  );
};

export default LoginsTab;