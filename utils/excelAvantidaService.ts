
import * as XLSX from 'xlsx';
import { AvantidaRecord, Driver } from '../types';

export const excelAvantidaService = {
  /**
   * Exporta os registros do Avantida para um arquivo Excel com metadados de formatação.
   */
  exportToStyledExcel: (records: AvantidaRecord[], drivers: Driver[]) => {
    // Preparação dos dados com cabeçalhos amigáveis
    const dataToExport = records.map(r => {
      const drv = drivers.find(d => d.id === r.driverId);
      return {
        'AUDITORIA': r.verified ? 'CONFERIDO' : 'PENDENTE',
        'DATA PEDIDO': new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR'),
        'Nº CONTAINER': r.containerNumber?.toUpperCase() || '---',
        'EXPORT REF.': r.exportRef?.toUpperCase() || '---',
        'VALOR LANÇADO (R$)': r.requestedPrice,
        'MOTORISTA': drv?.name || '---',
        'PLACA CAVALO': drv?.plateHorse || '---',
        'REF CLIENTE': r.customerRef?.toUpperCase() || '---',
        'ACERTO VIAGEM': r.tripSettlement?.toUpperCase() || '---'
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    
    // Configuração de largura das colunas para melhor visualização (Aesthetics)
    const wscols = [
      { wch: 15 }, // Auditoria
      { wch: 15 }, // Data Pedido
      { wch: 20 }, // Nº Container
      { wch: 20 }, // Export Ref
      { wch: 18 }, // Valor
      { wch: 35 }, // Motorista
      { wch: 15 }, // Placa
      { wch: 25 }, // Ref Cliente
      { wch: 20 }  // Acerto
    ];
    ws['!cols'] = wscols;

    // Adiciona filtros automáticos no cabeçalho
    if (dataToExport.length > 0) {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Avantida ALS");
    
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `RELATORIO_AVANTIDA_${timestamp}.xlsx`);
  }
};
