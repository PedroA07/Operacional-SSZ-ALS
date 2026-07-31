import ExcelJS from 'exceljs';
import { Driver, FrotaLegalStatus } from '../types';

const onlyAlnum = (v?: string | null) => (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

// Cores por status (fundo + fonte) no padrão do Excel
const STATUS_FILL: Record<string, { bg: string; font: string }> = {
  'Liberado':   { bg: 'FFC6EFCE', font: 'FF006100' },
  'Bloqueado':  { bg: 'FFFFC7CE', font: 'FF9C0006' },
  'Em Análise': { bg: 'FFDDEBF7', font: 'FF2F5496' },
  'Pendente':   { bg: 'FFFFEB9C', font: 'FF9C6500' },
};

export interface FrotaLegalRow {
  driver: Driver;
  motoristaStatus?: FrotaLegalStatus;
  cavaloStatus?: FrotaLegalStatus;
  carretaStatus?: FrotaLegalStatus;
}

export const exportFrotaLegalExcel = async (rows: FrotaLegalRow[]) => {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet('FROTA LEGAL');

  ws.columns = [
    { header: 'MOTORISTA', key: 'motorista', width: 34 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'STATUS', key: 'motoristaStatus', width: 14 },
    { header: 'CAVALO', key: 'cavalo', width: 12 },
    { header: 'STATUS', key: 'cavaloStatus', width: 14 },
    { header: 'CARRETA', key: 'carreta', width: 12 },
    { header: 'STATUS', key: 'carretaStatus', width: 14 },
  ];

  // Cabeçalho
  const header = ws.getRow(1);
  header.height = 24;
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 10 };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  const statusCols = ['motoristaStatus', 'cavaloStatus', 'carretaStatus'];

  rows.forEach(r => {
    const row = ws.addRow({
      motorista: (r.driver.name || '').toUpperCase(),
      cpf: r.driver.cpf || '',
      motoristaStatus: (r.motoristaStatus || '').toUpperCase(),
      cavalo: onlyAlnum(r.driver.plateHorse),
      cavaloStatus: (r.cavaloStatus || '').toUpperCase(),
      carreta: onlyAlnum(r.driver.plateTrailer),
      carretaStatus: (r.carretaStatus || '').toUpperCase(),
    });
    row.height = 20;
    row.eachCell(cell => {
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.font = { size: 10 };
    });
    // Colore as células de status
    statusCols.forEach((key, i) => {
      const colIndex = [3, 5, 7][i];
      const val = [r.motoristaStatus, r.cavaloStatus, r.carretaStatus][i];
      const theme = val ? STATUS_FILL[val] : undefined;
      const cell = row.getCell(colIndex);
      if (theme) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: theme.bg } };
        cell.font = { size: 10, bold: true, color: { argb: theme.font } };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `FROTA_LEGAL_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};
