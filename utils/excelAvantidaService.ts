
import * as XLSX from 'xlsx';
import { AvantidaRecord, Driver } from '../types';

export const excelAvantidaService = {
  /**
   * Exporta os registros do Avantida para um arquivo Excel com cabeçalhos profissionais e larguras ajustadas.
   */
  exportToStyledExcel: (records: AvantidaRecord[], drivers: Driver[]) => {
    const dataToExport = records.map(r => {
      const drv = drivers.find(d => d.id === r.driverId);
      return {
        'STATUS': r.verified ? 'CONFERIDO' : 'PENDENTE',
        'DATA PEDIDO': new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR'),
        'Nº CONTAINER': r.containerNumber?.toUpperCase() || '---',
        'REF. EXPORTAÇÃO': r.exportRef?.toUpperCase() || '---',
        'PREÇO (R$)': r.requestedPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        'MOTORISTA': drv?.name || '---',
        'PLACA CAVALO': drv?.plateHorse || '---',
        'REF. CLIENTE': r.customerRef?.toUpperCase() || '---',
        'ACERTO VIAGEM': r.tripSettlement?.toUpperCase() || '---'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    // Configuração de largura das colunas
    const wscols = [
      { wch: 15 }, // Status
      { wch: 15 }, // Data
      { wch: 20 }, // Container
      { wch: 20 }, // Export Ref
      { wch: 15 }, // Preço
      { wch: 35 }, // Motorista
      { wch: 15 }, // Placa
      { wch: 25 }, // Ref Cliente
      { wch: 25 }  // Acerto
    ];
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório Avantida ALS");
    
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `RELATORIO_AVANTIDA_ALS_${timestamp}.xlsx`);
  }
};
