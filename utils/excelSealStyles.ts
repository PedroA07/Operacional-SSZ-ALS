import ExcelJS from 'exceljs';

export const excelSealStyles = {
  HEADER: {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' } // Azul escuro (Blue-800)
    } as ExcelJS.Fill,
    font: {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11,
      name: 'Calibri'
    },
    alignment: {
      vertical: 'middle',
      horizontal: 'center'
    } as ExcelJS.Alignment,
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    } as Partial<ExcelJS.Borders>
  },

  ROW_EVEN: {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF8FAFC' } // Slate-50
    } as ExcelJS.Fill
  },

  BORDER: {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  } as Partial<ExcelJS.Borders>,

  TEXT_CENTER: {
    vertical: 'middle',
    horizontal: 'center'
  } as ExcelJS.Alignment,

  TEXT_BOLD: {
    bold: true
  } as Partial<ExcelJS.Font>
};
