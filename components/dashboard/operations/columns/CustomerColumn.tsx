
import React from 'react';
import { Trip } from '../../../../types';
import { maskCNPJ } from '../../../../utils/masks';

export const CustomerColumn = (t: Trip) => (
  <div className="flex flex-col space-y-1.5 whitespace-normal min-w-[220px]">
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Nome Fantasia</span>
      <p className="font-black text-slate-800 uppercase text-[11px] leading-tight">
        {t.customer?.name}
      </p>
    </div>
    
    <div className="flex flex-col">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Razão Social</span>
      <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">
        {t.customer?.legalName || t.customer?.name}
      </p>
    </div>

    <div className="flex flex-col pt-1 border-t border-slate-50">
      <p className="text-[9px] font-black text-slate-500 uppercase leading-none">
        CNPJ: <span className="text-slate-800 font-mono">{t.customer?.cnpj ? maskCNPJ(t.customer.cnpj) : '---'}</span>
      </p>
      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
        Localidade: <span className="text-slate-600">{t.customer?.city} - {t.customer?.state}</span>
      </p>
    </div>
  </div>
);
