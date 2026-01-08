
import React, { useState } from 'react';
import { authService } from '../utils/authService';
import { User } from '../types';

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
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4">
      <div className="w-full max-w-[400px] animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-[#0a1128] p-10 md:p-12 rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/5 flex flex-col items-center">
          
          {/* Logo Section */}
          <div className="flex items-center gap-4 mb-10 w-full justify-center">
            <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center shadow-xl shrink-0">
               <span className="text-[#2563eb] font-black italic text-3xl select-none">ALS</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-white font-black uppercase text-lg tracking-tighter">ALS Logística</span>
              <span className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Transportes SSZ</span>
            </div>
          </div>

          {/* Title Section */}
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Portal de Operações</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">Acesso Restrito ALS Logística</p>
          </div>

          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            {/* Username Input */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário Operacional</label>
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  className="w-full px-6 py-4 bg-[#1a233a] border border-transparent text-white font-bold rounded-2xl focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="operacional_ssz"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Chave de Segurança</label>
              <div className="relative">
                <input 
                  type="password" 
                  required 
                  className="w-full px-6 py-4 bg-[#1a233a] border border-transparent text-white font-bold rounded-2xl focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 text-[9px] font-black uppercase text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 animate-shake text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 bg-[#2563eb] text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-900/20 hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Autenticar Sistema'}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-12 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Supabase Cloud Active Sync</span>
            </div>
            <p className="text-[7px] text-slate-600 font-bold uppercase tracking-[0.5em] text-center">
              © 2025 ALS Logística — Tecnologia ALS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
