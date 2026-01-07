
import React, { useState, useEffect } from 'react';
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
        setError(result.error || 'Acesso Negado. Verifique as credenciais.');
      }
    } catch (err) {
      setError('Erro de comunicação com a nuvem ALS.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4 relative">
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] animate-pulse delay-700"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-700">
          
          <div className="flex flex-col items-center text-center mb-10">
            <Logo size="xl" variant="white" className="mb-6" />
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Portal de Operações</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-2">Acesso Restrito ALS Logística</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="group space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-5">Usuário Operacional</label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  autoFocus
                  className="w-full px-7 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="operacional_ssz"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2.5"/></svg>
                </div>
              </div>
            </div>

            <div className="group space-y-1.5">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-5">Chave de Segurança</label>
              <div className="relative">
                <input 
                  type="password" 
                  required 
                  className="w-full px-7 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
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
              className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.25em] rounded-3xl shadow-2xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Autenticar Sistema'}
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Supabase Cloud Active Sync</span>
              </div>
            </div>
            <p className="text-[7px] text-slate-600 font-bold uppercase tracking-[0.5em]">© 2025 ALS LOGÍSTICA • TECNOLOGIA ALS</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
