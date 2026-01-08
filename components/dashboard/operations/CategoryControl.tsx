
import React from 'react';

interface CategoryControlProps {
  onOpenManager: () => void;
}

const CategoryControl: React.FC<CategoryControlProps> = ({ onOpenManager }) => {
  return (
    <div className="flex items-center gap-3">
      <button 
        onClick={onOpenManager}
        className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all flex items-center gap-2 group shadow-sm active:scale-95"
      >
        <svg className="w-4 h-4 text-blue-500 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
        Configurar Categorias
      </button>
    </div>
  );
};

export default CategoryControl;
