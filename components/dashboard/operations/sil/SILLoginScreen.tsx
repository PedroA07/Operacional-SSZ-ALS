
import React, { useState } from 'react';

interface SILLoginScreenProps {
  onLogin: (u: string, p: string) => void;
}

const SILLoginScreen: React.FC<SILLoginScreenProps> = ({ onLogin }) => {
  const [user, setUser] = useState('operacional_ssz');
  const [pass, setPass] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    // Simula o tempo de resposta do servidor Opentech
    setTimeout(() => {
      onLogin(user, pass);
      setIsAuthenticating(false);
    }, 1500);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-12 bg-slate-100">
      <div className="w-full max-w-lg bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-700">
        <div className="p-12 bg-[#001e50] text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center shadow-xl rotate-3 group-hover:rotate-0 transition-transform">
            <span className="text-[#001e50] font-black italic text-3xl tracking-tighter">SIL</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Portal Opentech</h2>
            <p className="text-[10px] text-blue-300 font-bold uppercase tracking-[0.3em] mt-1 opacity-60">Logística & Monitoramento</p>
          </div>
        </div>

        <form onSubmit={handleEnter} className="p-12 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Usuário Opentech</label>
            <input 
              required
              type="text" 
              className="w-full px-6 py-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-bold outline-none focus:border-blue-600 transition-all text-lg"
              placeholder="usuário"
              value={user}
              onChange={e => setUser(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Senha de Acesso</label>
            <input 
              required
              type="password" 
              className="w-full px-6 py-5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 font-bold outline-none focus:border-blue-600 transition-all text-lg"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 px-4">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-blue-600" id="remember" />
            <label htmlFor="remember" className="text-[10px] font-black text-slate-500 uppercase cursor-pointer">Manter este cadastro para as próximas sessões</label>
          </div>

          <button 
            disabled={isAuthenticating}
            className="w-full py-6 bg-[#001e50] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isAuthenticating ? (
              <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : 'Entrar no Sistema SIL'}
          </button>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">ALS TRANSPORTES - INTEGRATED BROWSER MODULE V4.0</p>
        </div>
      </div>
    </div>
  );
};

export default SILLoginScreen;
