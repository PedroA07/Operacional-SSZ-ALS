
import React, { useState } from 'react';
import { ADMIN_CREDENTIALS } from '../constants';
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

  // Estados para troca de senha (primeiro acesso)
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const inputUser = username.trim().toLowerCase();

    // 1. Validar Admin Master Hardcoded
    if (inputUser === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setTimeout(() => {
        onLoginSuccess({
          id: 'admin-master',
          username: 'operacional_ssz',
          displayName: 'Operacional SSZ',
          role: 'admin',
          lastLogin: new Date().toISOString(),
          position: 'Diretoria de Operações',
          isFirstLogin: false
        });
      }, 800);
      return;
    }

    try {
      // 2. Buscar usuários do banco
      const users = await db.getUsers();
      const foundUser = users.find(u => u.username.toLowerCase() === inputUser);

      if (foundUser) {
        if (foundUser.password === password) {
          if (foundUser.isFirstLogin) {
            setPendingUser(foundUser);
            setIsChangingPassword(true);
            setIsLoading(false);
          } else {
            onLoginSuccess({ ...foundUser, lastLogin: new Date().toISOString() });
          }
        } else {
          setError('Senha incorreta para este usuário.');
          setIsLoading(false);
        }
      } else {
        setError('Usuário não localizado no sistema.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor de dados.');
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword === '12345678') {
      setError('A nova senha não pode ser a senha padrão.');
      return;
    }

    if (pendingUser) {
      setIsLoading(true);
      try {
        const updatedUser: User = {
          ...pendingUser,
          password: newPassword,
          isFirstLogin: false,
          lastLogin: new Date().toISOString()
        };
        await db.saveUser(updatedUser);
        onLoginSuccess(updatedUser);
      } catch (err) {
        setError('Erro ao atualizar senha.');
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 overflow-hidden">
      <div className="w-full max-w-md relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        
        <div className="relative bg-slate-950/80 backdrop-blur-2xl p-10 space-y-8 rounded-[3rem] shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-blue-600 text-white shadow-2xl shadow-blue-500/20 rotate-3">
              <span className="text-4xl font-black italic tracking-tighter">ALS</span>
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
              {isChangingPassword ? 'Nova Senha' : 'Portal de Acesso'}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em]">
              {isChangingPassword ? 'Defina seu acesso pessoal' : 'Logística & Transportes'}
            </p>
          </div>

          {!isChangingPassword ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Usuário Operacional</label>
                <input 
                  type="text" 
                  required 
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="nome.sobrenome"
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
          ) : (
            <form className="space-y-5" onSubmit={handlePasswordUpdate}>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <p className="text-[9px] text-amber-400 font-black uppercase text-center leading-tight">
                  Este é seu primeiro acesso. Por segurança, altere sua senha para continuar.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nova Senha</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="••••••••"
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Confirmar Senha</label>
                <input 
                  type="password" 
                  required 
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white font-bold rounded-2xl focus:border-blue-500 focus:bg-white/10 outline-none transition-all placeholder:text-slate-700" 
                  placeholder="••••••••"
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>

              {error && (
                <div className="p-4 text-[10px] font-black uppercase text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-6 bg-emerald-600 text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl hover:bg-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isLoading ? 'Salvando...' : 'Atualizar e Entrar'}
              </button>
            </form>
          )}

          <div className="pt-4 text-center">
            <p className="text-[8px] text-slate-600 font-bold uppercase tracking-[0.5em]">© 2025 ALS SISTEMAS INTELIGENTES</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
