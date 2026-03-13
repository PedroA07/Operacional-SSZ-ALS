
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
   * Gera o HTML de um card individual de viagem
   */
  renderTripCard: (trip: Trip, allTrips: Trip[], override?: ReportOverride, showCustomer: boolean = false): string => {
    const history = override 
      ? [...override.history].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      : [...(trip.statusHistory || [])]
          .filter(entry => entry.status !== 'Pendente')
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const prediction = override 
      ? override.prediction 
      : predictionService.getNextStatusPrediction(trip, allTrips);

    const isFinished = trip.isCompleted || trip.status === 'Viagem concluída';
    const mainColor = isFinished ? '#059669' : '#2563eb';
    const headerBg = '#0f172a';

    return `
      <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: left;">
        <!-- Header do Card -->
        <div style="background-color: ${headerBg}; padding: 12px; color: #ffffff;">
          <table style="width: 100%;">
            <tr>
              <td style="text-align: left;">
                <span style="font-size: 8px; font-weight: 900; color: #60a5fa; text-transform: uppercase; display: block; margin-bottom: 2px;">ORDEM DE SERVIÇO</span>
                <span style="font-size: 14px; font-weight: 900; letter-spacing: -0.5px;">${trip.os}</span>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <span style="background-color: ${mainColor}; color: #ffffff; padding: 2px 6px; border-radius: 6px; font-size: 9px; font-weight: 900; text-transform: uppercase;">
                  ${trip.container || 'S/ EQUIP.'}
                </span>
              </td>
            </tr>
          </table>
          <div style="margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
            <span style="font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">MOT: <span style="color: #ffffff;">${trip.driver.name}</span></span>
            ${showCustomer ? `
              <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-top: 2px;">
                CLIENTE: ${trip.customer.name}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Conteúdo / Cronologia -->
        <div style="padding: 12px; background-color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
            ${history.map((entry, idx) => `
              <tr>
                <td style="width: 10px; vertical-align: middle;">
                  <div style="width: 4px; height: 4px; border-radius: 50%; background-color: ${idx === history.length - 1 ? mainColor : '#cbd5e1'};"></div>
                </td>
                <td style="padding: 3px 8px; font-size: 10px; font-weight: ${idx === history.length - 1 ? '900' : 'bold'}; color: ${idx === history.length - 1 ? '#1e293b' : '#64748b'}; text-transform: uppercase;">
                  ${entry.status}
                </td>
                <td style="padding: 3px 0; font-size: 8px; color: #94a3b8; text-align: right; font-family: monospace;">
                  ${new Date(entry.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            `).join('')}
            
            ${!isFinished && prediction ? `
              <tr>
                <td colspan="3" style="padding-top: 10px;">
                  <div style="background-color: #eff6ff; border: 1px dashed #bfdbfe; padding: 8px; border-radius: 10px; text-align: center;">
                    <span style="font-size: 8px; font-weight: 900; color: #3b82f6; text-transform: uppercase; display: block; margin-bottom: 2px;">🚀 PRÓXIMA ATUALIZAÇÃO</span>
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

  /**
   * Gera o HTML completo em duas colunas
   */
  allTripsToRichText: (trips: Trip[], allContextTrips: Trip[] = [], overrides: Record<string, ReportOverride> = {}, showCustomer: boolean = false): string => {
    if (trips.length === 0) return "";
    
    const activeTrips = trips.filter(t => !t.isCompleted && t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const finishedTrips = trips.filter(t => t.isCompleted || t.status === 'Viagem concluída');

    return `
      <div style="background-color: #f8fafc; padding: 20px; font-family: sans-serif; text-align: left;">
        <div style="max-width: 800px; margin: 0; background-color: #ffffff; border-radius: 24px; padding: 30px; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); text-align: left;">
          
          <!-- Cabeçalho ALS -->
          <div style="border-bottom: 4px solid #2563eb; padding-bottom: 15px; margin-bottom: 25px;">
            <table style="width: 100%;">
              <tr>
                <td style="text-align: left;">
                  <h2 style="margin: 0; font-size: 22px; color: #1e293b; text-transform: uppercase; font-weight: 900;">Relatório Operacional ALS</h2>
                  <p style="margin: 5px 0 0 0; font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                    Guarujá/SP • Emissão: ${emailFormatter.formatFullDate(new Date().toISOString())}
                  </p>
                </td>
                <td style="text-align: right; vertical-align: middle;">
                   <div style="background-color: #2563eb; color: #ffffff; padding: 10px 15px; border-radius: 12px; font-weight: 900; font-style: italic; display: inline-block;">ALS</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Tabela de Duas Colunas -->
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <!-- Coluna: Em Andamento -->
              <td style="width: 50%; vertical-align: top; padding-right: 15px; text-align: left;">
                <div style="background-color: #2563eb; color: #ffffff; padding: 8px 12px; border-radius: 10px; margin-bottom: 15px;">
                  <span style="font-size: 11px; font-weight: 900; text-transform: uppercase;">EM CURSO (${activeTrips.length})</span>
                </div>
                ${activeTrips.map(t => emailFormatter.renderTripCard(t, allContextTrips, overrides[t.id], showCustomer)).join('')}
                ${activeTrips.length === 0 ? '<div style="text-align: center; color: #94a3b8; font-size: 10px; padding: 20px;">Nenhuma viagem ativa.</div>' : ''}
              </td>

              <!-- Coluna: Concluídas -->
              <td style="width: 50%; vertical-align: top; padding-left: 15px; border-left: 1px solid #f1f5f9; text-align: left;">
                <div style="background-color: #059669; color: #ffffff; padding: 8px 12px; border-radius: 10px; margin-bottom: 15px;">
                  <span style="font-size: 11px; font-weight: 900; text-transform: uppercase;">CONCLUÍDAS (${finishedTrips.length})</span>
                </div>
                ${finishedTrips.map(t => emailFormatter.renderTripCard(t, allContextTrips, overrides[t.id], showCustomer)).join('')}
                ${finishedTrips.length === 0 ? '<div style="text-align: center; color: #94a3b8; font-size: 10px; padding: 20px;">Sem conclusões hoje.</div>' : ''}
              </td>
            </tr>
          </table>

          <div style="margin-top: 40px; border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center;">
            <p style="margin: 0; font-size: 9px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
              ALS Transportes • Guarujá/SP • Real-time Monitoring
            </p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Formato texto puro (para WhatsApp sem suporte a HTML)
   */
  toPlainText: (trip: Trip, allTrips: Trip[] = [], override?: ReportOverride, showCustomer: boolean = false): string => {
    const history = override ? override.history : [...(trip.statusHistory || [])].filter(h => h.status !== 'Pendente');
    const pred = override ? override.prediction : predictionService.getNextStatusPrediction(trip, allTrips);

    let text = `*OS: ${trip.os}*${showCustomer ? ` | CLIENTE: ${trip.customer.name}` : ''}\n` +
      `CONTAINER: ${trip.container || 'A DEFINIR'}\n` +
      `MOTORISTA: ${trip.driver.name}\n` +
      `STATUS: ${trip.status.toUpperCase()}\n`;

    if (pred) {
      text += `PREVISÃO: ${pred.label.toUpperCase()} -> ${pred.time}\n`;
    }

    return text + `--------------------------\n`;
  }
};
