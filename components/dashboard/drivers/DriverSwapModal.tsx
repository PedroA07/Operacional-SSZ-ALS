
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Driver, PlateEntry } from '../../../types';
import { maskCPF } from '../../../utils/masks';

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

interface PlatePickerProps {
  side: 'horse' | 'trailer';
  ownPlates: PlateEntry[];
  value: string;
  customValue: string;
  onChange: (v: string) => void;
  onCustomChange: (v: string) => void;
  drivers: Driver[];
  currentDriverId?: string;
}

const PlatePicker: React.FC<PlatePickerProps> = ({
  side, ownPlates, value, customValue, onChange, onCustomChange, drivers, currentDriverId
}) => {
  const [driverQuery, setDriverQuery] = useState('');
  const [pickedDriver, setPickedDriver] = useState<Driver | null>(null);
  const [showDriverList, setShowDriverList] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDriverList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    return drivers
      .filter(d => d.id !== currentDriverId && d.status !== 'Inativo')
      .filter(d => {
        if (!q) return true;
        const plates = [
          ...(d.platesHorse || []).map(p => p.plate),
          ...(d.platesTrailer || []).map(p => p.plate),
          d.plateHorse, d.plateTrailer,
        ].join(' ').toLowerCase();
        return d.name.toLowerCase().includes(q) || plates.includes(q);
      })
      .slice(0, 7);
  }, [driverQuery, drivers, currentDriverId]);

  const externalPlates: PlateEntry[] = pickedDriver
    ? (side === 'horse'
        ? (pickedDriver.platesHorse && pickedDriver.platesHorse.length > 0
            ? pickedDriver.platesHorse
            : pickedDriver.plateHorse ? [{ id: 'x', plate: pickedDriver.plateHorse, isPrimary: true }] : [])
        : (pickedDriver.platesTrailer && pickedDriver.platesTrailer.length > 0
            ? pickedDriver.platesTrailer
            : pickedDriver.plateTrailer ? [{ id: 'x', plate: pickedDriver.plateTrailer, isPrimary: true }] : []))
    : [];

  const radioClass = (active: boolean) =>
    `flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
      active ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
    }`;

  const label = side === 'horse' ? 'Placa do Cavalo' : 'Placa da Carreta';

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</p>

      {/* Placas próprias do motorista */}
      {ownPlates.map(p => (
        <label key={p.id} className={radioClass(value === p.plate)}>
          <input
            type="radio"
            name={side}
            value={p.plate}
            checked={value === p.plate}
            onChange={() => { onChange(p.plate); setPickedDriver(null); }}
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

      {/* Sem cavalo/carreta */}
      <label className={radioClass(value === '')}>
        <input type="radio" name={side} value="" checked={value === ''} onChange={() => { onChange(''); setPickedDriver(null); }} className="accent-slate-400" />
        <span className="text-[11px] font-bold text-slate-400 uppercase">
          {side === 'horse' ? 'Sem cavalo' : 'Sem carreta'}
        </span>
      </label>

      {/* Outra placa */}
      <label className={radioClass(value === MANUAL)}>
        <input type="radio" name={side} value={MANUAL} checked={value === MANUAL} onChange={() => onChange(MANUAL)} className="accent-slate-600" />
        <span className="text-[11px] font-bold text-slate-600 uppercase">Outra placa</span>
      </label>

      {value === MANUAL && (
        <div ref={ref} className="space-y-2 pl-1">
          {/* Busca de motorista */}
          <div className="relative">
            <input
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-blue-300 bg-white text-slate-700 font-bold text-xs focus:outline-none focus:border-blue-500 transition-all"
              placeholder="Buscar motorista por nome ou placa..."
              value={driverQuery}
              onChange={e => { setDriverQuery(e.target.value); setShowDriverList(true); setPickedDriver(null); }}
              onFocus={() => setShowDriverList(true)}
            />
            {showDriverList && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden max-h-44 overflow-y-auto">
                {filteredDrivers.length === 0 ? (
                  <p className="text-center text-[10px] text-slate-400 font-bold py-4 uppercase">Nenhum motorista encontrado</p>
                ) : filteredDrivers.map(d => (
                  <button
                    key={d.id}
                    type="button"
                    onMouseDown={() => {
                      setPickedDriver(d);
                      setDriverQuery(d.name);
                      setShowDriverList(false);
                      // auto-seleciona a principal se tiver só uma
                      const plates = side === 'horse'
                        ? (d.platesHorse && d.platesHorse.length > 0 ? d.platesHorse : d.plateHorse ? [{ id: 'x', plate: d.plateHorse, isPrimary: true }] : [])
                        : (d.platesTrailer && d.platesTrailer.length > 0 ? d.platesTrailer : d.plateTrailer ? [{ id: 'x', plate: d.plateTrailer, isPrimary: true }] : []);
                      if (plates.length === 1) {
                        onCustomChange(plates[0].plate);
                      }
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors text-left"
                  >
                    <span className="font-bold text-slate-800 text-xs uppercase">{d.name}</span>
                    <span className="text-[9px] text-slate-400 font-bold">{maskCPF(d.cpf)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Placas do motorista selecionado */}
          {pickedDriver && externalPlates.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest px-1">
                Placas de {pickedDriver.name.split(' ')[0]}
              </p>
              {externalPlates.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onCustomChange(p.plate)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    customValue === p.plate
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-100 hover:border-blue-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-mono font-black text-slate-800 text-sm">{p.plate}</span>
                  {(p as any).year && <span className="text-[10px] text-slate-400 font-bold">{(p as any).year}</span>}
                  {p.isPrimary && (
                    <span className="ml-auto text-[8px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-lg">Principal</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {pickedDriver && externalPlates.length === 0 && (
            <p className="text-[10px] text-slate-400 italic px-1">Este motorista não tem placas cadastradas para este lado.</p>
          )}

          {/* Campo manual se não escolheu motorista */}
          {!pickedDriver && (
            <input
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-mono font-black text-slate-800 uppercase text-sm focus:outline-none focus:border-blue-400 transition-all"
              placeholder="Ou digite manualmente: ABC-1234"
              value={customValue}
              onChange={e => onCustomChange(e.target.value.toUpperCase())}
            />
          )}
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

  // Travar scroll do dashboard quando o modal abre
  useEffect(() => {
    const el = document.getElementById('dashboard-scroll');
    if (!el) return;
    el.style.overflowY = isOpen ? 'hidden' : '';
    return () => { el.style.overflowY = ''; };
  }, [isOpen]);

  if (!isOpen || !driver) return null;

  const ownHorses: PlateEntry[] = driver.platesHorse && driver.platesHorse.length > 0
    ? driver.platesHorse
    : driver.plateHorse ? [{ id: 'legacy', plate: driver.plateHorse, isPrimary: true }] : [];

  const ownTrailers: PlateEntry[] = driver.platesTrailer && driver.platesTrailer.length > 0
    ? driver.platesTrailer
    : driver.plateTrailer ? [{ id: 'legacy', plate: driver.plateTrailer, isPrimary: true }] : [];

  const effectiveHorse = horseValue === MANUAL ? customHorse : horseValue;
  const effectiveTrailer = trailerValue === MANUAL ? customTrailer : trailerValue;

  const handleConfirm = () => {
    onConfirm({ plateHorse: effectiveHorse, plateTrailer: effectiveTrailer });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest leading-none">Trocar Equipamento</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Selecione as placas que serão usadas</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 rounded-full transition-all shadow-sm active:scale-90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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
            <PlatePicker
              side="horse"
              ownPlates={ownHorses}
              value={horseValue}
              customValue={customHorse}
              onChange={setHorseValue}
              onCustomChange={setCustomHorse}
              drivers={drivers}
              currentDriverId={driver.id}
            />
            <PlatePicker
              side="trailer"
              ownPlates={ownTrailers}
              value={trailerValue}
              customValue={customTrailer}
              onChange={setTrailerValue}
              onCustomChange={setCustomTrailer}
              drivers={drivers}
              currentDriverId={driver.id}
            />
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
