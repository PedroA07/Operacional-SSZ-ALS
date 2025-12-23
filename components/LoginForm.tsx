
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

  // Estados para o fluxo de primeiro acesso
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await authService.login(username, password);

      if (result.success && result.user) {
        if (result.forceChange) {
          setPendingUser(result.user);
          setIsChangingPassword(true);
        } else {
          onLoginSuccess(result.user);
        }
      } else {
        setError(result.error || 'Falha na autenticação.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword === '12345678') {
      setError('Você não pode usar a senha padrão como sua nova senha.');
      return;
    }

    if (pendingUser) {
      setIsLoading(true);
      try {
        const updated = await authService.updateFirstPassword(pendingUser, newPassword);
        onLoginSuccess(updated);
      } catch (err) {
        setError('Erro ao salvar nova senha.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 overflow-hidden bg-[#020617]">
      <div className="w-full max-w-md relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-slate-950/80 backdrop-blur-2xl p-10 space-y-8 rounded-[3rem] shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-500/20 rotate-3">
              <span className="text-4xl font-black italic tracking-tighter">ALS</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
              {isChangingPassword ? 'Nova Senha' : 'Acesso Restrito'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">
              {isChangingPassword ? 'Primeiro acesso detectado' : 'Portal Operacional'}
            </p>
          </div>

          {!isChangingPassword ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Usuário</label>
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
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Senha</label>
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
                <div className="p-4 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 animate-shake text-center">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-6 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Entrar no Sistema'}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handlePasswordUpdate}>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <p className="text-[9px] text-amber-400 font-black uppercase text-center leading-tight">
                  Sua senha atual é temporária. <br/> Por favor, escolha uma senha definitiva para continuar.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nova Senha Pessoal</label>
                <input 
                  type="password" 
                  required 
                  autoFocus
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Repetir Senha</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>

              {error && (
                <div className="p-4 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 text-center">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-6 bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? 'Salvando...' : 'Salvar e Acessar Portal'}
              </button>
            </form>
          )}

          <div className="pt-4 text-center">
            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.5em]">© 2025 ALS LOGÍSTICA</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
