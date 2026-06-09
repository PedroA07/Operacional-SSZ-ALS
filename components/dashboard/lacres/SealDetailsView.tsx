import React, { useState, useEffect, useMemo } from 'react';
import { SealBatch, SealRecord, Driver, Trip } from '../../../types';
import { db } from '../../../utils/storage';
import ExcelJS from 'exceljs';
import { excelSealStyles } from '../../../utils/excelSealStyles';
import { excelSealFormulas } from '../../../utils/excelSealFormulas';
import DatePicker from '../../shared/DatePicker';
import SmartOperationTable from '../operations/SmartOperationTable';

interface SealDetailsViewProps {
  batch: SealBatch;
  onBack: () => void;
  userId: string;
}

const SealDetailsView: React.FC<SealDetailsViewProps> = ({ batch, onBack, userId }) => {
  const [records, setRecords] = useState<SealRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    console.log(`[SealDetailsView] loadData INICIADO para lote: ${batch.id}`);
    setIsLoading(true);
    try {
      console.log(`[SealDetailsView] Buscando records, drivers e trips para lote: ${batch.id}`);
      const [recordsData, driversData, tripsData] = await Promise.all([
        db.getSealRecords(batch.id),
        db.getDrivers(),
        db.getTrips()
      ]);
      setRecords(recordsData);
      setDrivers(driversData);
      setTrips(tripsData);
      console.log(`[SealDetailsView] Dados carregados com sucesso para lote: ${batch.id}`);
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

  const handleSmartSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    
    let updatedCount = 0;
    const newRecords = [...records];

    for (let i = 0; i < newRecords.length; i++) {
      const record = newRecords[i];
      
      // Só tenta sincronizar se os campos principais estiverem vazios
      if (!record.containerNumber || !record.booking || !record.driverName) {
        // Busca viagem que tenha este número de lacre
        const matchingTrip = trips.find(t => {
          const tripSeal = t.seal || t.ocFormData?.seal || t.preStackingFormData?.seal;
          return tripSeal && tripSeal.trim() === record.sealNumber.trim();
        });
        
        if (matchingTrip) {
          let hasChanges = false;
          
          if (!record.containerNumber && matchingTrip.container) {
            record.containerNumber = matchingTrip.container.toUpperCase();
            hasChanges = true;
          }
          
          const tripBooking = matchingTrip.booking || matchingTrip.ocFormData?.booking || matchingTrip.preStackingFormData?.booking;
          if (!record.booking && tripBooking) {
            record.booking = tripBooking.toUpperCase();
            hasChanges = true;
          }
          
          if (!record.driverName && matchingTrip.driver?.name) {
            record.driverName = matchingTrip.driver.name.toUpperCase();
            hasChanges = true;
          }

          if (!record.reuseDate && matchingTrip.dateTime) {
            record.reuseDate = matchingTrip.dateTime.split('T')[0];
            hasChanges = true;
          }

          if (hasChanges) {
            try {
              await db.updateSealRecord(record);
              updatedCount++;
            } catch (err) {
              console.error(`Erro ao sincronizar lacre ${record.sealNumber}:`, err);
            }
          }
        }
      }
    }

    if (updatedCount > 0) {
      setRecords([...newRecords]);
      // Opcional: mostrar toast de sucesso (se disponível)
    }
    
    setIsSyncing(false);
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

    // 1. Configuração de Colunas baseadas no Layout A-F
    worksheet.columns = [
      { header: 'STATUS', key: 'status', width: 15 },
      { header: 'Nº LACRE', key: 'sealNumber', width: 15 },
      { header: 'Nº CONTAINER', key: 'container', width: 20 },
      { header: 'BOOKING', key: 'booking', width: 20 },
      { header: 'DATA REUSO', key: 'date', width: 15 },
      { header: 'MOTORISTA ALOCADO', key: 'driver', width: 35 }
    ];

    // 2. Dash de Topo: Contadores Dinâmicos
    worksheet.insertRow(1, ['RESUMO DE ESTOQUE - ' + batch.carrier]);
    worksheet.mergeCells('A1:F1');
    worksheet.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    const usedRow = worksheet.getRow(2);
    usedRow.getCell(1).value = 'TOTAL UTILIZADOS:';
    usedRow.getCell(2).value = { formula: excelSealFormulas.getSummaryUsedFormula(records.length) };
    Object.assign(usedRow.getCell(1), excelSealStyles.SUMMARY_LABEL);
    Object.assign(usedRow.getCell(2), excelSealStyles.SUMMARY_VALUE_USED);

    const availRow = worksheet.getRow(3);
    availRow.getCell(1).value = 'TOTAL DISPONÍVEIS:';
    availRow.getCell(2).value = { formula: excelSealFormulas.getSummaryAvailableFormula(records.length) };
    Object.assign(availRow.getCell(1), excelSealStyles.SUMMARY_LABEL);
    Object.assign(availRow.getCell(2), excelSealStyles.SUMMARY_VALUE_AVAIL);

    // Separador
    worksheet.getRow(4).height = 12;

    // 3. Cabeçalho Principal (Linha 5)
    const headerRow = worksheet.getRow(5);
    headerRow.values = ['STATUS', 'Nº LACRE', 'Nº CONTAINER', 'BOOKING', 'DATA REUSO', 'MOTORISTA ALOCADO'];
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      Object.assign(cell, excelSealStyles.HEADER);
    });

    // 4. Inserção de Dados (Linha 6 em diante)
    records.forEach((r, index) => {
      const rowIndex = index + 6;
      
      const rowData = [
        { formula: excelSealFormulas.getRowStatusFormula(rowIndex) }, // Status monitorando C,D,E,F
        r.sealNumber,
        r.containerNumber?.toUpperCase() || '',
        r.booking?.toUpperCase() || '',
        r.reuseDate ? new Date(r.reuseDate + 'T12:00:00') : '',
        r.driverName?.toUpperCase() || ''
      ];

      const row = worksheet.addRow(rowData);
      const isEven = rowIndex % 2 === 0;

      row.eachCell((cell, colNumber) => {
        cell.border = excelSealStyles.BORDER;
        cell.alignment = excelSealStyles.TEXT_CENTER;
        if (isEven) {
          cell.fill = excelSealStyles.ROW_EVEN.fill;
        }
        
        // Formatação Data
        if (colNumber === 5 && cell.value) {
          cell.numFmt = 'dd/mm/yyyy';
        }

        // Estilo Número Lacre (Negrito Azul)
        if (colNumber === 2) {
          cell.font = { bold: true, color: { argb: 'FF1E40AF' } };
        }
      });
    });

    // 5. Formatação Condicional Nativa (Fixing priority property)
    worksheet.addConditionalFormatting({
      ref: `A6:A${5 + records.length}`,
      rules: [
        {
          priority: 1,
          type: 'containsText',
          operator: 'containsText',
          text: 'UTILIZADO',
          style: { 
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFDCFCE7' } }, 
            font: { color: { argb: 'FF166534' }, bold: true } 
          }
        },
        {
          priority: 2,
          type: 'containsText',
          operator: 'containsText',
          text: 'DISPONÍVEL',
          style: { 
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF1F5F9' } }, 
            font: { color: { argb: 'FF475569' }, bold: true } 
          }
        }
      ]
    });

    // 6. Ativar Filtro
    worksheet.autoFilter = { from: 'A5', to: 'F5' };

    // 7. Download com nome padronizado
    const fileName = `CONTROLE DE LACRES ${batch.carrier} ${batch.startNumber} A ${batch.endNumber}.xlsx`;
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

  const columns = [
    {
      key: 'audit',
      label: 'Audit',
      sortable: false,
      width: 60,
      render: (r: SealRecord) => (
        <div className="flex justify-center py-1">
          {savingId === r.id ? (
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          ) : r.containerNumber ? (
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
          )}
        </div>
      ),
    },
    {
      key: 'sealNumber',
      label: 'Identificação Lacre',
      sortable: true,
      width: 160,
      render: (r: SealRecord) => (
        <span className="text-[12px] font-black text-slate-800 font-mono tracking-tighter">{r.sealNumber}</span>
      ),
    },
    {
      key: 'containerNumber',
      label: 'Equipamento (Container)',
      sortable: true,
      render: (r: SealRecord) => (
        <input
          className={`${inputClass} !bg-slate-50/40 text-[11px] font-black text-blue-700`}
          value={r.containerNumber || ''}
          onChange={e => handleUpdate(r.id, 'containerNumber', e.target.value.toUpperCase())}
          placeholder="----"
        />
      ),
    },
    {
      key: 'booking',
      label: 'Referência (Booking)',
      sortable: true,
      render: (r: SealRecord) => (
        <input
          className={inputClass}
          value={r.booking || ''}
          onChange={e => handleUpdate(r.id, 'booking', e.target.value.toUpperCase())}
          placeholder="----"
        />
      ),
    },
    {
      key: 'reuseDate',
      label: 'Data Uso',
      sortable: true,
      width: 170,
      render: (r: SealRecord) => (
        <DatePicker value={r.reuseDate || ''} onChange={v => handleUpdate(r.id, 'reuseDate', v)} placeholder="Data reuso..." />
      ),
    },
    {
      key: 'driverName',
      label: 'Recurso (Motorista)',
      sortable: true,
      render: (r: SealRecord) => (
        <>
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
        </>
      ),
    },
  ];

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
              onClick={handleSmartSync}
              disabled={isSyncing}
              className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase shadow-xl transition-all flex items-center gap-2 active:scale-95 ${
                isSyncing 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isSyncing ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth="3"/></svg>
              )}
              {isSyncing ? 'Sincronizando...' : 'Sincronização Inteligente'}
            </button>

           <button 
             onClick={exportToExcel}
             className="px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95"
           >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="3"/></svg>
             Planilha Inteligente
           </button>
        </div>
      </div>

      <SmartOperationTable
        userId={userId}
        componentId="seal-details-records"
        columns={columns}
        data={filteredRecords}
        hideInternalSearch
      />
    </div>
  );
};

export default SealDetailsView;