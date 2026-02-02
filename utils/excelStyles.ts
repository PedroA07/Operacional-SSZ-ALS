
import ExcelJS from 'exceljs';

export const excelStyles = {
  HEADER_STYLE: {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E78' }
    } as ExcelJS.Fill,
    font: {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      name: 'Calibri',
      size: 11
    },
    alignment: {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    } as ExcelJS.Alignment,
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    } as Partial<ExcelJS.Borders>
  },

  BORDER_THIN: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  } as Partial<ExcelJS.Borders>,

  // Estilo padrão centralizado
  DATA_ALIGN_CENTER: {
    vertical: 'middle',
    horizontal: 'center'
  } as ExcelJS.Alignment,

  // Novo: Alinhamento à esquerda com indentação para legibilidade
  DATA_STYLE_LEFT: {
    vertical: 'middle',
    horizontal: 'left',
    indent: 1
  } as ExcelJS.Alignment,

  // Novo: Centralizado e Negrito para códigos (OS)
  FONT_BOLD: {
    bold: true,
    name: 'Calibri',
    size: 10
  } as Partial<ExcelJS.Font>,

  ZEBRA_ROW_EVEN: {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F2F2' }
  } as ExcelJS.Fill,

  FORMATS: {
    CURRENCY: '"R$ " #,##0.00',
    TIME_LONG: '[h]:mm',
    DATE_TIME: 'dd/mm/yyyy hh:mm'
  }
};
