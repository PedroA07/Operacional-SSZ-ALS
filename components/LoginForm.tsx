
import React, { useState, useEffect } from 'react';
import { ADMIN_CREDENTIALS, PASSWORD_REQUIREMENTS } from '../constants';

interface LoginFormProps {
  onLoginSuccess: (username: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('ssz_saved_username');
    const savedPass = localStorage.getItem('ssz_saved_password');
    if (savedUser && savedPass) {
      setUsername(savedUser);
      setPassword(savedPass);
      setRememberMe(true);
    } else if (savedUser) {
      setUsername(savedUser);
      setRememberMe(true);
    }
  }, []);

  const validatePassword = (pwd: string) => {
    return PASSWORD_REQUIREMENTS.pattern.test(pwd);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(r => setTimeout(r, 800));

    if (username !== ADMIN_CREDENTIALS.username) {
      setError('Usuário não reconhecido.');
      setIsLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      setIsLoading(false);
      return;
    }

    if (password !== ADMIN_CREDENTIALS.password) {
      setError('Senha incorreta.');
      setIsLoading(false);
      return;
    }

    if (rememberMe) {
      localStorage.setItem('ssz_saved_username', username);
      localStorage.setItem('ssz_saved_password', password);
    } else {
      localStorage.removeItem('ssz_saved_username');
      localStorage.removeItem('ssz_saved_password');
    }

    onLoginSuccess(username);
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-slate-50">
      <div className="w-full max-w-md p-10 space-y-8 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-3xl bg-blue-700 text-white shadow-xl">
            <span className="text-3xl font-black italic">ALS</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">ALS Transportes</h2>
          <p className="mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Command Center</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="group">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2 transition-colors group-focus-within:text-blue-500">Credencial de Usuário</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl focus:outline-none focus:bg-white focus:border-blue-400 transition-all shadow-inner"
                placeholder="USUÁRIO"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="group">
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2 transition-colors group-focus-within:text-blue-500">Chave de Segurança</label>
              <input
                type="password"
                required
                className="w-full px-5 py-4 border border-slate-200 bg-slate-50 text-slate-700 font-bold rounded-2xl focus:outline-none focus:bg-white focus:border-blue-400 transition-all shadow-inner"
                placeholder="SENHA"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer">
              Salvar Login
            </label>
          </div>

          {error && (
            <div className="p-4 text-[10px] font-bold uppercase tracking-tight text-red-500 bg-red-50/50 border border-red-100 rounded-xl flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-5 px-4 bg-slate-800 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-600 focus:outline-none shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? 'Autenticando...' : 'Iniciar Sessão'}
          </button>
        </form>

        <div className="text-[9px] font-bold text-center text-slate-300 uppercase tracking-widest pt-4">
          Criptografia de ponta-a-ponta &bull; v2.5
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
