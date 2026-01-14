
import { Trip, StatusHistoryEntry } from '../types';
import { predictionService } from './predictionService';

export interface ReportOverride {
  history: StatusHistoryEntry[];
  prediction: { label: string; time: string } | null;
}

export const emailFormatter = {
  formatFullDate: (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', 
        hour: '2-digit', minute: '2-digit' 
      });
    } catch (e) {
      return isoString;
    }
  },

  /**
   * Gera um card individual estilo "Premium" compatível com clientes de e-mail
   */
  toCompactRichText: (trip: Trip, allTrips: Trip[] = [], override?: ReportOverride, showCustomer: boolean = true): string => {
    const history = override 
      ? [...override.history].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      : [...(trip.statusHistory || [])]
          .filter(entry => entry.status !== 'Pendente')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    const prediction = override 
      ? override.prediction 
      : predictionService.getNextStatusPrediction(trip, allTrips);

    const mainColor = '#2563eb';
    const darkBg = '#0f172a';
    const borderColor = '#e2e8f0';
    const textColor = '#1e293b';
    const subTextColor = '#64748b';

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 20px; margin-bottom: 12px; overflow: hidden; background-color: #ffffff; width: 280px; display: inline-block; vertical-align: top;">
        <!-- Cabeçalho Estilo Revisão -->
        <div style="background-color: ${darkBg}; padding: 12px; border-bottom: 1px solid ${borderColor};">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #60a5fa; font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">OS:</span>
            <span style="color: #ffffff; font-size: 13px; font-weight: 900; text-transform: uppercase;">${trip.os}</span>
          </div>
          <div style="margin-top: 4px; font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">
             <span style="color: #ffffff; background-color: #3b82f6; padding: 1px 4px; border-radius: 4px; font-family: monospace;">${trip.container || 'A DEFINIR'}</span>
          </div>
          <div style="margin-top: 8px; font-size: 9px; color: #cbd5e1; font-weight: bold; text-transform: uppercase;">
            MOT: <span style="color: #60a5fa;">${trip.driver.name}</span>
          </div>
          ${showCustomer ? `<div style="margin-top: 4px; font-size: 7px; color: #64748b; font-weight: 900; text-transform: uppercase;">CLIENTE: ${trip.customer.name}</div>` : ''}
        </div>

        <!-- Histórico e Previsão -->
        <div style="padding: 12px; background-color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
            ${history.map((entry, idx) => `
              <tr>
                <td style="width: 8px; vertical-align: middle;">
                  <div style="width: 5px; height: 5px; border-radius: 50%; background-color: ${idx === 0 ? mainColor : '#cbd5e1'};"></div>
                </td>
                <td style="padding: 2px 8px; font-size: 10px; font-weight: ${idx === 0 ? '900' : 'bold'}; color: ${idx === 0 ? textColor : subTextColor}; text-transform: uppercase;">
                  ${entry.status}
                </td>
                <td style="padding: 2px 0; font-size: 8px; color: #94a3b8; text-align: right; font-family: monospace;">
                  ${new Date(entry.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                </td>
              </tr>
            `).join('')}
            
            ${prediction ? `
              <tr>
                <td colspan="3" style="padding-top: 8px;">
                  <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; padding: 6px; border-radius: 8px;">
                    <span style="font-size: 8px; font-weight: 900; color: #0369a1; text-transform: uppercase; display: block; margin-bottom: 2px;">🚀 PRÓXIMA ETAPA</span>
                    <span style="font-size: 9px; font-weight: 900; color: #1e40af; text-transform: uppercase;">
                      ${prediction.label}: ${prediction.time}
                    </span>
                  </div>
                </td>
              </tr>
            ` : ''}
          </table>
        </div>
      </div>
    `;
  },

  allTripsToRichText: (trips: Trip[], allContextTrips: Trip[] = [], overrides: Record<string, ReportOverride> = {}, showCustomer: boolean = true): string => {
    if (trips.length === 0) return "";
    
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const finishedTrips = trips.filter(t => t.status === 'Viagem concluída');

    const renderTwoColumnGrid = (group: Trip[]) => {
      if (group.length === 0) return "";
      let html = '<table style="width: 100%; border-collapse: collapse;"><tr>';
      
      group.forEach((t, idx) => {
        if (idx > 0 && idx % 2 === 0) html += '</tr><tr>';
        html += `<td style="width: 50%; padding-right: 8px; vertical-align: top;">
          ${emailFormatter.toCompactRichText(t, allContextTrips, overrides[t.id], showCustomer)}
        </td>`;
      });
      
      // Fecha a última linha se sobrar uma célula
      if (group.length % 2 !== 0) html += '<td style="width: 50%;"></td>';
      
      html += '</tr></table>';
      return html;
    };

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 650px; padding: 20px; background-color: #fcfcfc;">
        <div style="margin-bottom: 20px; border-bottom: 4px solid #2563eb; padding-bottom: 12px;">
          <h2 style="margin: 0; font-size: 18px; color: #2563eb; text-transform: uppercase;">Relatório Operacional ALS</h2>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8; font-weight: bold;">POSIÇÕES EM ${emailFormatter.formatFullDate(new Date().toISOString())}</p>
        </div>
        
        <div style="margin-top: 15px; margin-bottom: 10px; padding: 6px 12px; background-color: #2563eb; border-radius: 8px;">
          <span style="color: #ffffff; font-weight: 900; font-size: 11px; text-transform: uppercase;">Cargas em Trânsito (${activeTrips.length})</span>
        </div>
        ${renderTwoColumnGrid(activeTrips)}

        ${finishedTrips.length > 0 ? `
          <div style="margin-top: 25px; margin-bottom: 10px; padding: 6px 12px; background-color: #059669; border-radius: 8px;">
            <span style="color: #ffffff; font-weight: 900; font-size: 11px; text-transform: uppercase;">Cargas Finalizadas (${finishedTrips.length})</span>
          </div>
          ${renderTwoColumnGrid(finishedTrips)}
        ` : ''}

        <div style="margin-top: 30px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <strong>ALS Transportes SSZ</strong> • Monitoramento Realtime
        </div>
      </div>
    `;
  },

  toPlainText: (trip: Trip, allTrips: Trip[] = [], override?: ReportOverride, showCustomer: boolean = true): string => {
    const history = override ? override.history : [...(trip.statusHistory || [])].filter(h => h.status !== 'Pendente');
    const pred = override ? override.prediction : predictionService.getNextStatusPrediction(trip, allTrips);

    let text = `OS: ${trip.os}${showCustomer ? ` | CLIENTE: ${trip.customer.name}` : ''}\n` +
      `CONTAINER: ${trip.container || 'A DEFINIR'}\n` +
      `MOTORISTA: ${trip.driver.name}\n` +
      `STATUS: ${trip.status.toUpperCase()}\n`;

    if (pred) {
      text += `PREVISÃO: ${pred.label.toUpperCase()} -> ${pred.time}\n`;
    }

    return text + `--------------------------\n`;
  }
};
