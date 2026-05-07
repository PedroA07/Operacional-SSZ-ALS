
import React from 'react';
import { OperationDefinition } from '../../../types';

interface CategoryNavigationProps {
  availableOps: OperationDefinition[];
  onNavigate: (view: { type: 'category' | 'client', id?: string, categoryName: string, clientName?: string }) => void;
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({ availableOps, onNavigate }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 animate-in fade-in zoom-in-95 duration-500">
      {availableOps.map((op) => {
        const bg = op.color || '#0f172a';
        return (
          <button
            key={op.id}
            onClick={() => onNavigate({ type: 'category', id: op.id, categoryName: op.category })}
            className="w-full p-6 rounded-[2rem] shadow-lg transition-all text-left group relative overflow-hidden flex flex-col min-h-[160px] active:scale-95"
            style={{ backgroundColor: bg }}
          >
            {/* Decoração de fundo */}
            <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-500">
              <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
            </div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-auto">
                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.25em] mb-2">
                  Núcleo Operacional
                </p>
                <h3 className="text-lg font-black text-white uppercase leading-tight tracking-tight">
                  {op.category}
                </h3>
              </div>

              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-white/50 uppercase">Visualizar</span>
                  <span className="text-[7px] font-black text-white/70 uppercase tracking-widest">Cargas</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-white/40 group-hover:bg-white/30 group-hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </button>
        );
      })}

      {availableOps.length === 0 && (
        <div className="col-span-full py-16 text-center bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem]">
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">Nenhuma Categoria Habilitada</p>
        </div>
      )}
    </div>
  );
};

export default CategoryNavigation;
