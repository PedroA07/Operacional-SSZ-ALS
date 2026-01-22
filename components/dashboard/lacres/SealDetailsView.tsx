
import React, { useState, useEffect } from 'react';
import { SealBatch, SealRecord, Driver } from '../../../types';
import { db } from '../../../utils/storage';
import * as XLSX from 'xlsx';

interface SealDetailsViewProps {
  batch: SealBatch;
  onBack: () => void;
}

const SealDetailsView: React.FC<SealDetailsViewProps> = ({ batch, onBack }) => {
  const [records, setRecords] = useState<SealRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [recordsData, driversData] = await Promise.all([
        db.getSealRecords(batch.id),
        db.getDrivers()
      ]);
      setRecords(recordsData);
      setDrivers(driversData);
    } catch (e) {
      console.error("Erro ao carregar detalhes do lote:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [batch.id]);

  const handleUpdate = async (id: string, field: keyof SealRecord, value: string) => {
    const updated = records.map(r => r.id === id ? { ...r, [field]: value } : r);
    setRecords(updated);
    
    setSavingId(id);
    const target = updated.find(r => r.id === id);
    if (target) {
      try {
        await db.updateSealRecord(target);
      } catch (e) {
        console.error("Erro ao salvar registro de lacre:", e);
      }
    }
    setTimeout(() => setSavingId(null), 500);
  };

  const exportToExcel = () => {
    const dataToExport = records.map(r => ({
      'STATUS': r.containerNumber ? 'UTILIZADO' : 'DISPONÍVEL',
      'Nº LACRE': r.sealNumber,
      'Nº CONTAINER': r.containerNumber?.toUpperCase() || '',
      'BOOKING': r.booking?.toUpperCase() || '',
      'DATA USO': r.reuseDate ? new Date(r.reuseDate + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      'MOTORISTA': r.driverName?.toUpperCase() || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wscols = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 35 }
    ];
    ws['!cols'] = wscols;

    if (dataToExport.length > 0) {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Controle de Lacres");
    XLSX.writeFile(wb, `CONTROLE_LACRES_${batch.carrier}_${Date.now()}.xlsx`);
  };

  if (isLoading) return <div className="py-20 text-center text-[10px] font-black text-slate-400 uppercase animate-pulse tracking-widest">Carregando Sequência...</div>;

  const inputClass = "w-full bg-transparent border-none text-[10px] font-bold text-slate-700 uppercase focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 outline-none transition-all placeholder:text-slate-200";
  const selectClass = "w-full bg-transparent border-none text-[10px] font-bold text-slate-700 uppercase focus:ring-2 focus:ring-blue-500 rounded px-1 py-1 outline-none transition-all appearance-none cursor-pointer";

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <button onClick={onBack} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg></button>
           <div>
              <h3 className="text-sm font-black uppercase text-slate-800 leading-none">Armador: {batch.carrier}</h3>
              <p className="text-[9px] font-bold text-blue-500 uppercase mt-1 tracking-tighter">{batch.startNumber} - {batch.endNumber}</p>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="flex flex-col items-end">
                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Utilizados</span>
                 <span className="text-[11px] font-black text-slate-800 leading-none">{records.filter(r => r.containerNumber).length}</span>
              </div>
              <div className="w-[1px] h-6 bg-slate-200"></div>
              <div className="flex flex-col items-start">
                 <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Restantes</span>
                 <span className="text-[11px] font-black text-blue-600 leading-none">{records.filter(r => !r.containerNumber).length}</span>
              </div>
           </div>
           <button 
             onClick={exportToExcel}
             className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
             Exportar Excel
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-5 w-20 text-center">Status</th>
                    <th className="px-6 py-5 bg-blue-50/30 text-blue-600">Nº Lacre</th>
                    <th className="px-6 py-5">Número do Container</th>
                    <th className="px-6 py-5">Booking</th>
                    <th className="px-6 py-5">Data Reutilização</th>
                    <th className="px-6 py-5">Motorista</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {records.map((r, idx) => (
                   <tr key={r.id} className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                      <td className="px-6 py-4 text-center">
                         {savingId === r.id ? (
                           <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                         ) : r.containerNumber ? (
                           <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                         ) : (
                           <div className="w-2 h-2 rounded-full bg-slate-200 mx-auto"></div>
                         )}
                      </td>
                      <td className="px-6 py-4 bg-blue-50/10">
                        <span className="text-[11px] font-black text-blue-700 font-mono">{r.sealNumber}</span>
                      </td>
                      <td className="px-6 py-4">
                        <input className={inputClass} value={r.containerNumber} onChange={e => handleUpdate(r.id, 'containerNumber', e.target.value.toUpperCase())} placeholder="CONTAINER" />
                      </td>
                      <td className="px-6 py-4">
                        <input className={inputClass} value={r.booking} onChange={e => handleUpdate(r.id, 'booking', e.target.value.toUpperCase())} placeholder="BOOKING" />
                      </td>
                      <td className="px-6 py-4">
                        <input type="date" className={inputClass} value={r.reuseDate} onChange={e => handleUpdate(r.id, 'reuseDate', e.target.value)} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative group/sel">
                          <select 
                            className={selectClass} 
                            value={r.driverName} 
                            onChange={e => handleUpdate(r.id, 'driverName', e.target.value)}
                          >
                            <option value="">NÃO INFORMADO</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.name}>{d.name} [{d.plateHorse}]</option>
                            ))}
                          </select>
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover/sel:text-blue-500 transition-colors">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="4"/></svg>
                          </div>
                        </div>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

export default SealDetailsView;
