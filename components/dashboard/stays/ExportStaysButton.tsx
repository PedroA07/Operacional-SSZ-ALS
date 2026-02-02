
import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { StayRecord, StaySession } from '../../../types';
import { excelFormulas } from '../../../utils/excelFormulas';
import { excelStyles } from '../../../utils/excelStyles';
import { STAY_COLUMNS } from '../../../utils/columnConfig';

interface ExportStaysButtonProps {
  records: StayRecord[];
  session: StaySession;
}

const ExportStaysButton: React.FC<ExportStaysButtonProps> = ({ records, session }) => {
  const [isExporting, setIsExporting] = useState(false);

  const getMonthName = (date: Date) => {
    const months = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];
    return months[date.getMonth()];
  };

  const parseToExcelDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ESTADIAS');

      // 1. Configuração das Colunas
      worksheet.columns = STAY_COLUMNS.map(col => ({
        header: col.header,
        key: col.key,
        width: col.width
      }));

      // 2. Estilização do Cabeçalho
      const headerRow = worksheet.getRow(1);
      headerRow.height = 45;
      headerRow.eachCell((cell) => {
        Object.assign(cell, excelStyles.HEADER_STYLE);
      });

      // 3. Inserção de Dados
      records.forEach((r, index) => {
        const rowIndex = index + 2; // Linha 1 é header

        const rowData = {
          provedor: 'LUARA MEL VIEIRA',
          os: String(r.os || '').toUpperCase(),
          cliente: String(r.location || '').toUpperCase(),
          motorista: String(r.driverName || '').toUpperCase(),
          navio: String(r.ship || '').toUpperCase(),
          container: String(r.container || '').toUpperCase(),
          programado: parseToExcelDate(r.scheduledStart),
          chegada: parseToExcelDate(r.arrivalTime),
          saida: parseToExcelDate(r.departureTime),
          // Fix: corrected getAtendeuAgendaAgendaFormula to getAtendeuAgendaFormula
          atendeu: { formula: excelFormulas.getAtendeuAgendaFormula ? '' : '' }, // Placeholder
          freetime: (session.gracePeriodHours || 0) / 24, // Fração de dia para o Excel
          excedente: { formula: excelFormulas.getHorasExcedentesFormula(rowIndex) },
          custohora: session.costPerHour || 0,
          custototal: { formula: excelFormulas.getCustoTotalFormula(rowIndex) },
          avulsa: '',
          analise: ''
        };

        const row = worksheet.addRow(rowData);

        // Atribuir fórmulas manualmente para garantir consistência
        row.getCell('atendeu').value = { formula: excelFormulas.getAtendeuAgendaFormula(rowIndex) };
        row.getCell('excedente').value = { formula: excelFormulas.getHorasExcedentesFormula(rowIndex) };
        row.getCell('custototal').value = { formula: excelFormulas.getCustoTotalFormula(rowIndex) };

        // 4. Estilização da Linha (Bordas, Zebra e Formatos)
        row.eachCell((cell, colNumber) => {
          const colDef = STAY_COLUMNS[colNumber - 1];
          
          cell.border = excelStyles.BORDER_THIN;
          cell.alignment = excelStyles.DATA_ALIGN_CENTER;

          // Zebra
          if (rowIndex % 2 === 0) {
            cell.fill = excelStyles.ZEBRA_ROW_EVEN;
          }

          // Formatação Numérica Nativa
          if (['programado', 'chegada', 'saida'].includes(colDef.key)) {
            cell.numFmt = excelStyles.FORMATS.DATE_TIME;
          } else if (['freetime', 'excedente'].includes(colDef.key)) {
            cell.numFmt = excelStyles.FORMATS.TIME_LONG;
          } else if (['custohora', 'custototal'].includes(colDef.key)) {
            cell.numFmt = excelStyles.FORMATS.CURRENCY;
          }
        });
      });

      // 5. Ativar Auto-Filtro
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 16 }
      };

      // 6. Gerar Nome Dinâmico
      const dStart = new Date(session.startDate);
      const dEnd = new Date(session.endDate);
      const fileName = `ESTADIA ${dStart.getFullYear()} ${getMonthName(dStart)} ${String(dStart.getDate()).padStart(2, '0')} A ${String(dEnd.getDate()).padStart(2, '0')}.xlsx`;

      // 7. Download do Arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro na exportação Excel:', error);
      alert('Falha ao gerar o relatório detalhado.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button 
      onClick={handleExport}
      disabled={isExporting}
      className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
    >
      {isExporting ? (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeWidth="3" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )}
      {isExporting ? 'Processando...' : 'Exportar Planilha'}
    </button>
  );
};

export default ExportStaysButton;
