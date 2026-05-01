
import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  drivers?: Driver[];
  currentPlateHorse?: string;
  currentPlateTrailer?: string;
}

const MANUAL = '__manual__';

interface PlateSearchProps {
  name: 'horse' | 'trailer';
  value: string;
  customValue: string;
  onSelect: (plate: string) => void;
  onCustomChange: (val: string) => void;
  drivers: Driver[];
  currentDriverId?: string;
}

const PlateSearch: React.FC<PlateSearchProps> = ({
  name, value, customValue, onSelect, onCustomChange, drivers, currentDriverId
}) => {
  const [query, setQuery] = useState(customValue);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(customValue);
  }, [customValue]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allPlates = useMemo(() => {
    const result: { plate: string; driverName: string; year?: string }[] = [];
    for (const d of drivers) {
      if (d.id === currentDriverId) continue;
      if (d.status === 'Inativo') continue;
      const entries = name === 'horse'
        ? (d.platesHorse && d.platesHorse.length > 0 ? d.platesHorse : d.plateHorse ? [{ id: 'x', plate: d.plateHorse, isPrimary: true }] : [])
        : (d.platesTrailer && d.platesTrailer.length > 0 ? d.platesTrailer : d.plateTrailer ? [{ id: 'x', plate: d.plateTrailer, isPrimary: true }] : []);
      for (const e of entries) {
        result.push({ plate: e.plate, driverName: d.name, year: (e as any).year });
      }
    }
    return result;
  }, [drivers, currentDriverId, name]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return allPlates.slice(0, 8);
    return allPlates.filter(p =>
      p.plate.toUpperCase().includes(q) || p.driverName.toUpperCase().includes(q)
    ).slice(0, 8);
  }, [query, allPlates]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setQuery(val);
    onCustomChange(val);
    setOpen(true);
  };

  const pick = (plate: string) => {
    setQuery(plate);
    onCustomChange(plate);
    onSelect(plate);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <input
        autoFocus={name === 'horse'}
        className="w-full px-3 py-2.5 rounded-xl border border-blue-300 bg-white font-mono font-black text-slate-800 uppercase text-sm focus:outline-none focus:border-blue-500 transition-all"
        placeholder="Digite ou busque uma placa..."
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <p className="px-3 pt-2.5 pb-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            Placas de outros motoristas
          </p>
          {filtered.map((item, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => pick(item.plate)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="font-mono font-black text-slate-800 text-sm">{item.plate}</span>
              {item.year && <span className="text-[9px] text-slate-400 font-bold">{item.year}</span>}
              <span className="flex-1 text-right text-[9px] text-slate-400 font-bold uppercase truncate">{item.driverName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DriverSwapModal: React.FC<DriverSwapModalProps> = ({
  isOpen, onClose, onConfirm, driver, drivers = [], currentPlateHorse = '', currentPlateTrailer = ''
}) => {
  const [horseValue, setHorseValue] = useState('');
  const [trailerValue, setTrailerValue] = useState('');
  const [customHorse, setCustomHorse] = useState('');
  const [customTrailer, setCustomTrailer] = useState('');

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

  const effectiveHorse = horseValue === MANUAL ? customHorse : horseValue;
  const effectiveTrailer = trailerValue === MANUAL ? customTrailer : trailerValue;

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
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

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

          {/* Info do motorista */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            {driver.photo && <img src={driver.photo} className="w-10 h-10 rounded-xl object-cover shrink-0" />}
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Motorista</p>
              <p className="font-black text-slate-800 uppercase text-sm leading-tight">{driver.name}</p>
            </div>
          </div>

          {/* Seleção de placas */}
          <div className="grid grid-cols-2 gap-5">

            {/* Cavalo */}
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
                    {(p as any).year && <span className="ml-2 text-[10px] text-slate-400 font-bold">{(p as any).year}</span>}
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
                <PlateSearch
                  name="horse"
                  value={horseValue}
                  customValue={customHorse}
                  onSelect={plate => setCustomHorse(plate)}
                  onCustomChange={val => setCustomHorse(val)}
                  drivers={drivers}
                  currentDriverId={driver.id}
                />
              )}
            </div>

            {/* Carreta */}
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
                    {(p as any).year && <span className="ml-2 text-[10px] text-slate-400 font-bold">{(p as any).year}</span>}
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
                <PlateSearch
                  name="trailer"
                  value={trailerValue}
                  customValue={customTrailer}
                  onSelect={plate => setCustomTrailer(plate)}
                  onCustomChange={val => setCustomTrailer(val)}
                  drivers={drivers}
                  currentDriverId={driver.id}
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
