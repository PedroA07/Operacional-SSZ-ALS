
import { Trip, StatusHistoryEntry } from '../types';
import { ReportOverride } from './emailFormatter';
import { predictionService } from './predictionService';

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
   * Renderiza a tabela exata conforme a imagem enviada
   */
  renderTripTableHTML: (trip: Trip, allTrips: Trip[], override?: ReportOverride): string => {
    const history = trip.statusHistory || [];
    
    // Função auxiliar para buscar hora de um status específico
    const getStatusTime = (statusNames: string[]) => {
      const found = history.find(h => statusNames.some(name => h.status.toLowerCase().includes(name.toLowerCase())));
      return found ? reportGenerator.formatFullDate(found.dateTime) : "";
    };

    // Mapeamento das linhas conforme imagem
    const rows = [
      { label: 'MOTORISTA', value: trip.driver.name.toUpperCase() },
      { label: 'CONTAINER', value: (trip.container || 'A DEFINIR').toUpperCase() },
      { label: 'RETIRADA CRAGEA', value: getStatusTime(['Cragea', 'Retirada do cheio']) },
      { label: 'CHEGADA VOLKS', value: getStatusTime(['Chegou na Volkswagen', 'Chegada na Volkswagen']) },
      { label: 'SAIDA VOLKS', value: getStatusTime(['Saiu da Volkswagen', 'Saída da Volkswagen']) },
      { label: 'BAIXA CRAGEA', value: getStatusTime(['Viagem concluída', 'Baixa Cragea']) }
    ];

    // Lógica de Previsão inserida na célula (caso o valor esteja vazio)
    const pred = predictionService.getNextStatusPrediction(trip, allTrips);
    if (pred) {
      if (pred.label.includes('Volkswagen') && !rows[3].value) rows[3].value = `PREV CHEGADA ${pred.time}`;
      if (pred.label.includes('Volkswagen') && rows[3].value && !rows[4].value) rows[4].value = `PREV SAÍDA ${pred.time}`;
    }

    const headerStyle = "background-color: #9bc2e6; color: #ffffff; font-weight: bold; border: 1px solid #000000; padding: 4px 12px; text-align: center; width: 180px; font-size: 11px;";
    const cellStyle = "background-color: #ffffff; color: #000000; border: 1px solid #000000; padding: 4px 12px; text-align: center; font-size: 11px; min-width: 250px; font-weight: bold;";

    return `
      <table style="border-collapse: collapse; margin-bottom: 20px; font-family: Calibri, sans-serif; width: 100%; max-width: 500px;">
        ${rows.map(row => `
          <tr>
            <td style="${headerStyle}">${row.label}</td>
            <td style="${cellStyle}">${row.value || ""}</td>
          </tr>
        `).join('')}
      </table>
    `;
  },

  /**
   * Gera o Relatório Completo em 2 Colunas conforme o print
   */
  generateFullReportHTML: (trips: Trip[], allContextTrips: Trip[], overrides: Record<string, ReportOverride>, showCustomer: boolean = false): string => {
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const finishedTrips = trips.filter(t => t.status === 'Viagem concluída');

    return `
      <div style="font-family: Calibri, sans-serif; padding: 10px; background-color: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <p style="font-weight: bold; font-size: 13px; margin-bottom: 10px; margin-top: 0;">EM ANDAMENTO:</p>
              ${activeTrips.map(t => reportGenerator.renderTripTableHTML(t, allContextTrips)).join('')}
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 20px;">
              <p style="font-weight: bold; font-size: 13px; margin-bottom: 10px; margin-top: 0;">FINALIZADAS:</p>
              ${finishedTrips.map(t => reportGenerator.renderTripTableHTML(t, allContextTrips)).join('')}
            </td>
          </tr>
        </table>
      </div>
    `;
  },

  /**
   * Texto puro para fallback
   */
  generatePlainText: (trips: Trip[], overrides: Record<string, ReportOverride>, showCustomer: boolean = false): string => {
    return trips.map(t => {
      const history = t.statusHistory || [];
      const getVal = (s: string) => history.find(h => h.status.includes(s))?.dateTime ? new Date(history.find(h => h.status.includes(s))!.dateTime).toLocaleString('pt-BR') : '---';
      
      return `MOTORISTA: ${t.driver.name}\nCONTAINER: ${t.container}\nRETIRADA CRAGEA: ${getVal('Cragea')}\nCHEGADA VOLKS: ${getVal('Volkswagen')}\nSAIDA VOLKS: ${getVal('Volkswagen')}\nBAIXA CRAGEA: ${getVal('concluída')}\n--------------------------`;
    }).join('\n');
  }
};
