
export interface User {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  role: 'admin' | 'staff' | 'driver';
  driverId?: string;
  staffId?: string;
  lastLogin: string;
  isFirstLogin?: boolean;
  avatar?: string;
  position?: string;
}

export enum AppScreen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  DRIVER_PORTAL = 'DRIVER_PORTAL'
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

export interface DriverOperation {
  category: string;
  client: string;
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
  beneficiaryCnpj?: string;
  paymentPreference?: 'TED' | 'PIX';
  whatsappGroupName: string;
  whatsappGroupLink: string;
  registrationDate: string;
  operations: DriverOperation[];
  tripsCount: number;
  hasAccess?: boolean;
  generatedPassword?: string;
}

export interface Staff {
  id: string;
  photo?: string;
  name: string;
  position: string;
  username: string;
  role: 'admin' | 'staff';
  registrationDate: string;
  lastLogin?: string;
}

export enum DashboardTab {
  INICIO = 'INICIO',
  OPERACOES = 'OPERACOES',
  MOTORISTAS = 'MOTORISTAS',
  CLIENTES = 'CLIENTES',
  PORTOS = 'PORTOS',
  PRE_STACKING = 'PRE_STACKING',
  FORMULARIOS = 'FORMULARIOS',
  COLABORADORES = 'COLABORADORES',
  SISTEMA = 'SISTEMA'
}

export interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  forecastNextDay: {
    temp: number;
    condition: string;
  };
}

export interface OperationDefinition {
  id: string;
  category: string;
  clients: { name: string; hasDedicatedPage: boolean }[];
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
  cva?: string;
  driverName: string;
  cpf: string;
  plateHorse: string;
  plateTrailer: string;
  origin: string;
  destination: string;
  status: VWStatus;
  statusHistory: VWStatusUpdate[];
}

export interface Milestone {
  dt: string;
  location?: string;
}

export interface TripMilestones {
  retiradaVazio?: Milestone;
  chegadaCliente?: Milestone;
  retiradaCheio?: Milestone;
  agendamento?: Milestone;
  entregaFinal?: Milestone;
  liberacaoRetirada?: Milestone;
  baixaNF?: Milestone;
  saidaCliente?: Milestone;
}

export interface Trip {
  id: string;
  os: string;
  status: string;
  type: 'IMPORT_ENTREGA' | 'EXPORT_COLETA';
  customerName: string;
  scheduledDateTime: string;
  driverName: string;
  driverId: string;
  plateHorse: string;
  plateTrailer: string;
  container: string;
  milestones: TripMilestones;
}
