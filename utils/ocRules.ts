
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
  async processOCWorkflow(formData: any, driver: Driver, customer: Customer, user: User, destination?: Port, existingTripId?: string) {
    try {
      // 1. Prioriza a categoria selecionada manualmente no formulário. 
      // Se não houver, tenta detectar via OS.
      let finalCategory = formData.category || osCategoryService.detectCategoryFromOS(formData.os);

      if (!finalCategory) {
        throw new Error("Categoria não identificada. Por favor, selecione uma categoria válida do banco de dados.");
      }

      // 2. Sincronizar Vínculos via vinculoService
      await vinculoService.syncVinculo(finalCategory, driver, customer, user);

      // 3. Verificar se já existe uma viagem com esta OS
      const targetId = existingTripId || (await tripSyncService.findExistingTrip(formData.os))?.id;

      // 4. Mapear dados do formulário para o modelo de Viagem (Trip)
      const tripData = tripSyncService.mapOCtoTrip(
        formData, 
        driver, 
        customer, 
        finalCategory, 
        destination
      );

      // 5. Salvar no Banco de Dados (Upsert)
      const finalTrip = await tripSyncService.sync(tripData, targetId, user);

      // 6. Registrar Notificação no Sistema
      await db.addNotification(
        user, 
        'OC_GENERATED', 
        `OC Digital: OS ${formData.os}`, 
        `Viagem vinculada à categoria ${finalCategory.toUpperCase()}. Registro sincronizado por ${user.displayName}.`,
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
      throw error;
    }
  }
};
