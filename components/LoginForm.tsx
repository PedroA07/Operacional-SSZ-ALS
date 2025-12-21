
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
  
  // Troca de senha
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const inputString = String(username).trim();

    // 1. Prioridade Master: Admin operacional_ssz
    if (inputString === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
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
      
      // 2. Busca Prioritária: Equipe (Staff/Admin) por nome de usuário exato
      let foundUser = users.find(u => 
        (u.role === 'staff' || u.role === 'admin') && 
        String(u.username).toLowerCase() === inputString.toLowerCase()
      );

      // 3. Fallback: Motoristas por CPF (limpa o input para números)
      if (!foundUser) {
        const numericCPF = inputString.replace(/\D/g, '');
        if (numericCPF.length >= 11) {
          foundUser = users.find(u => 
            u.role === 'driver' && 
            String(u.username) === numericCPF
          );
        }
      }

      if (foundUser) {
        let isValid = false;
        
        // Verificação de senha robusta
        if (!foundUser.isFirstLogin && foundUser.password) {
          isValid = password === String(foundUser.password);
        } else {
          // Lógica de Primeiro Acesso
          if (foundUser.role === 'driver') {
            isValid = password.length >= 4; 
          } else {
            const defaultPass = '12345678';
            isValid = password === defaultPass || 
                      (foundUser.position && password === String(foundUser.position).toUpperCase());
          }
        }

        if (isValid) {
          if (foundUser.isFirstLogin || !foundUser.password) {
            setPendingUser(foundUser);
            setIsChangingPassword(true);
          } else {
            onLoginSuccess({ ...foundUser, lastLogin: new Date().toISOString() });
          }
        } else {
          setError('Senha incorreta para este usuário.');
        }
      } else {
        setError('Usuário ou CPF não encontrado na base de dados.');
      }
    } catch (err) {
      setError('Falha na comunicação com o banco de dados.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    if (newPassword.length < PASSWORD_REQUIREMENTS.minLength) { 
      setError(`A senha deve conter no mínimo ${PASSWORD_REQUIREMENTS.minLength} caracteres.`); 
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
        setError('Não foi possível salvar a nova senha.');
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
             {isChangingPassword ? 'Redefinir Acesso' : 'Portal Operacional'}
          </h2>
          <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">
             {isChangingPassword ? 'Crie sua senha pessoal de 8 dígitos' : 'Identificação de Segurança'}
          </p>
        </div>

        {isChangingPassword ? (
           <form className="mt-8 space-y-6" onSubmit={handlePasswordUpdate}>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nova Senha</label>
                    <input 
                      type="password" 
                      required 
                      autoFocus
                      className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-500 outline-none" 
                      placeholder="MÍNIMO 8 CARACTERES" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)} 
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Repetir Senha</label>
                    <input 
                      type="password" 
                      required 
                      className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-500 outline-none" 
                      placeholder="CONFIRME A SENHA" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                    />
                 </div>
              </div>
              {error && <div className="p-4 text-[10px] font-bold uppercase text-red-500 bg-red-50 rounded-xl border border-red-100">{error}</div>}
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full py-5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-emerald-600 transition-all"
              >
                {isLoading ? 'Sincronizando...' : 'Confirmar e Entrar'}
              </button>
           </form>
        ) : (
           <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                 <div className="group">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Identificação (Usuário ou CPF)</label>
                    <input 
                      type="text" 
                      required 
                      className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-400 outline-none transition-all" 
                      placeholder="Ex: joao.silva ou CPF"
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                    />
                 </div>
                 <div className="group">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Senha</label>
                    <input 
                      type="password" 
                      required 
                      className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-900 font-bold rounded-2xl focus:border-blue-400 outline-none transition-all" 
                      placeholder="********"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                    />
                 </div>
              </div>
              {error && <div className="p-4 text-[10px] font-bold uppercase text-red-500 bg-red-50 rounded-xl border border-red-100">{error}</div>}
              <button 
                type="submit" 
                disabled={isLoading} 
                className="w-full py-5 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 transition-all shadow-xl"
              >
                 {isLoading ? 'Validando...' : 'Entrar no Sistema'}
              </button>
           </form>
        )}

        <div className="text-[9px] font-bold text-center text-slate-300 uppercase tracking-widest pt-4">
          ALS Transportes Profissional &bull; v3.0
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
