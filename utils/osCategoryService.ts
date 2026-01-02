
// Fixed: Removed 'db' from '../types' import as it doesn't exist there and is already imported as 'database' from './storage'.
import { Driver, Customer } from '../types';
import { db as database } from './storage';

export const osCategoryService = {
  /**
   * Detecta a categoria baseada nos padrões de OS solicitados
   */
  detectCategoryFromOS: (os: string): string | null => {
    const cleanOS = os.toUpperCase().trim();
    
    // Padrão Aliança: (número) + ALC + (7 números) + A
    const aliancaRegex = /^[0-9]*ALC[0-9]{7}A$/;
    if (aliancaRegex.test(cleanOS)) return 'Aliança';

    // Padrão Mercosul: (número) + SP + (6 números) + A
    const mercosulRegex = /^[0-9]*SP[0-9]{6}A$/;
    if (mercosulRegex.test(cleanOS)) return 'Mercosul';

    return null; // Caso não identifique
  },

  /**
   * Sincroniza os vínculos do Motorista e do Cliente com a nova categoria
   */
  syncVinculos: async (category: string, driver: any, customer: any) => {
    if (!category || category === 'Nenhum') return;

    // 1. Atualizar Motorista (Padrão: {category, client})
    if (driver && driver.id) {
      const currentDrivers = await database.getDrivers();
      const dbDriver = currentDrivers.find(d => d.id === driver.id);
      
      if (dbDriver) {
        const hasOp = dbDriver.operations.some(op => 
          op.category.toUpperCase() === category.toUpperCase() && 
          op.client.toUpperCase() === (customer?.name || 'GERAL').toUpperCase()
        );

        if (!hasOp) {
          const updatedDriver = {
            ...dbDriver,
            operations: [
              ...dbDriver.operations, 
              { category: category, client: customer?.name || 'Geral' }
            ]
          };
          await database.saveDriver(updatedDriver);
        }
      }
    }

    // 2. Atualizar Cliente (Padrão: string[])
    if (customer && customer.id) {
      const currentCustomers = await database.getCustomers();
      const dbCust = currentCustomers.find(c => c.id === customer.id);

      if (dbCust) {
        const currentOps = dbCust.operations || [];
        const hasOp = currentOps.some(op => op.toUpperCase() === category.toUpperCase());

        if (!hasOp) {
          const updatedCust = {
            ...dbCust,
            operations: [...currentOps, category]
          };
          await database.saveCustomer(updatedCust);
        }
      }
    }
  }
};