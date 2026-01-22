
import React from 'react';
import { OperationDefinition } from '../../../types';

interface CategoryNavigationProps {
  availableOps: OperationDefinition[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ availableOps, onNavigate }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-500">
      {availableOps.map((op) => (
        <button
          key={op.id}
          onClick={() => onNavigate({ type: 'category', id: op.id, categoryName: op.category })}
          className="w-full bg-slate-900 p-10 rounded-[3rem] shadow-xl hover:bg-blue-600 transition-all text-left group relative overflow-hidden flex flex-col h-full min-h-[220px]"
        >
          {/* Background Icon Decor */}
          <div className="absolute -bottom-6 -right-6 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
            <svg className="w-48 h-48 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div className="mb-auto">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-3 group-hover:text-white transition-colors">
                Núcleo Operacional
              </p>
              <h3 className="text-2xl font-black text-white uppercase leading-tight tracking-tighter">
                {op.category}
              </h3>
            </div>

            <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5">
               <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-100 transition-colors uppercase">Visualizar Cargas</span>
                  <span className="text-[8px] font-black text-blue-500 group-hover:text-white uppercase tracking-widest mt-0.5">Sincronizado</span>
               </div>
               <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:bg-white group-hover:text-blue-600 transition-all shadow-lg">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                 </svg>
               </div>
            </div>
          </div>
        </button>
      ))}
      
      {availableOps.length === 0 && (
         <div className="col-span-full py-24 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[3rem]">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeWidth="2.5"/>
               </svg>
            </div>
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Nenhuma Categoria Habilitada no Banco de Dados</p>
         </div>
      )}
    </div>
  );
};

export default CategoryNavigation;
