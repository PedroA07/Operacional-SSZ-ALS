
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

  /**
   * Renderiza a tabela 2x6 idêntica à foto
   */
  renderTripTableHTML: (data: TableReportData): string => {
    const headerStyle = "background-color: #9bc2e6; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 4px 12px; text-align: center; width: 150px; font-size: 11px; font-family: 'Segoe UI', Calibri, Arial;";
    const cellStyle = "background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 4px 12px; text-align: center; font-size: 11px; font-family: 'Segoe UI', Calibri, Arial; min-width: 250px; font-weight: bold;";

    const rows = [
      { label: 'MOTORISTA', value: data.motorista },
      { label: 'CONTAINER', value: data.container },
      { label: 'RETIRADA CRAGEA', value: data.retiradaCragea },
      { label: 'CHEGADA VOLKS', value: data.chegadaVolks },
      { label: 'SAIDA VOLKS', value: data.saidaVolks },
      { label: 'BAIXA CRAGEA', value: data.baixaCragea }
    ];

    return `
      <table style="border-collapse: collapse; margin-bottom: 25px; width: 400px; table-layout: fixed;">
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
      <div style="background-color: #ffffff; padding: 20px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <p style="font-weight: bold; font-size: 13px; font-family: Arial; margin-bottom: 15px; color: #000;">EM ANDAMENTO:</p>
              ${activeData.map(d => reportGenerator.renderTripTableHTML(d)).join('')}
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 20px;">
              <p style="font-weight: bold; font-size: 13px; font-family: Arial; margin-bottom: 15px; color: #000;">FINALIZADAS:</p>
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
