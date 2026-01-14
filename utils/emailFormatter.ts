
import { Trip, StatusHistoryEntry } from '../types';
import { predictionService } from './predictionService';

export interface ReportOverride {
  history: StatusHistoryEntry[];
  prediction: { label: string; time: string } | null;
}

export const emailFormatter = {
  /**
   * Formata data no padrão DD/MM/AAAA HH:MM
   */
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
   * Gera um card individual estilo "Premium Review" sem localidade
   */
  toCompactRichText: (trip: Trip, allTrips: Trip[] = [], override?: ReportOverride, showCustomer: boolean = true): string => {
    // Organiza histórico por data (mais recente primeiro para o relatório)
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 16px; margin-bottom: 12px; overflow: hidden; background-color: #ffffff; width: 100%; max-width: 320px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Cabeçalho Estilo Dashboard -->
        <div style="background-color: ${darkBg}; padding: 12px; border-bottom: 1px solid ${borderColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="color: #60a5fa; font-size: 8px; font-weight: 900; text-transform: uppercase;">OS:</span>
            <span style="color: #ffffff; font-size: 13px; font-weight: 900;">${trip.os}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
             <span style="color: #ffffff; background-color: #3b82f6; padding: 1px 6px; border-radius: 4px; font-family: monospace; font-size: 10px; font-weight: 900;">${trip.container || 'A DEFINIR'}</span>
          </div>
          <div style="font-size: 9px; color: #cbd5e1; font-weight: bold; text-transform: uppercase;">
            MOT: <span style="color: #60a5fa;">${trip.driver.name}</span>
          </div>
          ${showCustomer ? `<div style="margin-top: 4px; font-size: 7px; color: #64748b; font-weight: 900; text-transform: uppercase;">CLIENTE: ${trip.customer.name}</div>` : ''}
        </div>

        <!-- Histórico e Previsão com Data e Hora -->
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
                  ${emailFormatter.formatFullDate(entry.dateTime)}
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

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; padding: 20px; background-color: #fcfcfc;">
        <div style="margin-bottom: 20px; border-bottom: 4px solid #2563eb; padding-bottom: 12px;">
          <h2 style="margin: 0; font-size: 20px; color: #2563eb; text-transform: uppercase; font-weight: 900;">Relatório Operacional ALS</h2>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8; font-weight: bold;">EMISSÃO: ${emailFormatter.formatFullDate(new Date().toISOString())}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <!-- COLUNA: EM ANDAMENTO -->
            <td style="width: 50%; vertical-align: top; padding-right: 15px;">
              <div style="margin-bottom: 15px; padding: 8px 12px; background-color: #2563eb; border-radius: 8px;">
                <span style="color: #ffffff; font-weight: 900; font-size: 11px; text-transform: uppercase;">EM ANDAMENTO (${activeTrips.length})</span>
              </div>
              ${activeTrips.map(t => emailFormatter.toCompactRichText(t, allContextTrips, overrides[t.id], showCustomer)).join('')}
              ${activeTrips.length === 0 ? '<p style="font-size: 10px; color: #94a3b8; font-style: italic; text-align: center; padding: 20px;">Nenhuma carga ativa.</p>' : ''}
            </td>

            <!-- COLUNA: CONCLUÍDAS -->
            <td style="width: 50%; vertical-align: top; padding-left: 15px; border-left: 1px solid #e2e8f0;">
              <div style="margin-bottom: 15px; padding: 8px 12px; background-color: #059669; border-radius: 8px;">
                <span style="color: #ffffff; font-weight: 900; font-size: 11px; text-transform: uppercase;">CONCLUÍDAS (${finishedTrips.length})</span>
              </div>
              ${finishedTrips.map(t => emailFormatter.toCompactRichText(t, allContextTrips, overrides[t.id], showCustomer)).join('')}
              ${finishedTrips.length === 0 ? '<p style="font-size: 10px; color: #94a3b8; font-style: italic; text-align: center; padding: 20px;">Sem conclusões hoje.</p>' : ''}
            </td>
          </tr>
        </table>

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
