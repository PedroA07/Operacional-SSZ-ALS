
import { Trip } from '../types';

export const emailFormatter = {
  /**
   * Gera uma versão em HTML compacto para ser colado em e-mails.
   * Ideal para quando o e-mail contém múltiplas atualizações.
   */
  toCompactRichText: (trip: Trip): string => {
    const lastStatus = [...(trip.statusHistory || [])].sort(
      (a, b) => new Date(b.createdAt || b.dateTime).getTime() - new Date(a.createdAt || a.dateTime).getTime()
    )[0];

    const mainColor = '#2563eb';
    const borderColor = '#e2e8f0';
    const textColor = '#1e293b';
    const subTextColor = '#64748b';

    return `
      <div style="font-family: sans-serif; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 8px; margin-bottom: 8px; overflow: hidden; max-width: 600px; background-color: #ffffff;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 8px 12px; border-bottom: 1px solid ${borderColor};">
              <span style="font-weight: 900; color: ${mainColor}; font-size: 13px;">OS: ${trip.os}</span>
              <span style="color: ${subTextColor}; font-size: 11px; margin-left: 8px;">| ${trip.customer.name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 12px;">
              <table style="width: 100%;">
                <tr>
                  <td style="font-size: 12px;">
                    <strong>Status:</strong> <span style="color: ${mainColor}; text-transform: uppercase;">${trip.status}</span>
                  </td>
                  <td style="font-size: 11px; color: ${subTextColor}; text-align: right;">
                    ${new Date(lastStatus?.dateTime || trip.dateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="font-size: 11px; padding-top: 4px; color: ${subTextColor};">
                    Equipamento: <strong>${trip.container || 'A DEFINIR'}</strong> • Motorista: ${trip.driver.name}
                  </td>
                </tr>
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
  allTripsToRichText: (trips: Trip[]): string => {
    if (trips.length === 0) return "";
    
    const mainColor = '#2563eb';
    const content = trips.map(t => emailFormatter.toCompactRichText(t)).join('');

    return `
      <div style="font-family: sans-serif; max-width: 600px;">
        <div style="margin-bottom: 15px; border-bottom: 2px solid ${mainColor}; padding-bottom: 8px;">
          <h2 style="margin: 0; font-size: 16px; color: ${mainColor}; text-transform: uppercase;">Relatório de Status - ALS Transportes</h2>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
        ${content}
        <div style="margin-top: 15px; text-align: center; font-size: 9px; color: #94a3b8;">
          ALS Transportes SSZ - Sistema de Monitoramento Operacional
        </div>
      </div>
    `;
  },

  /**
   * Gera uma versão em HTML rico completo (original)
   */
  toRichText: (trip: Trip): string => {
    const history = [...(trip.statusHistory || [])].sort(
      (a, b) => new Date(b.createdAt || b.dateTime).getTime() - new Date(a.createdAt || a.dateTime).getTime()
    );

    const mainColor = '#2563eb';
    const borderColor = '#e2e8f0';
    const textColor = '#1e293b';
    const subTextColor = '#64748b';

    return `
      <div style="font-family: sans-serif; color: ${textColor}; line-height: 1.6; max-width: 600px; border: 1px solid ${borderColor}; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: ${mainColor}; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">Atualização de Transporte - ALS</h2>
        </div>
        
        <div style="padding: 24px;">
          <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed ${borderColor};">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0;"><strong style="color: ${mainColor}; font-size: 11px; text-transform: uppercase;">Ordem de Serviço:</strong></td>
                <td style="padding: 4px 0; text-align: right;"><span style="font-weight: 900; font-size: 16px;">${trip.os}</span></td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong style="color: ${mainColor}; font-size: 11px; text-transform: uppercase;">Cliente:</strong></td>
                <td style="padding: 4px 0; text-align: right;"><span style="font-weight: bold; text-transform: uppercase;">${trip.customer.name}</span></td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong style="color: ${mainColor}; font-size: 11px; text-transform: uppercase;">Equipamento:</strong></td>
                <td style="padding: 4px 0; text-align: right;"><span style="font-family: monospace; font-weight: bold;">${trip.container || 'A DEFINIR'}</span></td>
              </tr>
              <tr>
                <td style="padding: 4px 0;"><strong style="color: ${mainColor}; font-size: 11px; text-transform: uppercase;">Motorista:</strong></td>
                <td style="padding: 4px 0; text-align: right;">${trip.driver.name} (${trip.driver.plateHorse})</td>
              </tr>
            </table>
          </div>

          <h3 style="font-size: 13px; text-transform: uppercase; color: ${subTextColor}; margin-bottom: 15px; letter-spacing: 1px;">Status Atual: <span style="color: ${mainColor};">${trip.status}</span></h3>
          
          <div style="margin-left: 5px; border-left: 2px solid ${mainColor}; padding-left: 20px;">
            ${history.slice(0, 5).map((entry, idx) => `
              <div style="margin-bottom: 10px; position: relative;">
                <div style="position: absolute; left: -26px; top: 4px; width: 10px; height: 10px; background-color: ${idx === 0 ? mainColor : '#cbd5e1'}; border-radius: 50%; border: 2px solid #ffffff;"></div>
                <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; color: ${idx === 0 ? mainColor : textColor};">${entry.status}</div>
                <div style="font-size: 10px; color: ${subTextColor};">${new Date(entry.dateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            `).join('')}
          </div>

          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid ${borderColor}; text-align: center;">
            <p style="font-size: 10px; color: ${subTextColor}; margin: 0; text-transform: uppercase; font-weight: bold;">
              ALS Transportes - Sistema de Monitoramento em Tempo Real
            </p>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Gera uma versão em texto simples
   */
  toPlainText: (trip: Trip): string => {
    const history = [...(trip.statusHistory || [])].sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
    );

    return `STATUS DE VIAGEM - ALS\n` +
      `--------------------------\n` +
      `OS: ${trip.os}\n` +
      `Cliente: ${trip.customer.name}\n` +
      `Equipamento: ${trip.container || 'A DEFINIR'}\n` +
      `Motorista: ${trip.driver.name} (${trip.driver.plateHorse})\n\n` +
      `HISTÓRICO:\n` +
      history.map(h => `- ${h.status.toUpperCase()}: ${new Date(h.dateTime).toLocaleString('pt-BR')}`).join('\n');
  }
};
