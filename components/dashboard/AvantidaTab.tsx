
import React, { useState, useEffect, useMemo } from 'react';
import { AvantidaRecord } from '../../types';
import { db } from '../../utils/storage';
import * as XLSX from 'xlsx';
import AvantidaModal from './avantida/AvantidaModal';
import AvantidaFilters from './avantida/AvantidaFilters';

interface AvantidaTabProps {
  userId: string;
}

const AvantidaTab: React.FC<AvantidaTabProps> = ({ userId }) => {
  const [records, setRecords] = useState<AvantidaRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AvantidaRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Filtro
  const today = new Date().toISOString().split('T')[0];
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const loadData = async () => {
    setIsLoading(true);
    const data = await db.getAvantidaRecords();
    setRecords(data);
    setIsLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchSearch = 
        r.containerNumber?.toLowerCase().includes(search.toLowerCase()) ||
        r.customerRef?.toLowerCase().includes(search.toLowerCase()) ||
        r.exportRef?.toLowerCase().includes(search.toLowerCase());
      
      const matchDate = (!startDate || r.date >= startDate) && (!endDate || r.date <= endDate);
      
      return matchSearch && matchDate;
    });
  }, [records, search, startDate, endDate]);

  const handleExport = () => {
    const dataToExport = filteredRecords.map(r => ({
      'Data': new Date(r.date).toLocaleDateString('pt-BR'),
      'Nº Container': r.containerNumber,
      'Export Ref.': r.exportRef,
      'Preço Pedido (R$)': r.requestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
      'Ref. Cliente': r.customerRef,
      'Acerto Viagem': r.tripSettlement,
      'Conferido': r.verified ? 'SIM' : 'NÃO'
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avantida");
    XLSX.writeFile(wb, `Avantida_Filtro_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleToggleVerified = async (record: AvantidaRecord) => {
    const updated = { ...record, verified: !record.verified };
    await db.saveAvantidaRecord(updated);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remover registro Avantida?')) {
      await db.deleteAvantidaRecord(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
         <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Avantida ALS</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Reutilização de Equipamentos</p>
         </div>
         <div className="flex gap-4">
           <button 
             onClick={handleExport}
             className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
             Exportar Filtrados
           </button>
           <button 
             onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
             className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
           >
             Novo Lançamento
           </button>
         </div>
      </div>

      <AvantidaFilters 
        search={search} 
        setSearch={setSearch} 
        startDate={startDate} 
        setStartDate={setStartDate} 
        endDate={endDate} 
        setEndDate={setEndDate} 
      />

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
             <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <th className="px-6 py-5 w-16 text-center">OK</th>
                   <th className="px-6 py-5">Data</th>
                   <th className="px-6 py-5">Nº Container</th>
                   <th className="px-6 py-5">Export Ref.</th>
                   <th className="px-6 py-5">Preço Pedido</th>
                   <th className="px-6 py-5">Ref. Cliente</th>
                   <th className="px-6 py-5">Acerto Viagem</th>
                   <th className="px-6 py-5 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-center">
                       <input 
                         type="checkbox" 
                         checked={r.verified} 
                         onChange={() => handleToggleVerified(r)}
                         className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500 cursor-pointer"
                       />
                    </td>
                    <td className="px-6 py-4 font-bold text-[11px] text-slate-600">
                      {new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[12px] font-black text-blue-700 font-mono">{r.containerNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-800 uppercase">{r.exportRef}</td>
                    <td className="px-6 py-4 text-[11px] font-black text-slate-900">
                       {r.requestedPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{r.customerRef}</td>
                    <td className="px-6 py-4 text-[10px] font-black text-indigo-600 uppercase">{r.tripSettlement}</td>
                    <td className="px-6 py-4 text-right">
                       <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingRecord(r); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732" strokeWidth="3"/></svg></button>
                          <button onClick={() => handleDelete(r.id)} className="p-2 text-slate-300 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth="3"/></svg></button>
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-300 font-bold uppercase italic text-[10px]">Nenhum lançamento encontrado para os filtros atuais</td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      <AvantidaModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => { setIsModalOpen(false); loadData(); }}
        editingRecord={editingRecord}
      />
    </div>
  );
};

export default AvantidaTab;
