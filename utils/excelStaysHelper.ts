
import ExcelJS from 'exceljs';
import { StayRecord, StaySession } from '../types';

export const excelStaysHelper = {
  /**
   * Gera o nome do arquivo baseado nas datas da sessão
   */
  generateFileName: (session: StaySession): string => {
    try {
      const start = new Date(session.startDate);
      const end = new Date(session.endDate);
      const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      
      const mes = months[start.getMonth()];
      const diaIni = String(start.getDate()).padStart(2, '0');
      const diaFim = String(end.getDate()).padStart(2, '0');
      const ano = start.getFullYear();

      return `ESTADIA_${mes}_${diaIni}-${diaFim}_${ano}`.toUpperCase();
    } catch (e) {
      return `RELATORIO_ESTADIAS_${Date.now()}`;
    }
  },

  /**
   * Converte string ISO para Objeto Date compatível com ExcelJS (preserva Timezone)
   */
  parseDate: (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  },

  /**
   * Executa a exportação completa
   */
  exportStays: async (records: StayRecord[], session: StaySession) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ESTADIAS');

    // 1. Configuração de Colunas
    worksheet.columns = [
      { header: 'PROVEDOR', key: 'provedor', width: 22 },
      { header: 'NUMERO DA OS', key: 'os', width: 18 },
      { header: 'CLIENTE / ATENDIMENTO', key: 'cliente', width: 25 },
      { header: 'MOTORISTAS', key: 'motorista', width: 30 },
      { header: 'NAVIO / VIAGEM', key: 'navio', width: 20 },
      { header: 'CONTAINER', key: 'container', width: 18 },
      { header: 'HORARIO PROGRAMADO', key: 'programado', width: 20 },
      { header: 'CHEGADA (CHECK-IN)', key: 'chegada', width: 20 },
      { header: 'SAIDA (CHECK-OUT)', key: 'saida', width: 20 },
      { header: 'ATENDEU AGENDA', key: 'atendeu', width: 12 },
      { header: 'FREE-TIME', key: 'freetime', width: 10 }, // Largura reduzida
      { header: 'HORAS EXCEDENTES', key: 'excedente', width: 12 }, // Largura reduzida
      { header: 'CUSTO P/ HORA OU FRACAO', key: 'custohora', width: 15 },
      { header: 'CUSTO TOTAL', key: 'custototal', width: 18 },
      { header: 'OS AVULSA', key: 'avulsa', width: 10 },
      { header: 'ANÁLISE', key: 'analise', width: 15 },
    ];

    // 2. Estilo do Cabeçalho
    const headerRow = worksheet.getRow(1);
    headerRow.height = 40;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    // 3. Adição de Dados
    records.forEach((r, index) => {
      const rowIndex = index + 2;
      
      // Valores base para fórmulas
      const freeTimeDays = (session.gracePeriodHours || 0) / 24;
      const costPerHour = session.costPerHour || 0;

      const row = worksheet.addRow({
        provedor: 'LUARA MEL VIEIRA',
        os: String(r.os || '').toUpperCase(),
        cliente: String(r.location || '').toUpperCase(), // Mapeamento dinâmico corrigido
        motorista: String(r.driverName || '').toUpperCase(),
        navio: String(r.ship || '').toUpperCase(),
        container: String(r.container || '').toUpperCase(),
        programado: excelStaysHelper.parseDate(r.scheduledStart),
        chegada: excelStaysHelper.parseDate(r.arrivalTime),
        saida: excelStaysHelper.parseDate(r.departureTime),
        atendeu: '', // Preenchido via fórmula abaixo
        freetime: freeTimeDays,
        custohora: costPerHour,
        avulsa: '',
        analise: ''
      });

      // FÓRMULAS NATIVAS
      // Atendeu Agenda (Col J): Se Chegada <= Programado
      row.getCell('atendeu').value = {
        formula: `IF(H${rowIndex}<=G${rowIndex}, "SIM", "NAO")`
      };

      // Horas Excedentes (Col L): MAX(0, (Saída - Chegada) - FreeTime)
      // No Excel, datas/horas são números. (Saída-Entrada) resulta em dias decimais.
      row.getCell('excedente').value = {
        formula: `MAX(0, (I${rowIndex}-H${rowIndex})-K${rowIndex})`
      };

      // Custo Total (Col N): (Excedente em dias * 24 horas) * Valor Hora
      row.getCell('custototal').value = {
        formula: `(L${rowIndex}*24)*M${rowIndex}`
      };

      // 4. Estilização das Células da Linha
      row.eachCell((cell, colNumber) => {
        const colKey = worksheet.columns[colNumber - 1].key;

        // Borda Fina Padrão
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };

        // Zebra: Linhas Pares
        if (rowIndex % 2 === 0) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
        }

        // Formatação por Tipo de Dado
        if (['programado', 'chegada', 'saida'].includes(colKey || '')) {
          cell.numFmt = 'dd/mm/yyyy hh:mm';
          cell.alignment = { horizontal: 'center' };
        } else if (['freetime', 'excedente'].includes(colKey || '')) {
          cell.numFmt = '[h]:mm';
          cell.alignment = { horizontal: 'center' };
        } else if (['custohora', 'custototal'].includes(colKey || '')) {
          cell.numFmt = '"R$ " #,##0.00';
          cell.alignment = { horizontal: 'right' };
        } else {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        
        cell.font = { size: 9 };
      });
    });

    // 5. Filtros e Auto-Ajuste
    worksheet.autoFilter = { from: 'A1', to: 'P1' };

    // Auto-fit inteligente (exceto colunas de tempo fixas)
    worksheet.columns.forEach(column => {
      if (['freetime', 'excedente'].includes(column.key || '')) return; // Mantém largura manual
      
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      column.width = Math.min(Math.max(maxLen + 4, 12), 40);
    });

    // 6. Finalização e Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${excelStaysHelper.generateFileName(session)}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
};
