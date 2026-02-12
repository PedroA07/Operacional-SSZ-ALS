import React, { useState, useEffect, useMemo } from 'react';
import { SealBatch, SealRecord, Driver } from '../../../types';
import { db } from '../../../utils/storage';
import ExcelJS from 'exceljs';
import { excelSealStyles } from '../../../utils/excelSealStyles';

interface SealDetailsViewProps {
  batch: SealBatch;
  onBack: () => void;
}

const SealDetailsView: React.FC<SealDetailsViewProps> = ({ batch, onBack }) => {
  const [records, setRecords] = useState<SealRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r => 
      r.sealNumber.toLowerCase().includes(q) ||
      (r.containerNumber && r.containerNumber.toLowerCase().includes(q)) ||
      (r.booking && r.booking.toLowerCase().includes(q)) ||
      (r.driverName && r.driverName.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  const stats = useMemo(() => {
    const used = records.filter(r => r.containerNumber && r.containerNumber.trim() !== '').length;
    const available = records.length - used;
    return { used, available };
  }, [records]);

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CONTROLE DE LACRES');

    // 1. Configuração de Colunas
    worksheet.columns = [
      { header: 'STATUS', key: 'status', width: 15 },
      { header: 'Nº LACRE', key: 'sealNumber', width: 15 },
      { header: 'Nº CONTAINER', key: 'container', width: 20 },
      { header: 'BOOKING', key: 'booking', width: 20 },
      { header: 'DATA REUSO', key: 'date', width: 15 },
      { header: 'MOTORISTA ALOCADO', key: 'driver', width: 35 }
    ];

    // 2. Estilo do Cabeçalho
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      Object.assign(cell, excelSealStyles.HEADER);
    });

    // 3. Adição de Dados com Estilo de Linha Alternada (Zebra)
    records.forEach((r, index) => {
      const rowData = {
        status: r.containerNumber ? 'UTILIZADO' : 'DISPONÍVEL',
        sealNumber: r.sealNumber,
        container: r.containerNumber?.toUpperCase() || '',
        booking: r.booking?.toUpperCase() || '',
        date: r.reuseDate ? new Date(r.reuseDate + 'T12:00:00').toLocaleDateString('pt-BR') : '',
        driver: r.driverName?.toUpperCase() || ''
      };

      const row = worksheet.addRow(rowData);
      const isEven = (index + 2) % 2 === 0;

      row.eachCell((cell) => {
        cell.border = excelSealStyles.BORDER;
        cell.alignment = excelSealStyles.TEXT_CENTER;
        if (isEven) {
          cell.fill = excelSealStyles.ROW_EVEN.fill;
        }
        
        // Destaque para o número do lacre
        if (cell.address.includes('B')) {
          cell.font = { ...cell.font, bold: true, color: { argb: 'FF1E40AF' } };
        }

        // Cor de status
        if (cell.address.includes('A')) {
          const isUsed = cell.value === 'UTILIZADO';
          cell.font = { ...cell.font, bold: true, color: { argb: isUsed ? 'FF059669' : 'FF64748B' } };
        }
      });
    });

    // 4. Ativar Filtro
    worksheet.autoFilter = { from: 'A1', to: 'F1' };

    // 5. Nome do Arquivo Conforme Solicitado
    const fileName = `CONTROLE DE LACRES ${batch.carrier} ${batch.startNumber} A ${batch.endNumber}.xlsx`;

    // 6. Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) return (
    <div className="py-20 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase mt-4 tracking-[0.3em]">Sincronizando Lote...</p>
    </div>
  );

  const inputClass = "w-full bg-transparent border-none text-[10px] font-bold text-slate-700 uppercase focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 outline-none transition-all placeholder:text-slate-200";

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
           <button onClick={onBack} className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all shadow-sm active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeWidth="3"/></svg></button>
           <div>
              <h3 className="text-sm font-black uppercase text-slate-800 leading-none">{batch.carrier}</h3>
              <p className="text-[9px] font-bold text-blue-500 uppercase mt-1 tracking-tighter">{batch.startNumber} - {batch.endNumber}</p>
           </div>
        </div>

        {/* CAMPO DE BUSCA DE LACRES */}
        <div className="flex-1 w-full max-w-md relative group">
           <input 
             type="text" 
             placeholder="BUSCAR LACRE, CONTAINER OU MOTORISTA..."
             className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-blue-500 transition-all shadow-inner"
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
           />
           <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
        </div>

        <div className="flex items-center gap-4">
           {/* CONTADORES */}
           <div className="px-5 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-inner">
              <div className="text-center">
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Utilizados</p>
                 <p className="text-lg font-black text-slate-800 leading-none">{stats.used}</p>
              </div>
              <div className="w-[1px] h-8 bg-slate-200"></div>
              <div className="text-center">
                 <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Disponíveis</p>
                 <p className="text-lg font-black text-blue-600 leading-none">{stats.available}</p>
              </div>
           </div>

           <button 
             onClick={exportToExcel}
             className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
             Planilha Estilizada
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                 <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-6 w-24 text-center">Audit</th>
                    <th className="px-8 py-6 bg-blue-50/20 text-blue-600 w-40">Identificação Lacre</th>
                    <th className="px-8 py-6">Equipamento (Container)</th>
                    <th className="px-8 py-6">Referência (Booking)</th>
                    <th className="px-8 py-6">Data Uso</th>
                    <th className="px-8 py-6">Recurso (Motorista)</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                 {filteredRecords.map((r, idx) => (
                   <tr key={r.id} className={`hover:bg-blue-50/10 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/5'}`}>
                      <td className="px-8 py-4 text-center">
                         {savingId === r.id ? (
                           <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                         ) : r.containerNumber ? (
                           <div className="w-3 h-3 rounded-full bg-emerald-500 mx-auto shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                         ) : (
                           <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mx-auto"></div>
                         )}
                      </td>
                      <td className="px-8 py-4">
                        <span className="text-[12px] font-black text-slate-800 font-mono tracking-tighter">{r.sealNumber}</span>
                      </td>
                      <td className="px-8 py-4">
                        <input className={`${inputClass} !bg-slate-50/40 text-[11px] font-black text-blue-700`} value={r.containerNumber || ''} onChange={e => handleUpdate(r.id, 'containerNumber', e.target.value.toUpperCase())} placeholder="----" />
                      </td>
                      <td className="px-8 py-4">
                        <input className={inputClass} value={r.booking || ''} onChange={e => handleUpdate(r.id, 'booking', e.target.value.toUpperCase())} placeholder="----" />
                      </td>
                      <td className="px-8 py-4">
                        <input type="date" className={inputClass} value={r.reuseDate || ''} onChange={e => handleUpdate(r.id, 'reuseDate', e.target.value)} />
                      </td>
                      <td className="px-8 py-4">
                        <input 
                          list={`drv-list-${batch.id}`}
                          className={inputClass}
                          value={r.driverName || ''}
                          onChange={e => handleUpdate(r.id, 'driverName', e.target.value.toUpperCase())}
                          placeholder="DIGITE NOME..."
                        />
                        <datalist id={`drv-list-${batch.id}`}>
                           {drivers.map(d => <option key={d.id} value={d.name}>{d.plateHorse}</option>)}
                        </datalist>
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
        {filteredRecords.length === 0 && (
          <div className="py-24 text-center bg-white border-t border-slate-50">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
             </div>
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Nenhum registro encontrado para "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SealDetailsView;
