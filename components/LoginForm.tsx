import React, { useState } from 'react';
import { ADMIN_CREDENTIALS, PASSWORD_REQUIREMENTS } from '../constants';
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
  
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const input = username.trim();

    // 1. Prioridade Master: Admin operacional_ssz
    if (input === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      onLoginSuccess({
        id: 'admin-01',
        username: 'operacional_ssz',
        displayName: 'Administrador Master',
        role: 'admin',
        lastLogin: new Date().toISOString(),
        position: 'Sócio-Diretor'
      });
      return;
    }

    try {
      const users = await db.getUsers();
      
      // Limpeza para verificar se o input é CPF (só números)
      const cleanInput = input.replace(/\D/g, '');
      const isCpfFormat = cleanInput.length === 11 && /^\d+$/.test(cleanInput);

      let foundUser = users.find(u => {
        const dbUser = u.username.toLowerCase();
        const searchInput = input.toLowerCase();
        
        // Se for motorista/motoboy, busca pelo CPF limpo
        if (u.role === 'driver' || u.role === 'motoboy') {
          return dbUser === cleanInput;
        }
        
        // Se for staff/admin, busca pelo nome.sobrenome
        return dbUser === searchInput;
      });

      if (foundUser) {
        if (password === foundUser.password) {
          // Verifica troca de senha obrigatória (apenas staff/admin)
          if (foundUser.isFirstLogin && (foundUser.role === 'staff' || foundUser.role === 'admin')) {
            setPendingUser(foundUser);
            setIsChangingPassword(true);
          } else {
            onLoginSuccess({ ...foundUser, lastLogin: new Date().toISOString() });
          }
        } else {
          setError('Senha incorreta.');
        }
      } else {
        setError('Usuário ou CPF não encontrado.');
      }
    } catch (err) {
      setError('Erro na base de dados.');
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

    if (newPassword.length < PASSWORD_REQUIREMENTS.minLength) { 
      setError(`Mínimo ${PASSWORD_REQUIREMENTS.minLength} caracteres.`); 
      return; 
    }

    if (pendingUser) {
      setIsLoading(true);
      try {
        const updated: User = { 
          ...pendingUser, 
          password: newPassword,
          isFirstLogin: false, 
          lastLogin: new Date().toISOString() 
        };
        
        await db.saveUser(updated);
        onLoginSuccess(updated);
      } catch (err) {
        setError('Erro ao salvar senha.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-[#0f172a]">
      <div className="w-full max-w-md p-10 space-y-8 bg-white rounded-[3rem] shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-blue-700 text-white shadow-xl">
            <span className="text-4xl font-black italic">ALS</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
             {isChangingPassword ? 'Redefinir Senha' : 'Portal Operacional'}
          </h2>
          <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
             {isChangingPassword ? 'Crie sua senha pessoal' : 'Login Integrado'}
          </p>
        </div>

        {isChangingPassword ? (
           <form className="mt-8 space-y-6" onSubmit={handlePasswordUpdate}>
              <div className="space-y-4">
                 <input 
                    type="password" 
                    required 
                    autoFocus
                    className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-500 outline-none" 
                    placeholder="NOVA SENHA" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                 />
                 <input 
                    type="password" 
                    required 
                    className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-500 outline-none" 
                    placeholder="REPETIR SENHA" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                 />
              </div>
              {error && <div className="p-4 text-[10px] font-bold uppercase text-red-500 bg-red-50 rounded-xl">{error}</div>}
              <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black uppercase rounded-2xl shadow-xl hover:bg-emerald-600 transition-all">
                Salvar e Entrar
              </button>
           </form>
        ) : (
           <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Usuário ou CPF</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-400 outline-none" 
                      placeholder="NOME.SOBRENOME OU CPF"
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                    />
                 </div>
                 <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Senha</label>
                    <input 
                      type="password" 
                      required 
                      className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-400 outline-none" 
                      placeholder="********"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                    />
                 </div>
              </div>
              {error && <div className="p-4 text-[10px] font-bold uppercase text-red-500 bg-red-50 rounded-xl">{error}</div>}
              <button type="submit" disabled={isLoading} className="w-full py-5 bg-slate-900 text-white font-black uppercase rounded-2xl hover:bg-blue-600 shadow-xl transition-all">
                 {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
              </button>
           </form>
        )}
      </div>
    </div>
  );
};

export default LoginForm;