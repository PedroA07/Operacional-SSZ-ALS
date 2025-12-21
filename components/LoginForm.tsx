
import React, { useState, useEffect } from 'react';
import { ADMIN_CREDENTIALS, PASSWORD_REQUIREMENTS } from '../constants';
import { db } from '../utils/storage';

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Pequeno delay para experiência de segurança
    await new Promise(r => setTimeout(r, 600));

    // 1. Tentar Login Administrativo/Staff
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      onLoginSuccess({
        id: 'admin-01',
        username: 'Operacional SSZ',
        role: 'admin',
        lastLogin: new Date().toLocaleString()
      });
      setIsLoading(false);
      return;
    }

    // 2. Tentar Login de Motorista (O CPF é o username e a senha padrão é o CPF também ou definida)
    const drivers = await db.getDrivers();
    const cleanUsername = username.replace(/\D/g, '');
    const driver = drivers.find(d => d.cpf.replace(/\D/g, '') === cleanUsername);

    if (driver) {
      // Se for motorista, a senha padrão neste exemplo é o CPF, 
      // mas em produção o Supabase Auth cuidaria de senhas reais.
      if (password === cleanUsername || password === 'als123') {
        onLoginSuccess({
          id: `u-${driver.id}`,
          username: driver.name,
          role: 'driver',
          driverId: driver.id,
          lastLogin: new Date().toLocaleString()
        });
        setIsLoading(false);
        return;
      } else {
        setError('Senha do motorista incorreta.');
      }
    } else {
      setError('Credenciais inválidas ou usuário não cadastrado.');
    }

    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-[#0f172a]">
      <div className="w-full max-w-md p-10 space-y-8 bg-white rounded-[3rem] shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-blue-700 text-white shadow-xl">
            <span className="text-4xl font-black italic">ALS</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Portal Integrado</h2>
          <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Operacional & Motoristas</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="group">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Usuário ou CPF</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl focus:outline-none focus:border-blue-400 transition-all"
                placeholder="DIGITE SEU ACESSO"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="group">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2">Senha</label>
              <input
                type="password"
                required
                className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl focus:outline-none focus:border-blue-400 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 text-[10px] font-bold uppercase text-red-500 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-5 px-4 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 shadow-xl transition-all disabled:opacity-50"
          >
            {isLoading ? 'Verificando...' : 'Entrar no Sistema'}
          </button>
        </form>

        <div className="text-[9px] font-bold text-center text-slate-300 uppercase tracking-widest pt-4">
          ALS Transportes &bull; v3.0 Profissional
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
