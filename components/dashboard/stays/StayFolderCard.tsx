
import React from 'react';
import { StaySession } from '../../../types';

interface StayFolderCardProps {
  session: StaySession;
  onClick: (session: StaySession) => void;
  onDelete: (session: StaySession, e: React.MouseEvent) => void;
}

const StayFolderCard: React.FC<StayFolderCardProps> = ({ session, onClick, onDelete }) => {
  // Tenta quebrar por pipes primeiro, se não encontrar, tenta por espaço (suporte legado)
  const hasPipes = session.category.includes('|');
  const parts = hasPipes ? session.category.split('|') : session.category.split(' ');
  
  let catName = 'GERAL';
  let year = '';
  let month = '';
  let days = '';

  if (hasPipes) {
    catName = parts[0] || 'GERAL';
    year = parts[1] || '';
    month = parts[2] || '';
    days = parts[3] || '';
  } else {
    // Fallback inteligente para nomes antigos sem pipes: "CATEGORIA 2026 JANEIRO 01 A 10"
    if (parts.length >= 4) {
      catName = parts[0];
      year = parts[1];
      month = parts[2];
      days = parts.slice(3).join(' ');
    } else {
      catName = session.category;
    }
  }

  return (
    <button 
      onClick={() => onClick(session)} 
      className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-xl transition-all group text-left relative overflow-hidden flex flex-col h-[320px]"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2.5"/>
          </svg>
        </div>
        <div 
          onClick={(e) => onDelete(session, e)}
          className="w-10 h-10 rounded-xl bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
      </div>
      
      <div className="flex-1 space-y-1">
        <h4 className="text-xl font-black text-slate-900 uppercase leading-none truncate mb-1">{catName}</h4>
        <p className="text-sm font-black text-blue-600 uppercase leading-none">{year}</p>
        <p className="text-sm font-black text-slate-500 uppercase leading-none">{month}</p>
        <p className="text-[11px] font-bold text-slate-400 uppercase leading-none">{days}</p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-slate-50 pt-6 shrink-0">
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">R$ {session.costPerHour}/H</span>
          <span className="text-[7px] font-bold text-slate-400 uppercase">{session.gracePeriodHours}H CARÊNCIA</span>
        </div>
        <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M9 5l7 7-7 7" strokeWidth="3"/>
        </svg>
      </div>
    </button>
  );
};

export default StayFolderCard;
