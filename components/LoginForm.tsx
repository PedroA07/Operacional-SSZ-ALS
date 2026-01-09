
import React, { useState, useEffect } from 'react';
import { authService } from '../utils/authService';
import { db } from '../utils/storage';
import { User } from '../types';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dbOnline, setDbOnline] = useState<boolean | null>(null);

  // Checagem inicial de saúde do banco
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
      // Login estrito via banco de dados
      const result = await authService.login(username, password);
      
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Falha na autenticação.');
        if (result.isDatabaseDown) setDbOnline(false);
        setIsLoading(false);
      }
    } catch (err) {
      setError('Erro crítico ao processar login.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4 relative overflow-hidden">
      {/* Background Animado */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-full max-w-[440px] z-10 animate-in fade-in zoom-in-95 duration-700">
        <div className="bg-white/[0.03] backdrop-blur-3xl p-10 md:p-14 rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/10 flex flex-col items-center">
          
          <div className="flex flex-col items-center mb-12">
            <div className="w-24 h-24 bg-white rounded-[2.2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.4)] mb-6 transition-transform hover:scale-105 duration-500">
               <span className="text-[#2563eb] font-black italic text-4xl select-none">ALS</span>
            </div>
            <div className="text-center">
              <h1 className="text-white font-black uppercase text-2xl tracking-tighter leading-none">Portal Operacional</h1>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.4em] mt-3 opacity-60">Base de Dados SSZ</p>
            </div>
          </div>

          {dbOnline === false && (
            <div className="w-full mb-8 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
               <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2.5"/></svg>
               </div>
               <div className="min-w-0">
                  <p className="text-[10px] font-black text-amber-500 uppercase">Banco em Standby</p>
                  <p className="text-[9px] text-amber-200/60 leading-tight mt-0.5">O servidor ALS está demorando para responder. Tente logar para "acordar" o sistema.</p>
               </div>
            </div>
          )}

          <form className="w-full space-y-7" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Usuário:</label>
              <input 
                type="text" 
                required 
                autoFocus
                autoComplete="username"
                className="w-full px-7 py-5 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="Insira seu usuário"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Senha:</label>
              <input 
                type="password" 
                required 
                autoComplete="current-password"
                className="w-full px-7 py-5 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            {error && (
              <div className="p-5 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 animate-shake text-center leading-relaxed">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-2xl shadow-blue-900/40 hover:bg-blue-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-4 group"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                   <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                   <span className="text-[10px]">Entrando...</span>
                </div>
              ) : (
                <>
                  <span>Entrar</span>
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-14 flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/5">
             <div className={`w-2 h-2 rounded-full ${dbOnline === true ? 'bg-emerald-500' : dbOnline === false ? 'bg-red-500' : 'bg-slate-600 animate-pulse'}`}></div>
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
               {dbOnline === true ? 'Servidor Online' : dbOnline === false ? 'Servidor Offline' : 'Verificando Nuvem...'}
             </span>
          </div>
        </div>
      </div>
      
      <p className="absolute bottom-10 text-[9px] font-black text-slate-700 uppercase tracking-[0.5em] select-none">ALS Transportes SSZ — v{dbOnline ? '6.0.3' : '6.0.2'}</p>
    </div>
  );
};

export default LoginForm;
