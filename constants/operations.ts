
import { OperationDefinition } from '../types';

export const DEFAULT_OPERATIONS: OperationDefinition[] = [
  {
    id: 'op-alianca',
    category: 'Aliança',
    clients: [
      { name: 'Volkswagen', hasDedicatedPage: true }
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
      { name: 'Diageo', hasDedicatedPage: true }
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
