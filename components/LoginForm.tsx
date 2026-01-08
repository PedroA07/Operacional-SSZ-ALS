
import React, { useState } from 'react';
import { authService } from '../utils/authService';
import { User } from '../types';
import Logo from './shared/Logo';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.login(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Acesso Negado. Verifique usuário e chave.');
      }
    } catch (err) {
      setError('Falha crítica na conexão com os servidores ALS.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4 relative overflow-hidden">
      {/* Luzes dinâmicas de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse delay-1000"></div>
      
      <div className="w-full max-w-md z-10">
        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 md:p-14 rounded-[4rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-700">
          
          <div className="flex flex-col items-center text-center mb-12">
            <div className="w-24 h-24 bg-blue-600 rounded-[2.2rem] flex items-center justify-center shadow-2xl shadow-blue-600/20 mb-8 rotate-3 transition-transform hover:rotate-0 duration-500">
               <span className="text-white font-black italic text-4xl select-none">ALS</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gestão ALS SSZ</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.5em] mt-3">Painel Administrativo Restrito</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Identificador Operacional</label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  autoFocus
                  className="w-full px-8 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="operacional_ssz"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Chave de Segurança</label>
              <div className="relative">
                <input 
                  type="password" 
                  required 
                  className="w-full px-8 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2.5"/></svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 animate-shake text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.3em] rounded-3xl shadow-xl shadow-blue-900/20 hover:bg-blue-500 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Autenticar Acesso'}
            </button>
          </form>

          <div className="mt-14 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Servidor ALS Ativo</span>
            </div>
            <p className="text-[7px] text-slate-600 font-bold uppercase tracking-[0.6em]">© 2025 ALS LOGÍSTICA SSZ</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
