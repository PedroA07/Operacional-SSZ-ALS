
import { Trip, StatusHistoryEntry } from '../types';
import { ReportOverride } from './emailFormatter';
import { predictionService } from './predictionService';

export const reportGenerator = {
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
   * Renderiza o Card de Viagem em HTML (Estilo Modal Premium)
   */
  renderTripCardHTML: (trip: Trip, allTrips: Trip[], override?: ReportOverride, showCustomer: boolean = false): string => {
    // Organiza histórico: Mais recente no topo
    const history = override 
      ? [...override.history].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      : [...(trip.statusHistory || [])]
          .filter(entry => entry.status !== 'Pendente')
          .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    const prediction = override 
      ? override.prediction 
      : predictionService.getNextStatusPrediction(trip, allTrips);

    const isFinished = trip.status === 'Viagem concluída';
    const mainColor = isFinished ? '#059669' : '#2563eb';
    const headerBg = '#0f172a';

    return `
      <div style="margin-bottom: 15px; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; background-color: #ffffff; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <div style="background-color: ${headerBg}; padding: 15px; color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: top;">
                <span style="font-size: 8px; font-weight: 900; color: #60a5fa; text-transform: uppercase; display: block; margin-bottom: 2px;">ORDEM DE SERVIÇO</span>
                <span style="font-size: 15px; font-weight: 900; letter-spacing: -0.5px;">${trip.os}</span>
              </td>
              <td style="text-align: right; vertical-align: top;">
                <span style="background-color: ${mainColor}; color: #ffffff; padding: 3px 8px; border-radius: 8px; font-size: 10px; font-weight: 900; font-family: monospace;">
                  ${trip.container || 'S/ EQUIP.'}
                </span>
              </td>
            </tr>
          </table>
          <div style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
            <div style="font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">MOT: <span style="color: #ffffff;">${trip.driver.name}</span></div>
            ${showCustomer ? `
              <div style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-top: 4px; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px; width: fit-content;">
                CLIENTE: ${trip.customer.name}
              </div>
            ` : ''}
          </div>
        </div>

        <div style="padding: 15px; background-color: #ffffff;">
          <table style="width: 100%; border-collapse: collapse;">
            ${history.map((entry, idx) => `
              <tr>
                <td style="width: 12px; vertical-align: middle;">
                  <div style="width: 5px; height: 5px; border-radius: 50%; background-color: ${idx === 0 ? mainColor : '#cbd5e1'};"></div>
                </td>
                <td style="padding: 4px 10px; font-size: 10px; font-weight: ${idx === 0 ? '900' : 'bold'}; color: ${idx === 0 ? '#1e293b' : '#64748b'}; text-transform: uppercase;">
                  ${entry.status}
                </td>
                <td style="padding: 4px 0; font-size: 8px; color: #94a3b8; text-align: right; font-family: monospace; font-weight: bold;">
                  ${reportGenerator.formatFullDate(entry.dateTime)}
                </td>
              </tr>
            `).join('')}
            
            ${!isFinished && prediction ? `
              <tr>
                <td colspan="3" style="padding-top: 12px;">
                  <div style="background-color: #f0f7ff; border: 1px dashed #3b82f6; padding: 10px; border-radius: 12px; text-align: center;">
                    <span style="font-size: 8px; font-weight: 900; color: #3b82f6; text-transform: uppercase; display: block; margin-bottom: 3px;">🚀 PRÓXIMA ATUALIZAÇÃO</span>
                    <span style="font-size: 10px; font-weight: 900; color: #1e40af; text-transform: uppercase;">
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
   * Gera o Relatório Completo em 2 Colunas (HTML)
   */
  generateFullReportHTML: (trips: Trip[], allContextTrips: Trip[], overrides: Record<string, ReportOverride>, showCustomer: boolean = false): string => {
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída' && t.status !== 'Viagem cancelada');
    const finishedTrips = trips.filter(t => t.status === 'Viagem concluída');

    return `
      <div style="background-color: #f1f5f9; padding: 30px; font-family: 'Segoe UI', Tahoma, sans-serif; text-align: left;">
        <div style="max-width: 850px; margin: 0; background-color: #ffffff; border-radius: 35px; padding: 40px; border: 1px solid #e2e8f0; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); text-align: left;">
          
          <table style="width: 100%; border-bottom: 4px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px;">
            <tr>
              <td style="text-align: left;">
                <h2 style="margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; font-weight: 900;">Relatório Operacional</h2>
                <p style="margin: 5px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">
                  ALS Transportes • Emissão: ${reportGenerator.formatFullDate(new Date().toISOString())}
                </p>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                 <div style="background-color: #2563eb; color: #ffffff; padding: 12px 20px; border-radius: 15px; font-weight: 900; font-style: italic; font-size: 18px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">ALS</div>
              </td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <tr>
              <!-- COLUNA 1: EM ANDAMENTO -->
              <td style="width: 50%; vertical-align: top; padding-right: 20px; text-align: left;">
                <div style="background-color: #2563eb; color: #ffffff; padding: 10px 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
                  <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Em curso (${activeTrips.length})</span>
                </div>
                ${activeTrips.map(t => reportGenerator.renderTripCardHTML(t, allContextTrips, overrides[t.id], showCustomer)).join('')}
                ${activeTrips.length === 0 ? '<div style="text-align: center; color: #94a3b8; font-size: 11px; padding: 40px; font-style: italic;">Nenhuma viagem ativa no momento.</div>' : ''}
              </td>

              <!-- COLUNA 2: CONCLUÍDAS -->
              <td style="width: 50%; vertical-align: top; padding-left: 20px; border-left: 2px solid #f1f5f9; text-align: left;">
                <div style="background-color: #059669; color: #ffffff; padding: 10px 15px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                  <span style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Concluídas (${finishedTrips.length})</span>
                </div>
                ${finishedTrips.map(t => reportGenerator.renderTripCardHTML(t, allContextTrips, overrides[t.id], showCustomer)).join('')}
                ${finishedTrips.length === 0 ? '<div style="text-align: center; color: #94a3b8; font-size: 11px; padding: 40px; font-style: italic;">Nenhuma conclusão registrada hoje.</div>' : ''}
              </td>
            </tr>
          </table>

          <div style="margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 25px; text-align: center;">
            <p style="margin: 0; font-size: 9px; color: #94a3b8; font-weight: 900; text-transform: uppercase; letter-spacing: 3px;">
              ALS Transportes • Guarujá/SP • Monitoramento em Tempo Real
            </p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Gera versão em texto simples
   */
  generatePlainText: (trips: Trip[], overrides: Record<string, ReportOverride>, showCustomer: boolean = false): string => {
    return trips.map(t => {
      const ovr = overrides[t.id];
      const history = ovr ? ovr.history : (t.statusHistory || []);
      const latest = [...history].sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())[0];
      
      let str = `*OS: ${t.os}* [${t.container || 'S/ EQUIP'}]\n`;
      if (showCustomer) str += `CLIENTE: ${t.customer.name}\n`;
      str += `MOTORISTA: ${t.driver.name}\n`;
      str += `STATUS: ${latest?.status || t.status} (${reportGenerator.formatFullDate(latest?.dateTime || t.dateTime)})\n`;
      
      const pred = ovr?.prediction || predictionService.getNextStatusPrediction(t, trips);
      if (pred) str += `PREVISÃO: ${pred.label} -> ${pred.time}\n`;
      
      return str + `--------------------------`;
    }).join('\n');
  }
};
