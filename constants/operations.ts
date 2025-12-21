
export interface OperationDefinition {
  category: string;
  clients: string[];
}

export const DEFAULT_OPERATIONS: OperationDefinition[] = [
  {
    category: 'Aliança',
    clients: ['Volkswagen']
  },
  {
    category: 'Mercosul',
    clients: ['Owens']
  },
  {
    category: 'Industria',
    clients: ['Diageo']
  },
  {
    category: 'Carga Solta',
    clients: ['Geral']
  }
];
