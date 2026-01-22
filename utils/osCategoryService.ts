
import { Driver, Customer } from '../types';
import { db as database } from './storage';

export const osCategoryService = {
  /**
   * Detecta a categoria baseada nos padrões de OS solicitados:
   * Aliança: numero+ALC+serie_numeros+A
   * Mercosul: numero+SP+serie_numeros+A
   */
  detectCategoryFromOS: (os: string): string | null => {
    const cleanOS = os.toUpperCase().trim();
    
    // Padrão Aliança: [números] + ALC + [números] + A
    const aliancaRegex = /^[0-9]*ALC[0-9]+A$/;
    if (aliancaRegex.test(cleanOS)) return 'Aliança';

    // Padrão Mercosul: [números] + SP + [números] + A
    const mercosulRegex = /^[0-9]*SP[0-9]+A$/;
    if (mercosulRegex.test(cleanOS)) return 'Mercosul';

    return null;
  },

  /**
   * Sincroniza os vínculos do Motorista e do Cliente com a nova categoria
   */
  syncVinculos: async (category: string, driver: any, customer: any) => {
    if (!category || category === 'Nenhum') return;

    const normalizedCategory = category.trim().toUpperCase();
    const clientName = (customer?.name || '').trim().toUpperCase();

    if (!clientName) return;

    if (driver && driver.id) {
      const currentDrivers = await database.getDrivers();
      const dbDriver = currentDrivers.find(d => d.id === driver.id);
      
      if (dbDriver) {
        const hasOp = (dbDriver.operations || []).some(op => 
          op.category.toUpperCase() === normalizedCategory && 
          op.client.toUpperCase() === clientName
        );

        if (!hasOp) {
          const updatedDriver = {
            ...dbDriver,
            operations: [
              ...(dbDriver.operations || []), 
              { category: category.trim(), client: (customer?.name || 'Cliente').trim() }
            ]
          };
          await database.saveDriver(updatedDriver);
        }
      }
    }

    if (customer && customer.id) {
      const currentCustomers = await database.getCustomers();
      const dbCust = currentCustomers.find(c => c.id === customer.id);

      if (dbCust) {
        const currentOps = dbCust.operations || [];
        const hasOp = currentOps.some(op => op.toUpperCase() === normalizedCategory);

        if (!hasOp) {
          const updatedCust = {
            ...dbCust,
            operations: [...currentOps, category.trim()]
          };
          await database.saveCustomer(updatedCust);
        }
      }
    }
  }
};
