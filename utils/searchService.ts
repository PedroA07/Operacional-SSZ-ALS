
import { Driver, Customer, Port, PreStacking } from '../types';

export const searchService = {
  /**
   * Mapeia um objeto Cliente para o formato de Autocomplete
   */
  mapCustomer: (c: Customer) => ({
    id: c.id,
    mainText: c.legalName || c.name,
    subText: c.name,
    document: c.cnpj,
    location: `${c.city} - ${c.state}`,
    originalData: c
  }),

  /**
   * Mapeia um objeto Motorista para o formato de Autocomplete
   */
  mapDriver: (d: Driver) => ({
    id: d.id,
    mainText: d.name,
    subText: d.plateHorse,
    document: d.cpf,
    location: d.driverType,
    originalData: d
  }),

  /**
   * Mapeia um objeto Porto/Terminal para o formato de Autocomplete
   */
  mapPort: (p: Port | PreStacking) => ({
    id: p.id,
    mainText: p.legalName || p.name,
    subText: p.name,
    document: p.cnpj,
    location: `${p.city} - ${p.state}`,
    originalData: p
  })
};
