
import React, { useState } from 'react';

interface SILPortalViewProps {
  user: string;
  onLogout: () => void;
}

const SILPortalView: React.FC<SILPortalViewProps> = ({ user, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState('programacao');

  const mockData = [
    { sm: '998123', cliente: 'VOLKSWAGEN', motorista: 'CLAUDIO SILVA', placa: 'ABC-1D23', status: 'Em Viagem', cor: 'text-blue-600' },
    { sm: '998124', cliente: 'DIAGEO', motorista: 'ROBERTO ALVES', placa: 'EGF-9X44', status: 'Iniciada', cor: 'text-emerald-600' },
    { sm: '998125', cliente: 'OWENS', motorista: 'MARCO AURELIO', placa: 'FGT-2J11', status: 'Alerta Risco', cor: 'text-red-600' }
  ];

  return (
    <div className="w-full h-full flex bg-[#f4f7f9] text-slate-700">
      {/* Menu Lateral SIL */}
      <aside className="w-64 bg-[#001e50] flex flex-col shrink-0">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#001e50] font-black italic text-xs">SIL</div>
          <span className="text-white font-black text-[10px] uppercase tracking-wider">Opentech v8.4</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[7px] font-black text-blue-300 uppercase px-3 mb-2 opacity-50">Principal</div>
          <button className="w-full text-left px-4 py-2 text-white/60 text-[10px] font-bold uppercase hover:bg-white/5 rounded-lg">Dashboard</button>
          
          <div className="text-[7px] font-black text-blue-300 uppercase px-3 mt-6 mb-2 opacity-50">Operações</div>
          <button onClick={() => setActiveMenu('programacao')} className={`w-full text-left px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeMenu === 'programacao' ? 'bg-blue-600 text-white shadow-lg' : 'text-white/60 hover:bg-white/5'}`}>Programação Detalhada</button>
          <button className="w-full text-left px-4 py-2 text-white/60 text-[10px] font-bold uppercase hover:bg-white/5 rounded-lg">Checklist de Carga</button>
          <button className="w-full text-left px-4 py-2 text-white/60 text-[10px] font-bold uppercase hover:bg-white/5 rounded-lg">Liberação de SM</button>
        </nav>

        <div className="p-6 bg-black/20">
          <p className="text-[8px] font-black text-blue-300 uppercase leading-none">Logado como:</p>
          <p className="text-[10px] font-black text-white mt-1 uppercase truncate">{user}</p>
          <button onClick={onLogout} className="mt-4 w-full py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[8px] font-black uppercase hover:bg-red-500 hover:text-white transition-all">Sair do SIL</button>
        </div>
      </aside>

      {/* Área de Trabalho SIL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h1 className="text-xs font-black text-slate-800 uppercase tracking-widest">Módulo de Programação Detalhada</h1>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase">Exportar Excel</button>
            <div className="w-10 h-10 rounded-full bg-slate-200"></div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-[#f8fafc] p-4 border-b border-slate-200 grid grid-cols-4 gap-4">
               <input type="text" className="px-3 py-2 bg-white border border-slate-300 rounded text-[10px] uppercase font-bold" placeholder="FILTRAR SM..." />
               <input type="text" className="px-3 py-2 bg-white border border-slate-300 rounded text-[10px] uppercase font-bold" placeholder="PLACA..." />
               <select className="px-3 py-2 bg-white border border-slate-300 rounded text-[10px] uppercase font-bold">
                 <option>TODOS OS STATUS</option>
                 <option>EM VIAGEM</option>
               </select>
               <button className="bg-[#001e50] text-white text-[9px] font-black uppercase rounded shadow-md">Aplicar Filtros</button>
            </div>

            <table className="w-full text-left">
              <thead className="bg-[#f1f4f8] text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nº SM</th>
                  <th className="px-6 py-4">Operação / Cliente</th>
                  <th className="px-6 py-4">Motorista</th>
                  <th className="px-6 py-4">Placa</th>
                  <th className="px-6 py-4">Situação Atual</th>
                  <th className="px-6 py-4 text-right">Opções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mockData.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-[11px] font-black text-[#001e50]">{d.sm}</td>
                    <td className="px-6 py-4 text-[10px] font-bold uppercase">{d.cliente}</td>
                    <td className="px-6 py-4 text-[10px] font-bold uppercase">{d.motorista}</td>
                    <td className="px-6 py-4 text-[11px] font-mono font-black">{d.placa}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase ${d.cor}`}>{d.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 font-black text-[9px] uppercase hover:underline">Ver Mapa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SILPortalView;
