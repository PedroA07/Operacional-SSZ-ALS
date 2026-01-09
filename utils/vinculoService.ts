
import { Driver, Customer, Category, User } from '../types';
import { db } from './storage';

export const vinculoService = {
  /**
   * Garante que o vínculo (categoria) exista no banco e sincroniza com os envolvidos
   */
  async syncVinculo(categoryName: string, driver: Driver, customer: Customer, actingUser: User) {
    if (!categoryName || categoryName === 'Geral' || categoryName === 'Indefinido') return;

    const normalizedName = categoryName.trim().toUpperCase();

    // 1. Garantir que a Categoria exista na lista global do sistema
    const allCategories = await db.getCategories();
    const categoryExists = allCategories.some(c => c.name.toUpperCase() === normalizedName);

    if (!categoryExists) {
      await db.saveCategory({
        id: `cat-auto-${Date.now()}`,
        name: categoryName.trim()
      }, actingUser);
      // Disparar um refresh global silencioso para outros componentes
      window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
    }

    // 2. Sincronizar Operação no Motorista
    const currentDrivers = await db.getDrivers();
    const dbDriver = currentDrivers.find(d => d.id === driver.id);
    if (dbDriver) {
      const hasOp = (dbDriver.operations || []).some(op => 
        op.category.toUpperCase() === normalizedName && 
        op.client.toUpperCase() === customer.name.toUpperCase()
      );

      if (!hasOp) {
        const updatedDriver = {
          ...dbDriver,
          operations: [
            ...(dbDriver.operations || []), 
            { category: categoryName.trim(), client: customer.name.trim() }
          ]
        };
        await db.saveDriver(updatedDriver);
      }
    }

    // 3. Sincronizar Operação no Cliente
    const currentCustomers = await db.getCustomers();
    const dbCust = currentCustomers.find(c => c.id === customer.id);
    if (dbCust) {
      const currentOps = dbCust.operations || [];
      const hasOp = currentOps.some(op => op.toUpperCase() === normalizedName);

      if (!hasOp) {
        const updatedCust = {
          ...dbCust,
          operations: [...currentOps, categoryName.trim()]
        };
        await db.saveCustomer(updatedCust);
      }
    }
  }
};
