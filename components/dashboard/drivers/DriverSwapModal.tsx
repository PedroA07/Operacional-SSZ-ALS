
import React, { useState, useEffect } from 'react';
import { Driver } from '../../../types';

export interface DriverSwapResult {
  plateHorse: string;
  plateTrailer: string;
}

interface DriverSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: DriverSwapResult) => void;
  driver: Driver | null;
  currentPlateHorse?: string;
  currentPlateTrailer?: string;
}

const DriverSwapModal: React.FC<DriverSwapModalProps> = ({
  isOpen, onClose, onConfirm, driver, currentPlateHorse = '', currentPlateTrailer = ''
}) => {
  const [horseValue, setHorseValue] = useState('');
  const [trailerValue, setTrailerValue] = useState('');
  const [customHorse, setCustomHorse] = useState('');
  const [customTrailer, setCustomTrailer] = useState('');

  const MANUAL = '__manual__';

  useEffect(() => {
    if (isOpen) {
      setHorseValue(currentPlateHorse || '');
      setTrailerValue(currentPlateTrailer || '');
      setCustomHorse('');
      setCustomTrailer('');
    }
  }, [isOpen, currentPlateHorse, currentPlateTrailer]);

  if (!isOpen || !driver) return null;

  const horses = driver.platesHorse && driver.platesHorse.length > 0
    ? driver.platesHorse
    : driver.plateHorse ? [{ id: 'legacy', plate: driver.plateHorse, isPrimary: true }] : [];

  const trailers = driver.platesTrailer && driver.platesTrailer.length > 0
    ? driver.platesTrailer
    : driver.plateTrailer ? [{ id: 'legacy', plate: driver.plateTrailer, isPrimary: true }] : [];

  const effectiveHorse = horseValue === MANUAL ? customHorse.toUpperCase() : horseValue;
  const effectiveTrailer = trailerValue === MANUAL ? customTrailer.toUpperCase() : trailerValue;

  const handleConfirm = () => {
    onConfirm({ plateHorse: effectiveHorse, plateTrailer: effectiveTrailer });
    onClose();
  };

  const radioClass = (active: boolean) =>
    `flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
      active ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
    }`;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-7 border-b bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-base uppercase leading-none">Trocar Equipamento</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Selecione as placas que serão usadas</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="3" />
            </svg>
          </button>
        </div>

        <div className="p-7 space-y-6 overflow-y-auto custom-scrollbar flex-1">

          {/* Driver info */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {driver.photo && <img src={driver.photo} className="w-10 h-10 rounded-xl object-cover shrink-0" />}
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Motorista</p>
              <p className="font-black text-slate-800 uppercase text-sm leading-tight">{driver.name}</p>
            </div>
          </div>

          {/* Plates grid */}
          <div className="grid grid-cols-2 gap-5">

            {/* Horse */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Placa do Cavalo</p>

              {horses.map(p => (
                <label key={p.id} className={radioClass(horseValue === p.plate)}>
                  <input
                    type="radio"
                    name="horse"
                    value={p.plate}
                    checked={horseValue === p.plate}
                    onChange={() => setHorseValue(p.plate)}
                    className="accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-black text-slate-800 text-sm">{p.plate}</span>
                    {p.year && <span className="ml-2 text-[10px] text-slate-400 font-bold">{p.year}</span>}
                  </div>
                  {p.isPrimary && (
                    <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-lg shrink-0">Principal</span>
                  )}
                </label>
              ))}

              <label className={radioClass(horseValue === '')}>
                <input type="radio" name="horse" value="" checked={horseValue === ''} onChange={() => setHorseValue('')} className="accent-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase">Sem cavalo</span>
              </label>

              <label className={radioClass(horseValue === MANUAL)}>
                <input type="radio" name="horse" value={MANUAL} checked={horseValue === MANUAL} onChange={() => setHorseValue(MANUAL)} className="accent-slate-600" />
                <span className="text-[11px] font-bold text-slate-600 uppercase">Outra placa</span>
              </label>
              {horseValue === MANUAL && (
                <input
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-blue-300 bg-white font-mono font-black text-slate-800 uppercase text-sm focus:outline-none focus:border-blue-500"
                  placeholder="ABC-1234"
                  value={customHorse}
                  onChange={e => setCustomHorse(e.target.value.toUpperCase())}
                />
              )}
            </div>

            {/* Trailer */}
            <div className="space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Placa da Carreta</p>

              {trailers.map(p => (
                <label key={p.id} className={radioClass(trailerValue === p.plate)}>
                  <input
                    type="radio"
                    name="trailer"
                    value={p.plate}
                    checked={trailerValue === p.plate}
                    onChange={() => setTrailerValue(p.plate)}
                    className="accent-blue-600"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono font-black text-slate-800 text-sm">{p.plate}</span>
                    {p.year && <span className="ml-2 text-[10px] text-slate-400 font-bold">{p.year}</span>}
                  </div>
                  {p.isPrimary && (
                    <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-lg shrink-0">Principal</span>
                  )}
                </label>
              ))}

              <label className={radioClass(trailerValue === '')}>
                <input type="radio" name="trailer" value="" checked={trailerValue === ''} onChange={() => setTrailerValue('')} className="accent-slate-400" />
                <span className="text-[11px] font-bold text-slate-400 uppercase">Sem carreta</span>
              </label>

              <label className={radioClass(trailerValue === MANUAL)}>
                <input type="radio" name="trailer" value={MANUAL} checked={trailerValue === MANUAL} onChange={() => setTrailerValue(MANUAL)} className="accent-slate-600" />
                <span className="text-[11px] font-bold text-slate-600 uppercase">Outra placa</span>
              </label>
              {trailerValue === MANUAL && (
                <input
                  className="w-full px-3 py-2.5 rounded-xl border border-blue-300 bg-white font-mono font-black text-slate-800 uppercase text-sm focus:outline-none focus:border-blue-500"
                  placeholder="ABC-1234"
                  value={customTrailer}
                  onChange={e => setCustomTrailer(e.target.value.toUpperCase())}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-7 border-t bg-slate-50 flex gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:border-slate-300 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all"
          >
            Confirmar Equipamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverSwapModal;
