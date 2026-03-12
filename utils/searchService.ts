
import { Driver, Customer, Port, PreStacking } from '../types';
import { maskCNPJ, maskCPF, maskPhone } from './masks';

export interface AutocompleteItem {
  id: string;
  type: 'DRIVER' | 'CUSTOMER' | 'PORT' | 'STAFF';
  mainText: string;    // Nome ou Razão Social
  subText?: string;     // Nome Fantasia ou Placas
  document?: string;    // CNPJ ou CPF
  location?: string;    // Localidade ou Telefone
  details?: {
    plateHorse?: string;
    plateTrailer?: string;
    phone?: string;
    documentRaw?: string;
  };
  originalData: any;
}

export const searchService = {
  /**
   * Mapeia um objeto Cliente para o formato de Autocomplete
   */
  mapCustomer: (c: Customer): AutocompleteItem => ({
    id: c.id,
    type: 'CUSTOMER',
    mainText: c.legalName || c.name,
    subText: c.name,
    document: maskCNPJ(c.cnpj),
    location: `${c.city} - ${c.state}`,
    originalData: c
  }),

  /**
   * Mapeia um objeto Motorista para o formato de Autocomplete
   * Inclui Telefone, CPF e as duas placas conforme solicitado.
   */
  mapDriver: (d: Driver): AutocompleteItem => ({
    id: d.id,
    type: 'DRIVER',
    mainText: d.name,
    subText: `CAVALO: ${d.plateHorse} | CARRETA: ${d.plateTrailer}`,
    document: maskCPF(d.cpf),
    location: maskPhone(d.phone),
    details: {
      plateHorse: d.plateHorse,
      plateTrailer: d.plateTrailer,
      phone: d.phone,
      documentRaw: d.cpf
    },
    originalData: d
  }),

  /**
   * Mapeia um objeto Porto/Terminal para o formato de Autocomplete
   */
  mapPort: (p: Port | PreStacking): AutocompleteItem => ({
    id: p.id,
    type: 'PORT',
    mainText: p.legalName || p.name,
    subText: p.name,
    document: maskCNPJ(p.cnpj),
    location: `${p.city} - ${p.state}`,
    originalData: p
  }),

  /**
   * Mapeia um objeto Colaborador para o formato de Autocomplete
   */
  mapStaff: (s: any): AutocompleteItem => ({
    id: s.id,
    type: 'STAFF',
    mainText: s.name,
    subText: s.position,
    document: s.phoneCorp ? maskPhone(s.phoneCorp) : undefined,
    location: s.emailCorp,
    originalData: s
  })
};
