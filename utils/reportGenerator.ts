
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
      if (!isoString) return "";
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      }).replace(',', '').toUpperCase();
    } catch (e) {
      return "";
    }
  },

  renderTripTableHTML: (data: TableReportData): string => {
    const headerStyle = "background-color: #5b9bd5; color: #000000; font-weight: bold; border: 1px solid #000000; padding: 6px 10px; text-align: center; width: 140px; font-size: 11px; font-family: Calibri, sans-serif; text-transform: uppercase;";
    const cellStyle = "background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 6px 10px; text-align: center; font-size: 11px; font-family: Calibri, sans-serif; min-width: 220px; font-weight: bold; text-transform: uppercase; white-space: normal; word-break: break-word;";

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
            <td style="${headerStyle}">${row.label.toUpperCase()}</td>
            <td style="${cellStyle}">${(row.value || "").toUpperCase()}</td>
          </tr>
        `).join('')}
      </table>
    `;
  },

  generateFullReportHTML: (activeData: TableReportData[], finishedData: TableReportData[]): string => {
    const hasActive = activeData.length > 0;
    const hasFinished = finishedData.length > 0;

    let columnsHtml = "";

    if (hasActive) {
      columnsHtml += `
        <td style="vertical-align: top; ${hasFinished ? 'padding-right: 20px; width: 50%;' : 'width: 100%;'} border: none;">
          <p style="font-weight: bold; font-size: 13px; font-family: Arial, sans-serif; margin-bottom: 15px; color: #000;">EM ANDAMENTO:</p>
          ${activeData.map(d => reportGenerator.renderTripTableHTML(d)).join('')}
        </td>
      `;
    }

    if (hasFinished) {
      columnsHtml += `
        <td style="vertical-align: top; ${hasActive ? 'padding-left: 20px; border-left: 1px solid #f1f5f9; width: 50%;' : 'width: 100%;'} text-align: left;">
          <p style="font-weight: bold; font-size: 13px; font-family: Arial, sans-serif; margin-bottom: 15px; color: #000;">FINALIZADAS / CONTAINER SOBRE RODAS:</p>
          ${finishedData.map(d => reportGenerator.renderTripTableHTML(d)).join('')}
        </td>
      `;
    }

    return `
      <div style="background-color: #ffffff; padding: 15px;">
        <table style="width: 100%; border-collapse: collapse; border: none;">
          <tr>
            ${columnsHtml}
          </tr>
        </table>
      </div>
    `;
  },

  generatePlainText: (active: TableReportData[], finished: TableReportData[]): string => {
    const render = (list: TableReportData[]) => list.map(d => 
      `MOTORISTA: ${d.motorista.toUpperCase()} | CONTAINER: ${d.container.toUpperCase()} | RETIRADA CRAGEA: ${d.retiradaCragea.toUpperCase()} | CHEGADA VOLKS: ${d.chegadaVolks.toUpperCase()} | SAIDA VOLKS: ${d.saidaVolks.toUpperCase()} | BAIXA CRAGEA: ${d.baixaCragea.toUpperCase()}`
    ).join(' || ');

    let parts = [];
    if (active.length > 0) {
      parts.push(`EM ANDAMENTO: ${render(active)} [FIM ANDAMENTO]`);
    }
    if (finished.length > 0) {
      parts.push(`FINALIZADAS: ${render(finished)} [FIM RELATORIO]`);
    }

    return parts.join(' ').replace(/\r?\n|\r/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  }
};
