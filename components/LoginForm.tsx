
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
    if (isLoading) return;
    
    setError('');
    setIsLoading(true);

    try {
      // O sistema agora consulta obrigatoriamente a tabela 'users'
      const result = await authService.login(username, password);
      
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result.error || 'Credenciais inválidas.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Erro interno ao processar autenticação.');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617] px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-1000 slide-in-from-bottom-12">
        <div className="bg-white/[0.03] backdrop-blur-2xl p-10 md:p-14 rounded-[3.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col items-center">
          
          <div className="flex flex-col items-center mb-12">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(37,99,235,0.3)] mb-6">
               <span className="text-[#2563eb] font-black italic text-4xl select-none">ALS</span>
            </div>
            <div className="text-center">
              <h1 className="text-white font-black uppercase text-2xl tracking-tighter leading-none">Portal Logístico</h1>
              <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.4em] mt-3 opacity-60">Autenticação de Base de Dados</p>
            </div>
          </div>

          <form className="w-full space-y-7" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Usuário do Banco</label>
              <input 
                type="text" 
                required 
                autoComplete="username"
                className="w-full px-7 py-5 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 outline-none transition-all" 
                placeholder="ID de acesso"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Senha</label>
              <input 
                type="password" 
                required 
                autoComplete="current-password"
                className="w-full px-7 py-5 bg-white/5 border border-white/5 text-white font-bold rounded-2xl focus:border-blue-500 outline-none transition-all" 
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
              className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.3em] rounded-2xl shadow-2xl shadow-blue-900/40 hover:bg-blue-500 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Acessar Sistema</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </>
              )}
            </button>
          </form>

          <div className="mt-14 flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5">
              <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Conexão com Banco de Dados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
