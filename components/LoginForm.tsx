
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
  
  // Troca de senha
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(r => setTimeout(r, 600));

    // 1. Admin Estático
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
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

    // 2. Banco de Usuários
    const users = await db.getUsers();
    const cleanUsername = username.replace(/\D/g, '') || username;
    const foundUser = users.find(u => u.username === cleanUsername);

    if (foundUser) {
       // Verificação de Senha (Motorista: Nome+CPF | Staff: 12345678 inicial)
       let isValid = false;
       if (foundUser.role === 'driver') {
          // Motoristas não cadastrados têm senha padrão se forem gerados agora
          // ou senhas salvas em um sistema de auth real. Aqui simulamos o match.
          isValid = password.length >= 4; // Simplificado para o protótipo
       } else {
          isValid = password === '12345678' || password === foundUser.position; // Simulando match de senha
       }

       if (isValid) {
          if (foundUser.isFirstLogin) {
             setPendingUser(foundUser);
             setIsChangingPassword(true);
          } else {
             onLoginSuccess({ ...foundUser, lastLogin: new Date().toISOString() });
          }
       } else {
          setError('Senha incorreta.');
       }
    } else {
       setError('Credenciais não encontradas.');
    }

    setIsLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError('Senhas não conferem.'); return; }
    if (newPassword.length < 8) { setError('Senha deve ter no mínimo 8 caracteres.'); return; }

    if (pendingUser) {
       const updated = { ...pendingUser, isFirstLogin: false, lastLogin: new Date().toISOString() };
       await db.saveUser(updated);
       onLoginSuccess(updated);
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
             {isChangingPassword ? 'Atualizar Senha' : 'Portal Integrado'}
          </h2>
          <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
             {isChangingPassword ? 'Primeiro acesso detectado' : 'Acesso Operacional'}
          </p>
        </div>

        {isChangingPassword ? (
           <form className="mt-8 space-y-6" onSubmit={handlePasswordUpdate}>
              <div className="space-y-4">
                 <input type="password" required className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl" placeholder="NOVA SENHA" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                 <input type="password" required className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl" placeholder="CONFIRMAR SENHA" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              {error && <div className="p-4 text-[10px] font-bold uppercase text-red-500 bg-red-50 rounded-xl">{error}</div>}
              <button type="submit" className="w-full py-5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl">Atualizar e Entrar</button>
           </form>
        ) : (
           <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                 <div className="group">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Acesso (Usuário ou CPF)</label>
                    <input type="text" required className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl focus:border-blue-400 outline-none transition-all" value={username} onChange={(e) => setUsername(e.target.value)} />
                 </div>
                 <div className="group">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Senha</label>
                    <input type="password" required className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl focus:border-blue-400 outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} />
                 </div>
              </div>
              {error && <div className="p-4 text-[10px] font-bold uppercase text-red-500 bg-red-50 rounded-xl">{error}</div>}
              <button type="submit" disabled={isLoading} className="w-full py-5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 transition-all">
                 {isLoading ? 'Verificando...' : 'Acessar Sistema'}
              </button>
           </form>
        )}

        <div className="text-[9px] font-bold text-center text-slate-300 uppercase tracking-widest pt-4">
          ALS Transportes &bull; Santos/SP
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
