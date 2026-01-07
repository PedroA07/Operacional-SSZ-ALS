
import { OperationDefinition } from '../types';

export const DEFAULT_OPERATIONS: OperationDefinition[] = [
  {
    id: 'op-alianca',
    category: 'Aliança',
    clients: [
      { name: 'Volkswagen', hasDedicatedPage: false }
    ]
  },
  {
    id: 'op-mercosul',
    category: 'Mercosul',
    clients: [
      { name: 'Owens', hasDedicatedPage: false }
    ]
  },
  {
    id: 'op-industria',
    category: 'Industria',
    clients: [
      { name: 'Diageo', hasDedicatedPage: false }
    ]
  },
  {
    id: 'op-carga-solta',
    category: 'Carga Solta',
    clients: [
      { name: 'Geral', hasDedicatedPage: false }
    ]
  }
];
