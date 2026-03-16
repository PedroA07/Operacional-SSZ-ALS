import { db } from '../utils/storage';
import { Trip, Automation, EmailTemplate } from '../types';
import { getEnv } from '../utils/env';

/**
 * Serviço de Automação da ALS Transportes
 * Responsável por monitorar mudanças de status e disparar ações (E-mail/WhatsApp)
 */
export const automationService = {
  /**
   * Dispara as automações vinculadas a um novo status de viagem
   */
  triggerAutomation: async (trip: Trip, newStatus: string) => {
    try {
      console.log(`[Automation] Verificando automações para status: ${newStatus} (Viagem: ${trip.os})`);
      
      // 1. Busca automações ativas para este status
      const allAutomations = await db.getAutomations();
      const activeAutomations = allAutomations.filter(a => a.status === newStatus && a.isActive);

      if (activeAutomations.length === 0) {
        console.log(`[Automation] Nenhuma automação ativa encontrada para o status: ${newStatus}`);
        return;
      }

      // 2. Processa cada automação
      for (const automation of activeAutomations) {
        // Ação de E-mail
        if (automation.emailTemplateId) {
          await automationService.handleEmailAction(automation.emailTemplateId, trip);
        }

        // Ação de WhatsApp
        if (automation.whatsappGroupId) {
          await automationService.handleWhatsAppAction(automation.whatsappGroupId, trip, newStatus);
        }
      }
    } catch (error) {
      console.error('[Automation] Erro ao disparar automação:', error);
    }
  },

  /**
   * Processa e envia e-mail baseado em um template
   */
  handleEmailAction: async (templateId: string, trip: Trip) => {
    try {
      const templates = await db.getEmailTemplates();
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        console.error(`[Automation] Template de e-mail não encontrado: ${templateId}`);
        return;
      }

      const processedSubject = automationService.replaceVariables(template.subject, trip);
      const processedBody = automationService.replaceVariables(template.body, trip);

      console.log(`[Automation] Enviando e-mail: ${processedSubject}`);
      console.log(`[Automation] Para: ${template.to}${template.cc ? ' (CC: ' + template.cc + ')' : ''}`);
      
      // Integração com Resend
      const resendKey = getEnv('RESEND_API_KEY');
      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'ALS Transportes <nao-responda@als-transportes.com.br>',
            to: template.to.split(',').map(e => e.trim()),
            cc: template.cc ? template.cc.split(',').map(e => e.trim()) : [],
            subject: processedSubject,
            html: processedBody
          })
        });
      } else {
        console.warn('[Automation] RESEND_API_KEY não configurada. E-mail não enviado.');
      }
    } catch (error) {
      console.error('[Automation] Erro na ação de e-mail:', error);
    }
  },

  /**
   * Processa e envia mensagem de WhatsApp via Evolution API
   */
  handleWhatsAppAction: async (groupId: string, trip: Trip, status: string) => {
    try {
      const message = `*ALS Automação* 🚛\n\n` +
        `A viagem *OS ${trip.os}* mudou para o status: *${status}*\n` +
        `*Motorista:* ${trip.driver.name}\n` +
        `*Placa:* ${trip.driver.plateHorse}\n` +
        `*Container:* ${trip.container}\n` +
        `*Cliente:* ${trip.customer.name}\n\n` +
        `_Mensagem automática do Sistema ALS_`;

      console.log(`[Automation] Enviando WhatsApp para o grupo: ${groupId}`);
      console.log(`[Automation] Mensagem: ${message}`);

      // Integração com Evolution API
      const evoUrl = getEnv('EVOLUTION_API_URL');
      const evoKey = getEnv('EVOLUTION_API_KEY');
      const evoInstance = getEnv('EVOLUTION_INSTANCE');

      if (evoUrl && evoKey && evoInstance) {
        await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
          method: 'POST',
          headers: { 
            'apikey': evoKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number: groupId,
            text: message,
            linkPreview: false
          })
        });
      } else {
        console.warn('[Automation] Configurações da Evolution API incompletas. WhatsApp não enviado.');
      }
    } catch (error) {
      console.error('[Automation] Erro na ação de WhatsApp:', error);
    }
  },

  /**
   * Substitui variáveis {{variavel}} pelos dados da viagem
   */
  replaceVariables: (text: string, trip: Trip): string => {
    if (!text) return '';
    
    let result = text;
    const variables: Record<string, string> = {
      'os': trip.os,
      'booking': trip.booking || '',
      'container': trip.container || '',
      'motorista': trip.driver.name,
      'placa': trip.driver.plateHorse,
      'cliente': trip.customer.name,
      'destino': trip.destination?.name || '',
      'status': trip.status,
      'data': new Date(trip.dateTime).toLocaleDateString('pt-BR'),
      'hora': new Date(trip.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      'navio': trip.ship || '',
      'lacre': trip.seal || '',
      'tipo': trip.type,
      'categoria': trip.category
    };

    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'gi');
      result = result.replace(regex, value);
    });

    return result;
  }
};
