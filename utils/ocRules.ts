
import { Trip, Driver, Customer, Port, User } from '../types';
import { db } from './storage';
import { osCategoryService } from './osCategoryService';
import { tripSyncService } from './tripSyncService';

/**
 * REGRAS DE NEGÓCIO: FLUXO DE EMISSÃO DE OC -> VIAGEM
 * Este serviço garante que ao emitir um documento de OC, o sistema:
 * 1. Identifique a categoria pela OS
 * 2. Vincule motorista/cliente a essa categoria
 * 3. Crie/Atualize a viagem no dashboard de operações
 * 4. Notifique a equipe
 */
export const ocRules = {
  /**
   * Processa todo o workflow operacional disparado pela criação de uma OC
   */
  async processOCWorkflow(formData: any, driver: Driver, customer: Customer, user: User, destination?: Port) {
    try {
      // 1. Detectar Categoria baseada no padrão da OS (ALC ou SP)
      const detectedCategory = osCategoryService.detectCategoryFromOS(formData.os) || 'Geral';

      // 2. Sincronizar Vínculos (Garante que o motorista apareça nos filtros da categoria)
      await osCategoryService.syncVinculos(detectedCategory, driver, customer);

      // 3. Verificar se já existe uma viagem com esta OS
      const existingTrip = await tripSyncService.findExistingTrip(formData.os);

      // 4. Mapear dados do formulário para o modelo de Viagem (Trip)
      const tripData = tripSyncService.mapOCtoTrip(
        formData, 
        driver, 
        customer, 
        detectedCategory, 
        destination
      );

      // 5. Salvar no Banco de Dados (Upsert)
      const finalTrip = await tripSyncService.sync(tripData, existingTrip?.id);

      // 6. Registrar Notificação no Sistema
      await db.addNotification(
        user, 
        'OC_GENERATED', 
        `OC Digital: OS ${formData.os}`, 
        `Viagem alocada para ${driver.name}. Documento gerado por ${user.displayName}.`,
        { 
          os: formData.os, 
          motorista: driver.name, 
          placa: driver.plateHorse, 
          cliente: customer.name 
        }
      );

      return { success: true, trip: finalTrip };
    } catch (error) {
      console.error("Erro na regra de negócio OC -> Viagem:", error);
      return { success: false, error };
    }
  }
};
