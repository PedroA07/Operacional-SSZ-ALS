
import React, { useMemo } from 'react';
import { Driver, OperationDefinition, User, Customer } from '../../../types';
import SmartOperationTable from './SmartOperationTable';

interface GenericOperationViewProps {
  user: User;
  type: 'category' | 'client';
  categoryName: string;
  clientName?: string;
  drivers: Driver[];
  customers: Customer[];
  availableOps: OperationDefinition[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
}

const GenericOperationView: React.FC<GenericOperationViewProps> = ({ 
  user,
  type, 
  categoryName, 
  clientName, 
  drivers,
  customers,
  availableOps,
  onNavigate
}) => {
  // REGRA: Filtrar apenas motoristas vinculados a esta operação específica
  const filteredDrivers = drivers.filter(d => 
    d.operations.some(op => {
      if (type === 'category') return op.category.toUpperCase() === categoryName.toUpperCase();
      return op.category.toUpperCase() === categoryName.toUpperCase() && op.client.toUpperCase() === clientName?.toUpperCase();
    })
  );

  // REGRA: Buscar todos os clientes da base que possuem esta categoria vinculada
  const linkedCustomers = useMemo(() => {
    return customers.filter(c => 
      c.operations?.some(op => op.toUpperCase() === categoryName.toUpperCase())
    );
  }, [customers, categoryName]);

  const currentOp = availableOps.find(o => o.category.toUpperCase() === categoryName.toUpperCase());

  const driverColumns = [
    { key: 'name', label: 'Motorista', render: (d: any) => (
      <div>
        <p className="font-bold text-slate-800 uppercase">{d.name}</p>
        <p className="text-[8px] text-slate-400 font-bold mt-0.5">{d.driverType}</p>
      </div>
    )},
    { key: 'documents', label: 'Documentação', render: (d: any) => (
      <div>
        <p className="text-slate-500 font-medium">CPF: {d.cpf}</p>
        <p className="text-slate-400 font-medium">RG: {d.rg}</p>
      </div>
    )},
    { key: 'plateHorse', label: 'Placa Cavalo', render: (d: any) => <span className="font-mono font-black text-blue-600 text-xs">{d.plateHorse}</span> },
    { key: 'plateTrailer', label: 'Placa Carreta', render: (d: any) => <span className="font-mono font-bold text-slate-400">{d.plateTrailer}</span> },
    { key: 'phone', label: 'Telefone', render: (d: any) => <span className="text-slate-500">{d.phone}</span> },
    { key: 'status', label: 'Status', render: (d: any) => (
      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${d.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
        {d.status}
      </span>
    )}
  ];

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
        <div className="lg:col-span-8 space-y-6">
          <SmartOperationTable 
            userId={user.id}
            componentId={`op-drivers-${type}-${categoryName}-${clientName || 'all'}`}
            title="Motoristas Autorizados na Operação"
            columns={driverColumns}
            data={filteredDrivers}
            defaultVisibleKeys={['name', 'plateHorse', 'status']}
          />
        </div>

        <div className="lg:col-span-4 space-y-6">
          {type === 'category' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="font-black text-slate-700 uppercase text-[10px] tracking-widest mb-6 border-b border-slate-100 pb-4">Clientes Vinculados à Categoria</h3>
              <div className="space-y-3">
                {linkedCustomers.map((cust, i) => (
                  <button 
                    key={cust.id}
                    onClick={() => onNavigate({ type: 'client', categoryName: categoryName, clientName: cust.name })}
                    className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-blue-500 hover:bg-white group transition-all text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black text-slate-700 uppercase">{cust.name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                        {cust.city} - {cust.state}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}
                {linkedCustomers.length === 0 && (
                  <p className="text-[9px] text-slate-400 font-bold uppercase italic text-center py-6">Nenhum cliente vinculado a esta categoria.</p>
                )}
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
