
import React, { useState, useEffect } from 'react';
import { authService } from '../utils/authService';
import { db } from '../utils/storage';
import { User } from '../types';
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
        setError(result.error || 'Falha na autenticação. Verifique as credenciais.');
        if (result.isDatabaseDown) setDbOnline(false);
        setIsLoading(false);
      }
    } catch (err) {
      setError('Erro crítico de comunicação com o terminal central.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

      <div className="w-full max-w-[480px] z-10 animate-in fade-in zoom-in-95 duration-1000">
        <div className="bg-slate-900/40 backdrop-blur-3xl p-10 md:p-16 rounded-[4rem] shadow-[0_40px_120px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col items-center relative overflow-hidden">
          
          {/* Top decorative bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

          <div className="flex flex-col items-center mb-14">
            <div className="w-24 h-24 bg-blue-600 rounded-[2.2rem] flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] mb-8 transition-transform hover:scale-110 duration-500 group cursor-default">
               <span className="text-white font-black italic text-4xl select-none group-hover:rotate-3 transition-transform">ALS</span>
            </div>
            <div className="text-center space-y-3">
              <h1 className="text-white font-black uppercase text-3xl tracking-tighter leading-none">Terminal de Acesso</h1>
              <div className="flex items-center justify-center gap-3">
                <div className={`w-2 h-2 rounded-full ${dbOnline === true ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`}></div>
                <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] opacity-60">Operacional SSZ • Santos/SP</p>
              </div>
            </div>
          </div>

          <form className="w-full space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-5">Identificação Digital</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <input 
                  type="text" 
                  required 
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/5 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700 text-base" 
                  placeholder="ID de Usuário"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-5">Chave de Segurança</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  autoComplete="current-password"
                  className="w-full pl-16 pr-16 py-6 bg-white/5 border border-white/5 text-white font-bold rounded-3xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700 text-base" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? <path strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/> : <path strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-5 text-[11px] font-black uppercase text-red-400 bg-red-500/10 rounded-3xl border border-red-500/20 animate-shake text-center leading-relaxed flex items-center justify-center gap-3">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-7 bg-blue-600 text-white font-black uppercase text-sm tracking-[0.4em] rounded-[2.2rem] shadow-[0_20px_50px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:-translate-y-1.5 transition-all duration-500 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-5 group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>
              {isLoading ? (
                <>
                   <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span className="text-[11px] tracking-widest">Sincronizando...</span>
                </>
              ) : (
                <>
                  <span>Autenticar</span>
                  <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-16 flex flex-col items-center gap-4">
             <div className="px-6 py-2.5 bg-white/5 rounded-full border border-white/5 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${dbOnline === true ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-slate-600 animate-pulse'}`}></div>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Terminal {dbOnline === true ? 'Online' : 'Reconectando...'}
                </span>
             </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-4">
         <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.8em] select-none text-center">
           ALS Logística — Operacional v{APP_CONFIG.version}
         </p>
         <div className="h-1 w-48 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600/40 w-1/3 animate-[loading_5s_infinite] ease-in-out"></div>
         </div>
      </div>
      
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

export default LoginForm;
