import React from 'react';
import { Driver } from '../../types';
import CustomSelect from './CustomSelect';

interface DriverPlateSelectorProps {
  driver: Driver | null | undefined;
  plateHorse: string;
  plateTrailer: string;
  onChangePlateHorse: (plate: string) => void;
  onChangePlateTrailer: (plate: string) => void;
}

/**
 * Renderiza seletores de placa de cavalo e/ou carreta quando o motorista
 * possui mais de uma placa de cada tipo. Invisível quando não há escolha.
 */
const DriverPlateSelector: React.FC<DriverPlateSelectorProps> = ({
  driver, plateHorse, plateTrailer, onChangePlateHorse, onChangePlateTrailer
}) => {
  if (!driver) return null;

  const horses = driver.platesHorse || (driver.plateHorse ? [{ id: 'h0', plate: driver.plateHorse, year: driver.yearHorse, isPrimary: true }] : []);
  const trailers = driver.platesTrailer || (driver.plateTrailer ? [{ id: 't0', plate: driver.plateTrailer, year: driver.yearTrailer, isPrimary: true }] : []);

  if (horses.length <= 1 && trailers.length <= 1) return null;

  const selectCls = "w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all text-sm";

  return (
    <div className="grid grid-cols-2 gap-4 mt-3">
      {horses.length > 1 && (
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa do Cavalo</p>
          <CustomSelect
            value={plateHorse}
            onChange={v => onChangePlateHorse(v)}
            options={horses.map(h => ({
              value: h.plate,
              label: `${h.plate}${h.year ? ` (${h.year})` : ''}${h.isPrimary ? ' — Principal' : ''}`
            }))}
            inputClassName={selectCls}
          />
        </div>
      )}
      {trailers.length > 1 && (
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Placa da Carreta</p>
          <CustomSelect
            value={plateTrailer}
            onChange={v => onChangePlateTrailer(v)}
            placeholder="— Sem carreta —"
            options={trailers.map(t => ({
              value: t.plate,
              label: `${t.plate}${t.year ? ` (${t.year})` : ''}${t.isPrimary ? ' — Principal' : ''}`
            }))}
            inputClassName={selectCls}
          />
        </div>
      )}
    </div>
  );
};

/** Retorna a placa principal de cavalo do motorista */
export function primaryHorse(driver: Driver | null | undefined): string {
  if (!driver) return '';
  const list = driver.platesHorse;
  if (list && list.length > 0) return (list.find(e => e.isPrimary) || list[0]).plate;
  return driver.plateHorse || '';
}

/** Retorna a placa principal de carreta do motorista */
export function primaryTrailer(driver: Driver | null | undefined): string {
  if (!driver) return '';
  const list = driver.platesTrailer;
  if (list && list.length > 0) return (list.find(e => e.isPrimary) || list[0]).plate;
  return driver.plateTrailer || '';
}

export default DriverPlateSelector;
