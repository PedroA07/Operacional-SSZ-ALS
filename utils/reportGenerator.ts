
import { Trip } from '../types';

export interface TableReportData {
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
    const headerStyle = "background-color: #5b9bd5; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 4px 8px; text-align: center; width: 140px; font-size: 11px; font-family: Calibri, sans-serif; text-transform: uppercase;";
    const cellStyle = "background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 4px 8px; text-align: center; font-size: 11px; font-family: Calibri, sans-serif; min-width: 200px; font-weight: bold; text-transform: uppercase;";

    const rows = [
      { label: 'MOTORISTA', value: data.motorista },
      { label: 'CONTAINER', value: data.container },
      { label: 'RETIRADA CRAGEA', value: data.retiradaCragea },
      { label: 'CHEGADA VOLKS', value: data.chegadaVolks },
      { label: 'SAIDA VOLKS', value: data.saidaVolks },
      { label: 'BAIXA CRAGEA', value: data.baixaCragea }
    ];

    return `
      <table style="border-collapse: collapse; margin-bottom: 20px; width: 100%; max-width: 450px; table-layout: fixed;">
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
      <div style="background-color: #ffffff; padding: 10px; font-family: Calibri, sans-serif;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <p style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #000;">EM ANDAMENTO:</p>
              ${activeData.map(d => reportGenerator.renderTripTableHTML(d)).join('')}
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 15px;">
              <p style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #000;">FINALIZADAS:</p>
              ${finishedData.map(d => reportGenerator.renderTripTableHTML(d)).join('')}
            </td>
          </tr>
        </table>
      </div>
    `;
  },

  generatePlainText: (active: TableReportData[], finished: TableReportData[]): string => {
    const render = (list: TableReportData[]) => list.map(d => 
      `MOTORISTA: ${d.motorista}\nCONTAINER: ${d.container}\nRETIRADA CRAGEA: ${d.retiradaCragea}\nCHEGADA VOLKS: ${d.chegadaVolks}\nSAIDA VOLKS: ${d.saidaVolks}\nBAIXA CRAGEA: ${d.baixaCragea}\n--------------------------`
    ).join('\n');
    return `EM ANDAMENTO:\n${render(active)}\n\nFINALIZADAS:\n${render(finished)}`;
  }
};
