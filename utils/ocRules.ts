
import { Trip, Driver, Customer, Port, User } from '../types';
import { db } from './storage';
import { osCategoryService } from './osCategoryService';
import { tripSyncService } from './tripSyncService';
import { vinculoService } from './vinculoService';

/**
 * REGRAS DE NEGÓCIO: FLUXO DE EMISSÃO DE OC -> VIAGEM
 */
export const ocRules = {
  /**
   * Processa todo o workflow operacional disparado pela criação de uma OC
   */
  async processOCWorkflow(formData: any, driver: Driver, customer: Customer, user: User, destination?: Port) {
    try {
      // 1. Detectar Categoria baseada no padrão da OS (ALC ou SP) ou usar a manual do formulário
      const detectedCategory = formData.category || osCategoryService.detectCategoryFromOS(formData.os) || 'Geral';

      // 2. Sincronizar Vínculos via vinculoService (Cria categoria se não existir)
      await vinculoService.syncVinculo(detectedCategory, driver, customer, user);

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
