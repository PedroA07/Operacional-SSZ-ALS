
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
        setError(result.error || 'Falha na autenticação.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Erro de conexão com o terminal central.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-slate-900 border border-white/10 p-12 rounded-[3rem] shadow-2xl shadow-black/50">
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.3)] mb-6 font-black italic text-3xl text-white">
              ALS
            </div>
            <h1 className="text-white font-black uppercase text-xl tracking-tight">Portal Operacional</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-1.5 h-1.5 rounded-full ${dbOnline ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                Status: {dbOnline ? 'Terminal Online' : 'Servidor Offline'}
              </p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Usuário</label>
              <input 
                type="text" 
                required 
                className="w-full px-5 py-4 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                placeholder="operacional_ssz"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full px-5 py-4 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? <path strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/> : <path strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 text-[9px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 text-center animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-5 bg-blue-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl shadow-xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Entrar no Sistema'}
            </button>
          </form>

          <p className="mt-12 text-[8px] font-black text-slate-700 uppercase tracking-[0.4em] text-center">
            ALS Logística — Santos/SP — v{APP_CONFIG.version}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
