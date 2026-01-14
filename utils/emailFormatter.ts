
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
   * Gera o HTML de uma viagem individual usando dados reais ou substituídos (overrides)
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
    const borderColor = '#e2e8f0';
    const textColor = '#1e293b';
    const subTextColor = '#64748b';
    const predictionColor = '#0369a1';

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 12px; margin-bottom: 12px; overflow: hidden; max-width: 600px; background-color: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 16px; border-bottom: 1px solid ${borderColor};">
              <span style="font-weight: 900; color: ${mainColor}; font-size: 13px;">OS: ${trip.os}</span>
              ${showCustomer ? `<span style="color: ${subTextColor}; font-size: 10px; margin-left: 8px; font-weight: bold; text-transform: uppercase;">| ${trip.customer.name}</span>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 16px;">
              <div style="font-size: 10px; color: ${subTextColor}; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                Equipamento: <strong style="color: ${textColor};">${trip.container || 'A DEFINIR'}</strong> • 
                Motorista: <strong style="color: ${textColor};">${trip.driver.name}</strong>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                ${history.length > 0 ? history.map((entry, idx) => {
                  return `
                  <tr>
                    <td style="padding: 4px 0; width: 12px; vertical-align: top;">
                      <div style="width: 6px; height: 6px; border-radius: 50%; background-color: ${idx === 0 ? mainColor : '#cbd5e1'}; margin-top: 4px;"></div>
                    </td>
                    <td style="padding: 2px 10px; font-size: 11px; font-weight: ${idx === 0 ? '900' : 'bold'}; color: ${idx === 0 ? textColor : subTextColor}; text-transform: uppercase;">
                      ${entry.status}
                    </td>
                    <td style="padding: 2px 0; font-size: 9px; color: #94a3b8; text-align: right; font-family: 'Courier New', Courier, monospace;">
                      ${emailFormatter.formatFullDate(entry.dateTime)}
                    </td>
                  </tr>
                  ${(idx === 0 && prediction) ? `
                    <tr>
                      <td></td>
                      <td colspan="2" style="padding: 4px 10px 8px 10px;">
                        <div style="background-color: #f0f9ff; border-left: 3px solid ${predictionColor}; padding: 4px 8px; border-radius: 4px;">
                          <span style="font-size: 10px; font-weight: 900; color: ${predictionColor}; text-transform: uppercase;">
                            🚀 ${prediction.label}: <span style="font-size: 11px;">${prediction.time}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ` : ''}
                `}).join('') : `<tr><td colspan="3" style="font-size: 10px; color: #94a3b8; text-align: center; padding: 10px;">Aguardando início operacional.</td></tr>`}
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  },

  allTripsToRichText: (trips: Trip[], allContextTrips: Trip[] = [], overrides: Record<string, ReportOverride> = {}, showCustomer: boolean = true): string => {
    if (trips.length === 0) return "";
    
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const finishedTrips = trips.filter(t => t.status === 'Viagem concluída');

    const renderGroup = (title: string, group: Trip[], color: string) => {
      if (group.length === 0) return "";
      return `
        <div style="margin-top: 20px; margin-bottom: 10px; padding: 8px 16px; background-color: ${color}; border-radius: 8px;">
          <span style="color: #ffffff; font-weight: 900; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">${title} (${group.length})</span>
        </div>
        ${group.map(t => emailFormatter.toCompactRichText(t, allContextTrips, overrides[t.id], showCustomer)).join('')}
      `;
    };

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; padding: 20px; background-color: #fcfcfc;">
        <div style="margin-bottom: 24px; border-bottom: 4px solid #2563eb; padding-bottom: 12px;">
          <h2 style="margin: 0; font-size: 18px; color: #2563eb; text-transform: uppercase;">Relatório Operacional ALS</h2>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8; font-weight: bold;">POSIÇÕES EXTRAÍDAS EM ${emailFormatter.formatFullDate(new Date().toISOString())}</p>
        </div>
        
        ${renderGroup('Cargas em Trânsito', activeTrips, '#2563eb')}
        ${renderGroup('Cargas Finalizadas', finishedTrips, '#059669')}

        <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <strong>ALS Transportes SSZ</strong> • Monitoramento Realtime
        </div>
      </div>
    `;
  },

  toPlainText: (trip: Trip, allTrips: Trip[] = [], override?: ReportOverride, showCustomer: boolean = true): string => {
    const history = override 
      ? override.history 
      : [...(trip.statusHistory || [])].filter(h => h.status !== 'Pendente');

    const pred = override ? override.prediction : predictionService.getNextStatusPrediction(trip, allTrips);

    let text = `OS: ${trip.os}${showCustomer ? ` | CLIENTE: ${trip.customer.name}` : ''}\n` +
      `EQUIPAMENTO: ${trip.container || 'A DEFINIR'}\n` +
      `MOTORISTA: ${trip.driver.name}\n` +
      `STATUS ATUAL: ${trip.status.toUpperCase()}\n`;

    if (pred) {
      text += `PREVISÃO: ${pred.label.toUpperCase()} -> ${pred.time}\n`;
    }

    return text + `--------------------------\n`;
  }
};
