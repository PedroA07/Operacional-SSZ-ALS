
import React, { useState } from 'react';
import { ADMIN_CREDENTIALS } from '../constants';
import { User } from '../types';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulação de latência de rede para UX
    setTimeout(() => {
      if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        onLoginSuccess({
          id: 'admin-master',
          username: 'operacional_ssz',
          displayName: 'Operacional SSZ',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          position: 'Diretoria de Operações'
        });
      } else {
        setError('Credenciais inválidas. Verifique usuário e senha.');
        setIsLoading(false);
      }
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 overflow-hidden">
      <div className="w-full max-w-md relative group">
        {/* Efeito de brilho ao redor */}
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-slate-950/80 backdrop-blur-2xl p-10 space-y-8 rounded-[3rem] shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-500/20 rotate-3">
              <span className="text-4xl font-black italic tracking-tighter">ALS</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Portal de Acesso</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">Logística & Transportes</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Usuário Operacional</label>
              <input 
                type="text" 
                required 
                className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="usuario"
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Chave Secreta</label>
              <input 
                type="password" 
                required 
                className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            {error && (
              <div className="p-4 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 animate-shake">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Autenticar'}
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.5em]">© 2025 ALS SISTEMAS INTELIGENTES</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
