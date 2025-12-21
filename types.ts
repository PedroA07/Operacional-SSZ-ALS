
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'staff' | 'driver';
  driverId?: string; // Vincula o usuário ao cadastro de motorista se for o caso
  lastLogin: string;
}

export enum AppScreen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  DRIVER_PORTAL = 'DRIVER_PORTAL'
}

export interface Operation {
  category: string;
  client: string;
}

export interface OperationDefinition {
  id: string;
  category: string;
  clients: {
    name: string;
    hasDedicatedPage: boolean;
  }[];
}

export interface Port {
  id: string;
  name: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  cnpj: string;
  registrationDate: string;
}

export interface PreStacking {
  id: string;
  name: string;
  cnpj: string;
  zipCode: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  registrationDate: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  cnpj: string;
  registrationDate: string;
  operations: string[];
}

export interface Driver {
  id: string;
  photo?: string;
  name: string;
  cpf: string;
  rg: string;
  cnh: string;
  phone: string;
  email: string;
  plateHorse: string;
  yearHorse: string;
  plateTrailer: string;
  yearTrailer: string;
  driverType: 'Frota' | 'Externo';
  status: 'Ativo' | 'Inativo';
  statusLastChangeDate: string;
  beneficiaryName: string;
  beneficiaryPhone: string;
  beneficiaryEmail: string;
  whatsappGroupName: string;
  whatsappGroupLink: string;
  registrationDate: string;
  operations: Operation[];
  tripsCount: number;
}

export type TripType = 'IMPORT_ENTREGA' | 'EXPORT_COLETA';
export type TripStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ATRASADA';

export interface Trip {
  id: string;
  type: TripType;
  os: string;
  container?: string;
  scheduledDateTime: string;
  customerName: string;
  driverId: string; // Link direto com Driver
  driverName: string;
  plateHorse: string;
  plateTrailer: string;
  status: TripStatus;
  milestones: {
    liberacaoRetirada?: { location: string, dt: string };
    retiradaVazio?: { dt: string };
    chegadaCliente?: { dt: string };
    retiradaCheio?: { dt: string };
    baixaNF?: { dt: string };
    saidaCliente?: { dt: string };
    agendamento?: { location: string, dt: string };
    entregaFinal?: { dt: string };
  };
}

export enum DashboardTab {
  INICIO = 'INICIO',
  OPERACOES = 'OPERACOES',
  MOTORISTAS = 'MOTORISTAS',
  CLIENTES = 'CLIENTES',
  PORTOS = 'PORTOS',
  PRE_STACKING = 'PRE_STACKING',
  FORMULARIOS = 'FORMULARIOS'
}

export type VWStatus = 'Pendente' | 'Retirado Cragea' | 'Chegada Volks' | 'Saída Volks' | 'Baixa Cragea';

export interface VWStatusUpdate {
  status: VWStatus;
  dateTime: string;
}

export interface VWSchedule {
  id: string;
  dateTime: string;
  os: string;
  container: string;
  cva: string;
  driverId?: string;
  driverName: string;
  cpf: string;
  plateHorse: string;
  plateTrailer: string;
  origin: string;
  destination: string;
  status: VWStatus;
  statusHistory: VWStatusUpdate[];
}
