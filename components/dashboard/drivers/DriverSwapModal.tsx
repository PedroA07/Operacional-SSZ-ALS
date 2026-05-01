
import React, { useState, useMemo } from 'react';
import { Driver, PlateEntry } from '../../../types';
import { maskCPF, maskPhone } from '../../../utils/masks';

export interface DriverSwapResult {
  driver: Driver;
  selectedHorse: PlateEntry | null;
  selectedTrailer: PlateEntry | null;
}

interface DriverSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: DriverSwapResult) => void;
  drivers: Driver[];
  /** Motorista atualmente alocado (excluído da pesquisa) */
  currentDriverId?: string;
}

const DriverSwapModal: React.FC<DriverSwapModalProps> = ({
  isOpen, onClose, onConfirm, drivers, currentDriverId
}) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Driver | null>(null);
  const [horseId, setHorseId] = useState<string>('');
  const [trailerId, setTrailerId] = useState<string>('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return drivers.filter(d => {
      if (d.id === currentDriverId) return false;
      if (d.status === 'Inativo') return false;
      if (!q) return true;
      const plates = [
        ...(d.platesHorse || []).map(p => p.plate),
        ...(d.platesTrailer || []).map(p => p.plate),
        d.plateHorse, d.plateTrailer
      ].join(' ').toLowerCase();
      return d.name.toLowerCase().includes(q) || plates.includes(q) || d.cpf.includes(q);
    });
  }, [query, drivers, currentDriverId]);

  const selectDriver = (d: Driver) => {
    setSelected(d);
    const ph = d.platesHorse?.find(e => e.isPrimary) || d.platesHorse?.[0] || null;
    const pt = d.platesTrailer?.find(e => e.isPrimary) || d.platesTrailer?.[0] || null;
    setHorseId(ph?.id || '');
    setTrailerId(pt?.id || '');
  };

  const handleConfirm = () => {
    if (!selected) return;
    const selectedHorse = selected.platesHorse?.find(e => e.id === horseId) || null;
    const selectedTrailer = selected.platesTrailer?.find(e => e.id === trailerId) || null;
    onConfirm({ driver: selected, selectedHorse, selectedTrailer });
    handleClose();
  };

  const handleClose = () => {
    setQuery('');
    setSelected(null);
    setHorseId('');
    setTrailerId('');
    onClose();
  };

  if (!isOpen) return null;

  const inputCls = "w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold uppercase focus:border-blue-500 outline-none transition-all text-sm";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">

        {/* Header */}
        <div className="p-7 border-b bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-slate-800 text-base uppercase leading-none">Trocar Motorista</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Selecione o motorista e as placas que serão usadas</p>
          </div>
          <button onClick={handleClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="3" />
            </svg>
          </button>
        </div>

        <div className="p-7 space-y-6 overflow-y-auto custom-scrollbar flex-1">

          {!selected ? (
            <>
              {/* Busca */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1 block">Pesquisar Motorista</label>
                <input
                  autoFocus
                  className={inputCls}
                  placeholder="Nome, CPF ou placa..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>

              {/* Lista de resultados */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {filtered.length === 0 && (
                  <p className="text-center text-slate-400 text-[11px] font-bold py-8 uppercase">Nenhum motorista encontrado</p>
                )}
                {filtered.map(d => {
                  const horses = d.platesHorse || (d.plateHorse ? [{ id: 'x', plate: d.plateHorse, isPrimary: true }] : []);
                  const trailers = d.platesTrailer || (d.plateTrailer ? [{ id: 'x', plate: d.plateTrailer, isPrimary: true }] : []);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => selectDriver(d)}
                      className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 uppercase text-[13px] leading-tight">{d.name}</p>
                          <div className="flex gap-3 mt-1">
                            <span className="text-[9px] font-bold text-slate-400">CPF: {maskCPF(d.cpf)}</span>
                            <span className="text-[9px] font-bold text-slate-400">{maskPhone(d.phone)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          {horses.map(p => (
                            <span key={p.id} className="block font-mono text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg">
                              {p.plate}
                            </span>
                          ))}
                          {trailers.map(p => (
                            <span key={p.id} className="block font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">
                              {p.plate}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              {/* Motorista selecionado */}
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-3xl flex items-center gap-4">
                {selected.photo && (
                  <img src={selected.photo} className="w-14 h-14 rounded-2xl object-cover shrink-0 shadow" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5">Motorista Selecionado</p>
                  <p className="font-black text-slate-900 text-base uppercase leading-tight">{selected.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">{maskCPF(selected.cpf)} · {maskPhone(selected.phone)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 px-3 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-[9px] font-black uppercase hover:border-red-300 hover:text-red-500 transition-all"
                >
                  Trocar
                </button>
              </div>

              {/* Seleção de placas */}
              <div className="grid grid-cols-2 gap-5">
                {/* Cavalo */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Placa do Cavalo</p>
                  {(selected.platesHorse || []).length === 0 && selected.plateHorse ? (
                    <div className="p-3 bg-slate-900 text-white rounded-2xl text-center font-mono font-black text-sm">
                      {selected.plateHorse}
                    </div>
                  ) : (selected.platesHorse || []).length === 0 ? (
                    <p className="text-[11px] text-slate-300 italic">Nenhuma placa de cavalo</p>
                  ) : (
                    <div className="space-y-2">
                      <option value="">— Sem cavalo —</option>
                      {(selected.platesHorse || []).map(p => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                            horseId === p.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="horse"
                            value={p.id}
                            checked={horseId === p.id}
                            onChange={() => setHorseId(p.id)}
                            className="accent-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-mono font-black text-slate-800 text-sm">{p.plate}</span>
                            {p.year && <span className="ml-2 text-[10px] text-slate-400 font-bold">{p.year}</span>}
                          </div>
                          {p.isPrimary && (
                            <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-lg">Principal</span>
                          )}
                        </label>
                      ))}
                      <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        horseId === '' ? 'border-slate-400 bg-slate-50' : 'border-slate-100 hover:border-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="horse"
                          value=""
                          checked={horseId === ''}
                          onChange={() => setHorseId('')}
                          className="accent-slate-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Sem cavalo</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Carreta */}
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Placa da Carreta</p>
                  {(selected.platesTrailer || []).length === 0 && selected.plateTrailer ? (
                    <div className="p-3 bg-slate-100 text-slate-700 rounded-2xl text-center font-mono font-black text-sm border border-slate-200">
                      {selected.plateTrailer}
                    </div>
                  ) : (selected.platesTrailer || []).length === 0 ? (
                    <p className="text-[11px] text-slate-300 italic">Nenhuma placa de carreta</p>
                  ) : (
                    <div className="space-y-2">
                      {(selected.platesTrailer || []).map(p => (
                        <label
                          key={p.id}
                          className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                            trailerId === p.id ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="trailer"
                            value={p.id}
                            checked={trailerId === p.id}
                            onChange={() => setTrailerId(p.id)}
                            className="accent-blue-600"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-mono font-black text-slate-800 text-sm">{p.plate}</span>
                            {p.year && <span className="ml-2 text-[10px] text-slate-400 font-bold">{p.year}</span>}
                          </div>
                          {p.isPrimary && (
                            <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-100 px-2 py-0.5 rounded-lg">Principal</span>
                          )}
                        </label>
                      ))}
                      <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        trailerId === '' ? 'border-slate-400 bg-slate-50' : 'border-slate-100 hover:border-slate-300'
                      }`}>
                        <input
                          type="radio"
                          name="trailer"
                          value=""
                          checked={trailerId === ''}
                          onChange={() => setTrailerId('')}
                          className="accent-slate-500"
                        />
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Sem carreta</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div className="p-7 border-t bg-slate-50 flex gap-4 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:border-slate-300 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all"
            >
              Confirmar Troca
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverSwapModal;
