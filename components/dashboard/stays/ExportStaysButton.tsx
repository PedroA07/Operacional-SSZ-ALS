
import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { StayRecord, StaySession } from '../../../types';

interface ExportStaysButtonProps {
  records: StayRecord[];
  session: StaySession;
  categoryName: string;
}

const ExportStaysButton: React.FC<ExportStaysButtonProps> = ({ records, session, categoryName }) => {
  const [isExporting, setIsExporting] = useState(false);

  const formatFullDateTime = (iso: string) => {
    if (!iso || iso.length < 10) return '';
    try {
      const [datePart, timePart] = iso.split('T');
      const [y, m, d] = datePart.split('-');
      const time = timePart ? timePart.substring(0, 5) : '00:00';
      return `${d}/${m}/${y} ${time}`;
    } catch (e) { return ''; }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ESTADIAS');

      // 1. Definição das Colunas (Headers)
      worksheet.columns = [
        { header: 'PROVEDOR', key: 'provedor', width: 25 },
        { header: 'NUMERO DA OS', key: 'os', width: 15 },
        { header: 'CLIENTE', key: 'cliente', width: 25 },
        { header: 'MOTORISTAS', key: 'motorista', width: 30 },
        { header: 'NAVIO/VIAGEM', key: 'navio', width: 20 },
        { header: 'CONTAINER', key: 'container', width: 18 },
        { header: 'HORARIO PROGRAMADO', key: 'programado', width: 22 },
        { header: 'CHEGADA', key: 'chegada', width: 22 },
        { header: 'SAIDA', key: 'saida', width: 22 },
        { header: 'ATENDEU AGENDA', key: 'atendeu', width: 15 },
        { header: 'FREE-TIME', key: 'freetime', width: 15 },
        { header: 'HORAS EXCEDENTES', key: 'excedente', width: 18 },
        { header: 'CUSTO POR HORA OU FRACAO', key: 'custohora', width: 28 },
        { header: 'CUSTO TOTAL', key: 'custototal', width: 20 },
        { header: 'OS AVULSA', key: 'avulsa', width: 12 },
        { header: 'ANÁLISE', key: 'analise', width: 12 },
      ];

      // 2. Estilização do Cabeçalho
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E78' } // Azul Escuro Corporativo
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' }, // Branco
          bold: true,
          size: 10
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // 3. Adição de Dados com Zebra e Formatação
      records.forEach((r, index) => {
        const rowIndex = index + 2; // +1 pelo header, base 1 do Excel

        // Lógica Atendeu Agenda
        let atendeuAgenda = 'NAO';
        if (r.scheduledStart && r.arrivalTime) {
          const sched = new Date(r.scheduledStart).getTime();
          const arriv = new Date(r.arrivalTime).getTime();
          if (arriv <= sched) atendeuAgenda = 'SIM';
        }

        // Conversão de Horas para Fração de Dia (Excel Time)
        const exceededHoursRaw = r.exceededHours === '---' ? 0 : parseInt(r.exceededHours.split('h')[0]);
        const exceededValue = exceededHoursRaw / 24;
        const freeTimeValue = (session.gracePeriodHours || 0) / 24;

        const row = worksheet.addRow({
          provedor: 'LUARA MEL VIEIRA',
          os: (r.os || '').toUpperCase(),
          cliente: categoryName.toUpperCase(),
          motorista: (r.driverName || '').toUpperCase(),
          navio: (r.ship || '').toUpperCase(),
          container: (r.container || '').toUpperCase(),
          programado: formatFullDateTime(r.scheduledStart),
          chegada: formatFullDateTime(r.arrivalTime),
          saida: formatFullDateTime(r.departureTime),
          atendeu: atendeuAgenda.toUpperCase(),
          freetime: freeTimeValue,
          excedente: exceededValue,
          custohora: session.costPerHour || 0,
          avulsa: '',
          analise: ''
        });

        // Aplicar Fórmula de Custo Total: (Horas * 24) * ValorHora
        // L = Horas Excedentes, M = Custo por Hora
        const cellCustoTotal = row.getCell('custototal');
        cellCustoTotal.value = {
          formula: `(L${rowIndex}*24)*M${rowIndex}`,
          date1904: false
        };

        // Formatação das Células da Linha
        row.eachCell((cell, colNumber) => {
          // Borda em todas as células
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // Zebra: Linhas pares com fundo cinza claro
          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' }
            };
          }

          cell.alignment = { vertical: 'middle', horizontal: 'center' };

          // Formatos Específicos
          const colKey = worksheet.columns[colNumber - 1].key;
          if (colKey === 'freetime' || colKey === 'excedente') {
            cell.numFmt = '[h]:mm';
          } else if (colKey === 'custohora' || colKey === 'custototal') {
            cell.numFmt = '"R$ " #,##0.00';
          }
        });
      });

      // 4. Ativar Auto-Filtro
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 16 }
      };

      // 5. Ajuste Dinâmico de Colunas (Auto-Fit simplificado)
      worksheet.columns.forEach(column => {
        let maxColumnLength = 0;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? String(cell.value).length : 0;
          if (columnLength > maxColumnLength) {
            maxColumnLength = columnLength;
          }
        });
        column.width = maxColumnLength < 12 ? 12 : maxColumnLength + 5;
      });

      // 6. Geração do Arquivo e Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const fileName = `RELATORIO_ESTADIAS_${categoryName.replace(/\|/g, '_')}_${new Date().getTime()}.xlsx`.toUpperCase();
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Erro na exportação Excel:', error);
      alert('Falha ao gerar a planilha estilizada.');
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
