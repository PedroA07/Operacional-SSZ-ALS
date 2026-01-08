
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
        setError(result.error || 'Acesso Negado.');
      }
    } catch (err) {
      setError('Falha na conexão com o servidor ALS.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4 relative overflow-hidden">
      {/* Luzes de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      
      <div className="w-full max-w-md z-10">
        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 md:p-12 rounded-[3.5rem] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 duration-700">
          
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[1.8rem] flex items-center justify-center shadow-2xl shadow-blue-600/20 mb-6 rotate-3">
               <span className="text-white font-black italic text-3xl">ALS</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Portal Operacional</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-3">Segurança & Logística SSZ</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Identificação</label>
              <input 
                type="text" 
                required 
                className="w-full px-8 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="operacional_ssz"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">Chave de Segurança</label>
              <input 
                type="password" 
                required 
                className="w-full px-8 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            {error && (
              <div className="p-4 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 animate-shake text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.3em] rounded-3xl shadow-xl hover:bg-blue-500 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Autenticar Acesso'}
            </button>
          </form>

          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
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
