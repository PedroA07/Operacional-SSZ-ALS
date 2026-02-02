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

      // 1. Definição das Chaves e Cabeçalhos
      // As larguras serão ajustadas dinamicamente depois
      worksheet.columns = [
        { header: 'PROVEDOR', key: 'provedor' },
        { header: 'NUMERO DA OS', key: 'os' },
        { header: 'CLIENTE', key: 'cliente' },
        { header: 'MOTORISTAS', key: 'motorista' },
        { header: 'NAVIO/VIAGEM', key: 'navio' },
        { header: 'CONTAINER', key: 'container' },
        { header: 'HORARIO PROGRAMADO', key: 'programado' },
        { header: 'CHEGADA', key: 'chegada' },
        { header: 'SAIDA', key: 'saida' },
        { header: 'ATENDEU AGENDA', key: 'atendeu' },
        { header: 'FREE-TIME', key: 'freetime' },
        { header: 'HORAS EXCEDENTES', key: 'excedente' },
        { header: 'CUSTO POR HORA OU FRACAO', key: 'custohora' },
        { header: 'CUSTO TOTAL', key: 'custototal' },
        { header: 'OS AVULSA', key: 'avulsa' },
        { header: 'ANÁLISE', key: 'analise' },
      ];

      // 2. Estilização do Cabeçalho (Wrap Text + Height + Center)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 35; // Altura maior para permitir quebra de linha
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E78' }
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 9
        };
        cell.alignment = { 
          vertical: 'middle', 
          horizontal: 'center', 
          wrapText: true 
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // 3. Adição de Dados
      records.forEach((r, index) => {
        const rowIndex = index + 2;
        
        let atendeuAgenda = 'NAO';
        if (r.scheduledStart && r.arrivalTime) {
          const sched = new Date(r.scheduledStart).getTime();
          const arriv = new Date(r.arrivalTime).getTime();
          if (arriv <= sched) atendeuAgenda = 'SIM';
        }

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

        const cellCustoTotal = row.getCell('custototal');
        cellCustoTotal.value = {
          formula: `(L${rowIndex}*24)*M${rowIndex}`,
          date1904: false
        };

        // 4. Estilização Individual das Células da Linha
        row.eachCell((cell, colNumber) => {
          const colKey = worksheet.columns[colNumber - 1].key;

          // Bordas e Zebra
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          if (rowIndex % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' }
            };
          }

          // Lógica de Alinhamento e Formatação
          const alignCenter: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'center' };
          const alignRight: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'right' };
          const alignLeft: Partial<ExcelJS.Alignment> = { vertical: 'middle', horizontal: 'left' };

          if (colKey === 'freetime' || colKey === 'excedente') {
            cell.numFmt = '[h]:mm';
            cell.alignment = alignCenter;
          } else if (colKey === 'custohora' || colKey === 'custototal') {
            cell.numFmt = '"R$ " #,##0.00';
            cell.alignment = alignRight;
          } else if (['os', 'container', 'atendeu', 'programado', 'chegada', 'saida'].includes(colKey || '')) {
            cell.alignment = alignCenter;
            cell.font = { size: 9 };
          } else {
            cell.alignment = alignLeft;
            cell.font = { size: 9 };
          }
        });
      });

      // 5. Ajuste Inteligente de Largura (Focado no Conteúdo)
      worksheet.columns.forEach(column => {
        let maxContentLength = 0;
        
        // Ignora a célula do header (row 1) para o cálculo da largura, focando nos dados
        column.eachCell?.({ includeEmpty: true }, (cell, rowNumber) => {
          if (rowNumber > 1) {
            let cellValue = '';
            if (cell.value && typeof cell.value === 'object' && 'formula' in cell.value) {
              cellValue = 'R$ 0.000,00'; // Placeholder para fórmulas de moeda
            } else {
              cellValue = cell.value ? String(cell.value) : '';
            }
            
            // Ajuste para formatos numéricos/moeda que ocupam mais espaço visual
            if (cell.numFmt?.includes('R$')) cellValue += 'RRRR'; 
            
            if (cellValue.length > maxContentLength) {
              maxContentLength = cellValue.length;
            }
          }
        });

        // Define largura baseada no conteúdo com padding
        // Se o conteúdo for muito curto e o header longo, o wrapText do header fará o trabalho
        const finalWidth = Math.max(maxContentLength + 4, 11);
        column.width = finalWidth > 45 ? 45 : finalWidth; // Limite máximo de 45
      });

      // 6. Download
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
      alert('Falha ao gerar a planilha.');
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