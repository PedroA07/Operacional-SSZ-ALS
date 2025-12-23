
import React from 'react';
import { db } from '../../utils/storage';

const DatabaseStatus: React.FC = () => {
  const isCloud = db.isCloudActive();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500 ${
      isCloud 
      ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/10' 
      : 'bg-amber-50 border-amber-100 text-amber-600 shadow-sm shadow-amber-500/10'
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${isCloud ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
      <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
        Banco: {isCloud ? 'Nuvem' : 'Local'}
      </span>
    </div>
  );
};

export default DatabaseStatus;