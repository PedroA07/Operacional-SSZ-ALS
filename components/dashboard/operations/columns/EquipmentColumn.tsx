
import React from 'react';
import { Trip } from '../../../../types';
import { ReuseMatch } from '../../../../utils/containerReuseService';

export const makeEquipmentColumn =
  (reuseMap: Map<string, ReuseMatch>, onMarkReuse: (trip: Trip) => void) =>
  (t: Trip) => {
    const reuse = reuseMap.get(t.id);
    const alreadyMarked =
      t.status === 'Reutilização' ||
      (t.statusHistory || []).some(s => s.status === 'Reutilização');

    return (
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

        {reuse && (
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg w-fit">
              <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-emerald-700 uppercase leading-none">
                  Reutilização detectada
                </span>
                {reuse.source === 'trip' ? (
                  <span className="text-[8px] text-emerald-600 leading-none mt-0.5">
                    OS {reuse.os} · {reuse.type}
                  </span>
                ) : (
                  <span className="text-[8px] text-emerald-600 leading-none mt-0.5">
                    Minuta devolução · OS {reuse.os}
                  </span>
                )}
              </div>
            </div>

            {!alreadyMarked && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkReuse(t); }}
                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-black uppercase tracking-wide transition-colors w-fit active:scale-95"
              >
                ♻ Marcar Reutilização
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

export const EquipmentColumn = makeEquipmentColumn(new Map(), () => {});
