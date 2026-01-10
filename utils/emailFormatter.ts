
import { Trip } from '../types';

export const emailFormatter = {
  /**
   * Gera uma versão em HTML formatado para ser colado em e-mails (Outlook/Gmail)
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
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: ${textColor}; line-height: 1.6; max-width: 600px; border: 1px solid ${borderColor}; border-radius: 16px; overflow: hidden; background-color: #ffffff;">
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

          <h3 style="font-size: 13px; text-transform: uppercase; color: ${subTextColor}; margin-bottom: 15px; letter-spacing: 1px;">Linha do Tempo (Status)</h3>
          
          <div style="margin-left: 5px; border-left: 2px solid ${mainColor}; padding-left: 20px;">
            ${history.map((entry, idx) => `
              <div style="margin-bottom: 15px; position: relative;">
                <div style="position: absolute; left: -26px; top: 4px; width: 10px; height: 10px; background-color: ${idx === 0 ? mainColor : '#cbd5e1'}; border-radius: 50%; border: 2px solid #ffffff;"></div>
                <div style="font-weight: 900; font-size: 13px; text-transform: uppercase; color: ${idx === 0 ? mainColor : textColor};">${entry.status}</div>
                <div style="font-size: 11px; color: ${subTextColor};">${new Date(entry.dateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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
