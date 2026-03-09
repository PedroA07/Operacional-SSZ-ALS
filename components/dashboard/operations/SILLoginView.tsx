
import React, { useState } from 'react';

interface SILLoginViewProps {
  onLogin: (u: string, p: string) => void;
}

const SILLoginView: React.FC<SILLoginViewProps> = ({ onLogin }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin(u, p);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="w-full h-full bg-[#f0f2f5] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-10 bg-[#001e50] flex flex-col items-center text-white">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-[#001e50] font-black italic text-2xl tracking-tighter">SIL</span>
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight">Portal Opentech</h2>
          <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest mt-1 opacity-60">Logística e Gerenciamento de Risco</p>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Identificação do Usuário</label>
            <input 
              required
              type="text" 
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold outline-none focus:border-[#001e50] transition-all"
              placeholder="Ex: operacional_ssz"
              value={u}
              onChange={e => setU(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Senha de Acesso</label>
            <input 
              required
              type="password" 
              className="w-full px-5 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-bold outline-none focus:border-[#001e50] transition-all"
              placeholder="••••••••"
              value={p}
              onChange={e => setP(e.target.value)}
            />
          </div>

          <button 
            disabled={loading}
            className="w-full py-5 bg-[#001e50] text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'Entrar no Sistema'}
          </button>

          <div className="text-center">
            <a href="#" className="text-[9px] font-black text-blue-600 uppercase hover:underline">Esqueci minha senha</a>
          </div>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Servidor Brasileiro Ativo</p>
        </div>
      </div>
    </div>
  );
};

export default SILLoginView;
