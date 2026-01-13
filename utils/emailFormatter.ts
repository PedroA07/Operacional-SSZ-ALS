
import { Trip, StatusHistoryEntry } from '../types';
import { predictionService } from './predictionService';

export const emailFormatter = {
  /**
   * Gera uma versão em HTML compacto para ser colado em e-mails.
   * Inclui todo o histórico de status (exceto Pendente) e a PREVISÃO inteligente.
   */
  toCompactRichText: (trip: Trip, allTrips: Trip[] = []): string => {
    // Filtra o status "Pendente" e ordena do mais recente para o mais antigo
    const history = [...(trip.statusHistory || [])]
      .filter(entry => entry.status !== 'Pendente')
      .sort((a, b) => new Date(b.createdAt || b.dateTime).getTime() - new Date(a.createdAt || a.dateTime).getTime());

    const prediction = predictionService.getNextStatusPrediction(trip, allTrips);

    const mainColor = '#2563eb';
    const borderColor = '#e2e8f0';
    const textColor = '#1e293b';
    const subTextColor = '#64748b';
    const predictionColor = '#0369a1';

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 12px; margin-bottom: 16px; overflow: hidden; max-width: 600px; background-color: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 12px 16px; border-bottom: 1px solid ${borderColor};">
              <span style="font-weight: 900; color: ${mainColor}; font-size: 14px;">OS: ${trip.os}</span>
              <span style="color: ${subTextColor}; font-size: 11px; margin-left: 8px; font-weight: bold; text-transform: uppercase;">| ${trip.customer.name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px;">
              <div style="font-size: 11px; color: ${subTextColor}; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                Equipamento: <strong style="color: ${textColor};">${trip.container || 'A DEFINIR'}</strong> • 
                Motorista: <strong style="color: ${textColor};">${trip.driver.name}</strong>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                ${history.length > 0 ? history.map((entry, idx) => {
                  const displayDate = new Date(entry.dateTime);

                  return `
                  <tr>
                    <td style="padding: 6px 0; width: 14px; vertical-align: top;">
                      <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${idx === 0 ? mainColor : '#cbd5e1'}; margin-top: 4px; border: 2px solid #fff; box-shadow: 0 0 0 1px ${idx === 0 ? mainColor : '#e2e8f0'};"></div>
                    </td>
                    <td style="padding: 4px 12px; font-size: 12px; font-weight: ${idx === 0 ? '900' : 'bold'}; color: ${idx === 0 ? textColor : subTextColor}; text-transform: uppercase;">
                      ${entry.status}
                    </td>
                    <td style="padding: 4px 0; font-size: 10px; color: #94a3b8; text-align: right; font-family: 'Courier New', Courier, monospace; font-weight: bold;">
                      ${displayDate.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                  ${(idx === 0 && prediction) ? `
                    <tr>
                      <td></td>
                      <td colspan="2" style="padding: 2px 12px 10px 12px;">
                        <div style="background-color: #f0f9ff; border-left: 3px solid ${predictionColor}; padding: 6px 10px; border-radius: 4px;">
                          <span style="font-size: 10px; font-weight: 900; color: ${predictionColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                            🚀 ${prediction.label}: <span style="font-size: 12px;">${prediction.time}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  ` : ''}
                `}).join('') : `<tr><td colspan="3" style="font-size: 11px; color: #94a3b8; text-align: center; padding: 20px;">Aguardando início operacional.</td></tr>`}
              </table>
            </td>
          </tr>
        </table>
      </div>
    `;
  },

  /**
   * Gera um bloco único contendo o status de várias viagens.
   */
  allTripsToRichText: (visibleTrips: Trip[], allContextTrips: Trip[] = []): string => {
    if (visibleTrips.length === 0) return "";
    
    const mainColor = '#2563eb';
    const content = visibleTrips.map(t => emailFormatter.toCompactRichText(t, allContextTrips)).join('');

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; padding: 10px; background-color: #fcfcfc;">
        <div style="margin-bottom: 24px; border-bottom: 4px solid ${mainColor}; padding-bottom: 12px;">
          <h2 style="margin: 0; font-size: 20px; color: ${mainColor}; text-transform: uppercase; letter-spacing: 1px;">Relatório de Posições ALS Transportes</h2>
          <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            Dados extraídos em ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
        ${content}
        <div style="margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <strong style="color: ${mainColor};">ALS Transportes SSZ</strong><br>
          Sistema de Monitoramento e Controle de Cargas em Tempo Real
        </div>
      </div>
    `;
  },

  /**
   * Texto simples para fallback
   */
  toPlainText: (trip: Trip, allTrips: Trip[] = []): string => {
    // Filtra o status "Pendente"
    const history = [...(trip.statusHistory || [])]
      .filter(h => h.status !== 'Pendente')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const pred = predictionService.getNextStatusPrediction(trip, allTrips);

    let text = `OS: ${trip.os} | CLIENTE: ${trip.customer.name}\n` +
      `EQUIPAMENTO: ${trip.container || 'A DEFINIR'} | MOTORISTA: ${trip.driver.name}\n` +
      `HISTÓRICO:\n` +
      (history.length > 0 ? history.map(h => {
        const displayDate = new Date(h.dateTime);
        return `- ${h.status.toUpperCase()}: ${displayDate.toLocaleString('pt-BR')}`;
      }).join('\n') : '- AGUARDANDO INÍCIO OPERACIONAL');

    if (pred) {
      text += `\n>> ${pred.label.toUpperCase()}: ${pred.time}`;
    }

    return text + `\n--------------------------\n`;
  }
};
