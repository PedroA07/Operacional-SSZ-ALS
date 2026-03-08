
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
        setError(result.error || 'Credenciais Inválidas.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Terminal Indisponível.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Deep Blue Layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#0f172a_0%,_#020617_100%)]"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[140px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-400/5 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-[460px] z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* Blue Metallic Card Container */}
        <div className="bg-gradient-to-br from-blue-900/30 via-slate-900/60 to-black/80 backdrop-blur-xl border border-blue-500/20 p-12 rounded-[3.5rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] relative group overflow-hidden">
          
          {/* Blue Anodized Shine Effect */}
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-[linear-gradient(110deg,transparent_45%,rgba(37,99,235,0.15)_50%,transparent_55%)] bg-[length:200%_100%] animate-[shine_10s_infinite]"></div>

          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-[0_15px_40px_rgba(37,99,235,0.4)] mb-8 transform hover:scale-105 transition-transform duration-500 border border-white/10 overflow-hidden">
               <img src="/logo.jfif" alt="ALS" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-white font-black uppercase text-2xl tracking-[0.2em] text-center">Operacional SSZ</h1>
            <div className="flex items-center gap-3 mt-4 px-4 py-1.5 bg-blue-950/40 rounded-full border border-blue-500/20">
              <div className={`w-2 h-2 rounded-full ${dbOnline ? 'bg-blue-400 shadow-[0_0_10px_#60a5fa]' : 'bg-red-500 animate-pulse'}`}></div>
              <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest">
                {dbOnline ? 'Sistema Conectado' : 'Link Offline'}
              </p>
            </div>
          </div>

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* Input Usuário */}
            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-blue-400/70 uppercase tracking-widest ml-3">Usuário:</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500/50 group-focus-within:text-blue-400 transition-all group-hover:scale-110 group-hover:text-blue-300">
                  <svg className="w-5 h-5 drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                </div>
                <input 
                  type="text" 
                  required 
                  className="w-full pl-16 pr-6 py-5 bg-black/40 border border-blue-500/10 text-white font-bold rounded-2xl focus:border-blue-500/50 focus:bg-blue-900/20 outline-none transition-all placeholder:text-blue-900/50 shadow-inner" 
                  placeholder="identificação"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
              </div>
            </div>

            {/* Input Senha */}
            <div className="space-y-2 group">
              <label className="text-[11px] font-black text-blue-400/70 uppercase tracking-widest ml-3">Senha:</label>
              <div className="relative">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-500/50 group-focus-within:text-blue-400 transition-all group-hover:scale-110 group-hover:text-blue-300">
                  <svg className="w-5 h-5 drop-shadow-[0_0_8px_rgba(37,99,235,0.3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required 
                  className="w-full pl-16 pr-16 py-5 bg-black/40 border border-blue-500/10 text-white font-bold rounded-2xl focus:border-blue-500/50 focus:bg-blue-900/20 outline-none transition-all placeholder:text-blue-900/50 shadow-inner" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-900 hover:text-blue-400 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPassword ? <path strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268-2.943-9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/> : <path strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268-2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>}
                  </svg>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 text-center animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-6 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-800 text-white font-black uppercase text-[12px] tracking-[0.4em] rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.4)] hover:from-blue-400 hover:to-blue-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 border-t border-white/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="mt-12 text-[9px] font-black text-blue-900/40 uppercase tracking-[0.5em] text-center">
            ALS Transportes SSZ — v{APP_CONFIG.version}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes shine {
          from { background-position: -200% 0; }
          to { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
};

export default LoginForm;
