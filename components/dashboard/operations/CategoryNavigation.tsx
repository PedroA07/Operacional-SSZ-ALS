
import React from 'react';
import { OperationDefinition, Customer } from '../../../types';

interface CategoryNavigationProps {
  availableOps: OperationDefinition[];
  customers: Customer[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ availableOps, customers, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
      {availableOps.map((op) => (
        <div key={op.id} className="space-y-4">
          {/* Card Principal da Categoria (do Banco) */}
          <button
            onClick={() => onNavigate({ type: 'category', id: op.id, categoryName: op.category })}
            className="w-full bg-slate-900 p-8 rounded-[2.5rem] shadow-xl hover:bg-blue-600 transition-all text-left group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <svg className="w-20 h-20 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
            </div>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">Categoria Master</p>
            <h3 className="text-xl font-black text-white uppercase leading-none">{op.category}</h3>
            <div className="mt-6 flex items-center gap-2">
               <span className="text-[9px] font-bold text-slate-400 group-hover:text-white transition-colors">Visualizar Geral</span>
               <svg className="w-3 h-3 text-blue-500 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" /></svg>
            </div>
          </button>

          {/* Sub-cards de Clientes (Subcategoria) vinculados a esta categoria */}
          <div className="grid grid-cols-1 gap-2 pl-2">
            {op.clients.length > 0 ? (
              op.clients.map(client => (
                <button
                  key={client.name}
                  onClick={() => onNavigate({ type: 'client', categoryName: op.category, clientName: client.name })}
                  className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black text-slate-600 uppercase group-hover:text-blue-600 transition-colors truncate block">{client.name}</span>
                    <p className="text-[7px] font-bold text-slate-400 uppercase">Acesso por Cliente</p>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3"/></svg>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 border border-dashed border-slate-100 rounded-2xl text-center">
                 <p className="text-[8px] font-bold text-slate-300 uppercase italic">Nenhum cliente vinculado</p>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {availableOps.length === 0 && (
         <div className="col-span-full py-20 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Nenhuma Categoria Habilitada no Banco de Dados</p>
         </div>
      )}
    </div>
  );
};

export default CategoryNavigation;
