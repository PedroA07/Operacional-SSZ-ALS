
import React from 'react';
import { Driver, OperationDefinition } from '../../../types';

interface GenericOperationViewProps {
  type: 'category' | 'client';
  categoryName: string;
  clientName?: string;
  drivers: Driver[];
  availableOps: OperationDefinition[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
}

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  type, 
  categoryName, 
  clientName, 
  drivers,
  availableOps,
  onNavigate
}) => {
  // REGRA: Filtrar apenas motoristas vinculados a esta operação específica
  const filteredDrivers = drivers.filter(d => 
    d.operations.some(op => {
      // Comparação em caixa alta para evitar erros de digitação
      if (type === 'category') return op.category.toUpperCase() === categoryName.toUpperCase();
      return op.category.toUpperCase() === categoryName.toUpperCase() && op.client.toUpperCase() === clientName?.toUpperCase();
    })
  );

  const currentOp = availableOps.find(o => o.category.toUpperCase() === categoryName.toUpperCase());

  return (
    <div className="space-y-8 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 ${type === 'category' ? 'bg-slate-900' : 'bg-blue-600'} rounded-[2rem] flex items-center justify-center text-white font-black italic shadow-2xl`}>
            {type === 'category' ? categoryName.substring(0, 2).toUpperCase() : clientName?.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">
              {type === 'category' ? categoryName : clientName}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">
              {type === 'category' ? 'Monitoramento de Categoria' : `Página Dedicada • ${categoryName}`}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
           <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm text-center">
             <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Frota Vinculada</p>
             <p className="text-2xl font-black text-slate-800">{filteredDrivers.length}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Coluna Principal: Motoristas Ativos na Operação */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest">Motoristas Autorizados</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase italic">* Exibindo apenas motoristas com vínculo no cadastro</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Motorista</th>
                    <th className="px-6 py-4">Documentos</th>
                    <th className="px-6 py-4">Placa Cavalo</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredDrivers.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-700 uppercase">{d.name}</p>
                        <p className="text-[8px] text-slate-400 font-bold mt-0.5">{d.driverType}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-500 font-medium">CPF: {d.cpf}</p>
                        <p className="text-slate-400 font-medium">RG: {d.rg}</p>
                      </td>
                      <td className="px-6 py-4 font-mono font-black text-blue-600 uppercase text-xs">{d.plateHorse}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-slate-300 font-bold uppercase italic border-2 border-dashed border-slate-100 rounded-b-3xl">
                        Nenhum motorista possui vínculo direto com esta operação.<br/>
                        <span className="text-[9px] mt-2 block">Adicione esta operação ao cadastro do motorista para visualizá-lo aqui.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar da Operação: Subcategorias / Clientes */}
        <div className="lg:col-span-4 space-y-6">
          {type === 'category' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest mb-6 border-b border-slate-100 pb-4">Navegar por Clientes</h3>
              <div className="space-y-3">
                {currentOp?.clients.map((client, i) => (
                  <button 
                    key={i}
                    onClick={() => client.hasDedicatedPage && onNavigate({ type: 'client', categoryName: categoryName, clientName: client.name })}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${client.hasDedicatedPage ? 'border-slate-100 bg-slate-50 hover:border-blue-500 hover:bg-white group' : 'border-dashed border-slate-100 opacity-50 cursor-not-allowed'}`}
                  >
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase">{client.name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                        {client.hasDedicatedPage ? 'Possui Página Dedicada' : 'Apenas Categoria'}
                      </p>
                    </div>
                    {client.hasDedicatedPage && (
                      <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">KPI da Operação</p>
            <p className="text-sm font-bold leading-relaxed">SLA de Atendimento: <span className="text-emerald-400 font-black">98.2%</span></p>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-[10px] text-slate-400 font-bold uppercase italic leading-tight">"A eficiência operacional reside na correta alocação da frota autorizada."</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericOperationView;
