
import { Trip, StatusHistoryEntry } from '../types';

export const emailFormatter = {
  /**
   * Gera uma versão em HTML compacto para ser colado em e-mails.
   * Agora inclui todo o histórico de status da viagem em uma lista estruturada.
   */
  toCompactRichText: (trip: Trip): string => {
    const history = [...(trip.statusHistory || [])].sort(
      (a, b) => new Date(b.createdAt || b.dateTime).getTime() - new Date(a.createdAt || a.dateTime).getTime()
    );

    const mainColor = '#2563eb';
    const borderColor = '#e2e8f0';
    const textColor = '#1e293b';
    const subTextColor = '#64748b';

    return `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; color: ${textColor}; border: 1px solid ${borderColor}; border-radius: 12px; margin-bottom: 12px; overflow: hidden; max-width: 600px; background-color: #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background-color: #f8fafc;">
            <td style="padding: 10px 16px; border-bottom: 1px solid ${borderColor};">
              <span style="font-weight: 900; color: ${mainColor}; font-size: 14px;">OS: ${trip.os}</span>
              <span style="color: ${subTextColor}; font-size: 11px; margin-left: 8px; font-weight: bold; text-transform: uppercase;">| ${trip.customer.name}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 16px;">
              <div style="font-size: 11px; color: ${subTextColor}; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                Equipamento: <strong style="color: ${textColor};">${trip.container || 'A DEFINIR'}</strong> • 
                Motorista: <strong style="color: ${textColor};">${trip.driver.name}</strong>
              </div>
              
              <table style="width: 100%; border-collapse: collapse;">
                ${history.map((entry, idx) => `
                  <tr>
                    <td style="padding: 4px 0; width: 12px; vertical-align: top;">
                      <div style="width: 6px; height: 6px; border-radius: 50%; background-color: ${idx === 0 ? mainColor : '#cbd5e1'}; margin-top: 5px;"></div>
                    </td>
                    <td style="padding: 2px 8px; font-size: 12px; font-weight: ${idx === 0 ? '900' : 'normal'}; color: ${idx === 0 ? textColor : subTextColor}; text-transform: uppercase;">
                      ${entry.status}
                    </td>
                    <td style="padding: 2px 0; font-size: 10px; color: #94a3b8; text-align: right; font-family: monospace;">
                      ${new Date(entry.dateTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                `).join('')}
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; padding: 10px; background-color: #fcfcfc;">
        <div style="margin-bottom: 20px; border-bottom: 3px solid ${mainColor}; padding-bottom: 12px;">
          <h2 style="margin: 0; font-size: 18px; color: ${mainColor}; text-transform: uppercase; letter-spacing: 1px;">Atualizações Operacionais - ALS</h2>
          <p style="margin: 4px 0 0 0; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase;">
            Relatório consolidado gerado em ${new Date().toLocaleString('pt-BR')}
          </p>
        </div>
        ${content}
        <div style="margin-top: 20px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
          <strong>ALS Transportes SSZ</strong> • Sistema de Monitoramento em Tempo Real
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

          <h3 style="font-size: 13px; text-transform: uppercase; color: ${subTextColor}; margin-bottom: 15px; letter-spacing: 1px;">Histórico de Posições</h3>
          
          <div style="margin-left: 5px; border-left: 2px solid ${mainColor}; padding-left: 20px;">
            ${history.map((entry, idx) => `
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
