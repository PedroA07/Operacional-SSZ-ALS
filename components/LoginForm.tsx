
import React, { useState, useEffect } from 'react';
import { authService } from '../utils/authService';
import { db } from '../utils/storage';
import { User } from '../types';
// Import APP_CONFIG from constants
import { APP_CONFIG } from '../constants';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const isUp = await db.checkConnection();
      setDbOnline(isUp);
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.login(username, password);
      
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Falha na autenticação.');
        if (result.isDatabaseDown) setDbOnline(false);
        setIsLoading(false);
      }
    } catch (err) {
      setError('Erro crítico de conexão com o terminal ALS.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4 relative overflow-hidden">
      {/* Elementos de Ambientação */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>

      <div className="w-full max-w-[440px] z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white/[0.03] backdrop-blur-2xl p-10 md:p-14 rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col items-center">
          
          <div className="flex flex-col items-center mb-12">
            <div className="w-24 h-24 bg-blue-600 rounded-[2.2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-8 transition-transform hover:scale-105 duration-500">
               <span className="text-white font-black italic text-4xl select-none">ALS</span>
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-white font-black uppercase text-2xl tracking-tighter leading-none">Acesso Restrito</h1>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.4em] opacity-60">Operacional SSZ • Santos/SP</p>
            </div>
          </div>

          <form className="w-full space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Usuário Administrativo</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  className="w-full pl-16 pr-6 py-5 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-800" 
                  placeholder="ID de Usuário"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Senha de Acesso</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full pl-16 pr-16 py-5 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-800" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? <path strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/> : <path strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-5 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 animate-shake text-center leading-relaxed">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-2xl shadow-blue-900/40 hover:bg-blue-500 hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-4 group"
            >
              {isLoading ? (
                <>
                   <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span className="text-[10px]">Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Acessar Portal</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-14 flex items-center gap-3 px-6 py-3 bg-white/5 rounded-full border border-white/5">
             <div className={`w-2 h-2 rounded-full ${dbOnline === true ? 'bg-emerald-50 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : dbOnline === false ? 'bg-red-50' : 'bg-slate-600 animate-pulse'}`}></div>
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
               {dbOnline === true ? 'Sistema Online' : dbOnline === false ? 'Terminal Offline' : 'Handshake...'}
             </span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-10 flex flex-col items-center gap-3">
         <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.6em] select-none">ALS Transportes — v{APP_CONFIG.version}</p>
         <div className="h-1 w-32 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600/50 w-1/4 animate-[loading_4s_infinite]"></div>
         </div>
      </div>
    </div>
  );
};

export default LoginForm;
