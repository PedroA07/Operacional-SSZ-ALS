import React, { useState, useEffect, useMemo } from 'react';
import { AvantidaRecord, Driver } from '../../types';
import { db } from '../../utils/storage';
import AvantidaModal from './avantida/AvantidaModal';
import AvantidaFilters from './avantida/AvantidaFilters';
import { excelAvantidaService } from '../../utils/excelAvantidaService';

interface AvantidaTabProps {
  userId: string;
}

const AvantidaTab: React.FC<AvantidaTabProps> = ({ userId }) => {
  const [records, setRecords] = useState<AvantidaRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [showOnlyPending, setShowOnlyPending] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [avantidaData, driversData] = await Promise.all([
        db.getAvantidaRecords(),
        db.getDrivers()
      ]);
      setRecords(avantidaData);
      setDrivers(driversData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdateField = async (record: AvantidaRecord, field: keyof AvantidaRecord, value: any) => {
    let updated = { ...record, [field]: value };
    
    // REGRA: Se preencher Acerto de Viagem, marca como Conferido automaticamente
    if (field === 'tripSettlement' && value && value.trim() !== '') {
      updated.verified = true;
    }

    setRecords(prev => prev.map(r => r.id === record.id ? updated : r));
    
    setSavingId(record.id);
    try {
      await db.saveAvantidaRecord(updated);
    } finally {
      setTimeout(() => setSavingId(null), 600);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const drv = drivers.find(d => d.id === r.driverId);
      const matchSearch = 
        r.containerNumber?.toLowerCase().includes(search.toLowerCase()) ||
        r.customerRef?.toLowerCase().includes(search.toLowerCase()) ||
        r.exportRef?.toLowerCase().includes(search.toLowerCase()) ||
        r.shippingLine?.toLowerCase().includes(search.toLowerCase()) ||
        drv?.name.toLowerCase().includes(search.toLowerCase()) ||
        drv?.plateHorse.toLowerCase().includes(search.toLowerCase());
      
      const matchDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
      const matchPending = showOnlyPending ? !r.verified : true;
      
      return matchSearch && matchDate && matchPending;
    });
  }, [records, drivers, search, startDate, endDate, showOnlyPending]);

  const handleDelete = async (id: string) => {
    if (confirm('Deseja excluir este registro permanentemente?')) {
      await db.deleteAvantidaRecord(id);
      loadData();
    }
  };

  const inputClass = "w-full bg-transparent border-none text-[11px] font-bold text-slate-700 uppercase focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 outline-none transition-all placeholder:text-slate-200";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-900 rounded-3xl flex items-center justify-center text-white shadow-2xl shrink-0">
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Avantida ALS</h2>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Reuso de Containers</p>
            </div>
         </div>
         <div className="flex gap-4">
           <button 
             onClick={() => excelAvantidaService.exportToStyledExcel(filteredRecords, drivers)}
             className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
             Exportar Excel
           </button>
           <button 
             onClick={() => { setIsModalOpen(true); }}
             className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95"
           >
             Novo Lançamento
           </button>
         </div>
      </div>

      <AvantidaFilters 
        search={search} setSearch={setSearch} 
        startDate={startDate} setStartDate={setStartDate} 
        endDate={endDate} setEndDate={setEndDate} 
        showOnlyPending={showOnlyPending}
        setShowOnlyPending={setShowOnlyPending}
      />

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1700px]">
             <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <th className="px-6 py-5 w-40">Linha expedição</th>
                   <th className="px-6 py-5 w-48">Localização importação</th>
                   <th className="px-6 py-5 w-32">Data do pedido</th>
                   <th className="px-6 py-5 w-16 text-center">Estado</th>
                   <th className="px-6 py-5 w-40">Número do container</th>
                   <th className="px-6 py-5 w-40">Exportar ref.</th>
                   <th className="px-6 py-5 w-32">Data de reutilização</th>
                   <th className="px-6 py-5 w-32">Preço pedido (R$)</th>
                   <th className="px-6 py-5">Ref. do cliente</th>
                   <th className="px-6 py-5 text-blue-600 bg-blue-50/20">Acerto de viagem</th>
                   <th className="px-6 py-5 text-right w-16"></th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/10 transition-colors group">
                    <td className="px-6 py-4">
                      <input className={`${inputClass} text-indigo-600`} value={r.shippingLine} onChange={e => handleUpdateField(r, 'shippingLine', e.target.value.toUpperCase())} placeholder="ARMADOR" />
                    </td>
                    <td className="px-6 py-4">
                      <input className={inputClass} value={r.importLocation} onChange={e => handleUpdateField(r, 'importLocation', e.target.value.toUpperCase())} placeholder="DEPOT" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="date" className={inputClass} value={r.date} onChange={e => handleUpdateField(r, 'date', e.target.value)} />
                    </td>
                    <td className="px-6 py-4 text-center">
                       {savingId === r.id ? (
                         <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                       ) : (
                         <div className="flex flex-col items-center">
                           <input 
                             type="checkbox" 
                             checked={r.verified} 
                             onChange={e => handleUpdateField(r, 'verified', e.target.checked)}
                             className="w-4 h-4 rounded-lg border-2 border-slate-200 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                           />
                           <span className={`text-[7px] font-black uppercase mt-1 ${r.verified ? 'text-emerald-600' : 'text-amber-500'}`}>
                             {r.verified ? 'CONF.' : 'PEND.'}
                           </span>
                         </div>
                       )}
                    </td>
                    <td className="px-6 py-4">
                      <input className={`${inputClass} font-mono text-blue-700 text-[12px] font-black`} value={r.containerNumber} onChange={e => handleUpdateField(r, 'containerNumber', e.target.value.toUpperCase())} />
                    </td>
                    <td className="px-6 py-4">
                      <input className={inputClass} value={r.exportRef} onChange={e => handleUpdateField(r, 'exportRef', e.target.value.toUpperCase())} placeholder="EXPORT REF" />
                    </td>
                    <td className="px-6 py-4">
                      <input type="date" className={inputClass} value={r.reuseDate} onChange={e => handleUpdateField(r, 'reuseDate', e.target.value)} />
                    </td>
                    <td className="px-6 py-4">
                      <input type="number" step="0.01" className={`${inputClass} text-emerald-600`} value={r.requestedPrice} onChange={e => handleUpdateField(r, 'requestedPrice', Number(e.target.value))} />
                    </td>
                    <td className="px-6 py-4">
                      <input className={inputClass} value={r.customerRef} onChange={e => handleUpdateField(r, 'customerRef', e.target.value.toUpperCase())} placeholder="CLIENTE" />
                    </td>
                    <td className="px-6 py-4 bg-blue-50/10">
                      <input className={`${inputClass} font-black text-blue-800`} value={r.tripSettlement} onChange={e => handleUpdateField(r, 'tripSettlement', e.target.value.toUpperCase())} placeholder="---" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="2.5"/></svg></button>
                    </td>
                  </tr>
                ))}
             </tbody>
          </table>
          {filteredRecords.length === 0 && !isLoading && (
            <div className="py-24 text-center border-t border-slate-50 bg-white">
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Nenhum registro localizado</p>
            </div>
          )}
        </div>
      </div>

      <AvantidaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); loadData(); }} />
    </div>
  );
};

export default AvantidaTab;