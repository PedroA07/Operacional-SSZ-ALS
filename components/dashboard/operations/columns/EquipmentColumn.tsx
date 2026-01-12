
import React from 'react';
import { Trip } from '../../../../types';

export const EquipmentColumn = (t: Trip) => (
  <div className="flex flex-col space-y-1 whitespace-normal min-w-[180px]">
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black text-slate-400 uppercase">Container:</span>
      <span className="font-black text-slate-800 text-[11px] font-mono">{t.container || 'A DEFINIR'}</span>
    </div>
    
    <div className="grid grid-cols-1 gap-0.5">
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black text-slate-400 uppercase">Tipo:</span>
        <span className="px-1.5 bg-blue-50 text-blue-600 rounded text-[9px] font-black border border-blue-100">
          {t.containerType || '40HC'}
        </span>
      </div>
      
      {t.cva && (
        <div className="flex items-center gap-2 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 w-fit">
          <span className="text-[8px] font-black text-amber-500 uppercase">CVA:</span>
          <span className="text-[9px] font-black text-amber-700">{t.cva}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black text-slate-400 uppercase">Armador:</span>
        <span className="text-[10px] font-black text-blue-700 uppercase">
          {t.ocFormData?.agencia || 'A DEFINIR'}
        </span>
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-black text-slate-300 uppercase">Tara:</span>
          <span className="text-[9px] font-bold text-slate-600">{t.tara || '---'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-black text-slate-300 uppercase">Lacre:</span>
          <span className="text-[9px] font-bold text-slate-600">{t.seal || '---'}</span>
        </div>
      </div>
    </div>
  </div>
);
