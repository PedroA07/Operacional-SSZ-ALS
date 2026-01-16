
import { Trip } from '../types';

export interface TableReportData {
  id?: string;
  motorista: string;
  container: string;
  retiradaCragea: string;
  chegadaVolks: string;
  saidaVolks: string;
  baixaCragea: string;
}

export const reportGenerator = {
  formatFullDate: (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }).replace(',', '');
    } catch (e) {
      return "";
    }
  },

  renderTripTableHTML: (data: TableReportData): string => {
    const headerStyle = "background-color: #5b9bd5; color: #000000; font-weight: bold; border: 1px solid #000000; padding: 6px 10px; text-align: center; width: 140px; font-size: 11px; font-family: Calibri, sans-serif; text-transform: uppercase;";
    const cellStyle = "background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 6px 10px; text-align: center; font-size: 11px; font-family: Calibri, sans-serif; min-width: 220px; font-weight: bold; text-transform: uppercase;";

    const rows = [
      { label: 'MOTORISTA', value: data.motorista },
      { label: 'CONTAINER', value: data.container },
      { label: 'RETIRADA CRAGEA', value: data.retiradaCragea },
      { label: 'CHEGADA VOLKS', value: data.chegadaVolks },
      { label: 'SAIDA VOLKS', value: data.saidaVolks },
      { label: 'BAIXA CRAGEA', value: data.baixaCragea }
    ];

    return `
      <table style="border-collapse: collapse; margin-bottom: 25px; width: 380px; table-layout: fixed;">
        ${rows.map(row => `
          <tr>
            <td style="${headerStyle}">${row.label}</td>
            <td style="${cellStyle}">${row.value || ""}</td>
          </tr>
        `).join('')}
      </table>
    `;
  },

  generateFullReportHTML: (activeData: TableReportData[], finishedData: TableReportData[]): string => {
    return `
      <div style="background-color: #ffffff; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px; border: none;">
              <p style="font-weight: bold; font-size: 13px; font-family: Arial, sans-serif; margin-bottom: 15px; color: #000;">EM ANDAMENTO:</p>
              ${activeData.map(d => reportGenerator.renderTripTableHTML(d)).join('')}
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 20px; border: none;">
              <p style="font-weight: bold; font-size: 13px; font-family: Arial, sans-serif; margin-bottom: 15px; color: #000;">FINALIZADAS:</p>
              ${finishedData.map(d => reportGenerator.renderTripTableHTML(d)).join('')}
            </td>
          </tr>
        </table>
      </div>
    `;
  },

  generatePlainText: (active: TableReportData[], finished: TableReportData[]): string => {
    const render = (list: TableReportData[]) => list.map(d => 
      `MOTORISTA: ${d.motorista} | CONTAINER: ${d.container} | RETIRADA CRAGEA: ${d.retiradaCragea} | CHEGADA VOLKS: ${d.chegadaVolks} | SAIDA VOLKS: ${d.saidaVolks} | BAIXA CRAGEA: ${d.baixaCragea}`
    ).join(' || ');

    return `EM ANDAMENTO: ${render(active)} [FIM ANDAMENTO] FINALIZADAS: ${render(finished)} [FIM RELATORIO]`.replace(/\s+/g, ' ').trim();
  }
};
