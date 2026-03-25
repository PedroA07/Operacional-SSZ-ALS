
import React from 'react';
import { Trip } from '../../../../types';

export const ShipBookingColumn = (t: Trip) => (
  <div className="flex flex-col space-y-1.5 whitespace-normal min-w-[160px]">
     <div className="flex flex-col">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Navio:</span>
        <p className="text-[11px] font-black text-slate-700 uppercase leading-tight">
          {t.ship || 'A DEFINIR'}
        </p>
     </div>
     <div className="flex flex-col">
        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Booking:</span>
        <p className="text-[11px] font-black text-blue-600 leading-tight">
          {t.booking || '---'}
        </p>
     </div>
     <div className="flex flex-col">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Armador:</span>
        <p className="text-[11px] font-black text-slate-600 leading-tight">
          {t.agencia || '---'}
        </p>
     </div>
  </div>
);
