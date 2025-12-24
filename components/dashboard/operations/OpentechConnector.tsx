
import React, { useState } from 'react';
import { opentechApiService } from '../../../utils/opentechApiService';

interface OpentechConnectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: any[]) => void;
}

const OpentechConnector: React.FC<OpentechConnectorProps> = ({ isOpen, onClose, onSuccess }) => {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Executa o fluxo completo: Login -> Navegação -> Programação Detalhada -> Parsing
      const data = await opentechApiService.fullSync(user, pass);
      
      if (data.length > 0) {
        onSuccess(data);
        onClose();
      } else {
        setError('Nenhuma programação encontrada para este usuário hoje.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar com o servidor SIL.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
        <div className="p-8 bg-[#001e50] text-white flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg">
             <span className="text-[#001e50] font-black text-2xl italic">SIL</span>
          </div>
          <h3 className="font-black text-lg uppercase tracking-tight">Login Portal SIL</h3>
          <p className="text-[9px] font-bold text-blue-200 uppercase tracking-widest mt-1 opacity-60">Puxar Programação Detalhada</p>
        </div>

        <form onSubmit={handleConnect} className="p-10 space-y-5">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Usuário Opentech</label>
            <input 
              required
              type="text" 
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold outline-none focus:border-blue-500 transition-all"
              placeholder="Ex: operacional_ssz"
              value={user}
              onChange={e => setUser(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Senha de Acesso</label>
            <input 
              required
              type="password" 
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-bold outline-none focus:border-blue-500 transition-all"
              placeholder="••••••••"
              value={pass}
              onChange={e => setPass(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase text-center border border-red-100 animate-shake">
              {error}
            </div>
          )}

          <button 
            disabled={loading}
            className="w-full py-5 bg-[#001e50] text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Acessando Módulo de Programação...
              </>
            ) : 'Sincronizar Viagens'}
          </button>

          <button 
            type="button"
            onClick={onClose}
            className="w-full py-4 text-slate-400 text-[10px] font-black uppercase hover:text-slate-600 transition-all"
          >
            Cancelar
          </button>
        </form>

        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-tight">
             Este portal utiliza conexão segura. Seus dados de acesso não são armazenados, servindo apenas para a extração momentânea da base de dados Opentech.
           </p>
        </div>
      </div>
    </div>
  );
};

export default OpentechConnector;
