
export interface User {
  username: string;
  role: 'admin' | 'user';
  lastLogin: string;
}

export enum AppScreen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD'
}

export interface Operation {
  category: string;
  client: string;
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
  neighborhood?: string; // Bairro
  city: string;
  state: string;
  zipCode: string;
  cnpj: string;
  registrationDate: string;
  operations: string[]; // Categorias vinculadas (ex: ['Aliança', 'Mercosul'])
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  cnh: string;
  plateHorse: string;
  yearHorse?: string;
  plateTrailer: string;
  yearTrailer?: string;
  operations: Operation[]; 
  phone: string;
  email: string;
  whatsappGroupName: string;
  whatsappGroupLink: string;
  tripsCount: number;
  photo?: string; 
  registrationDate: string;
  status: 'Ativo' | 'Inativo';
  statusLastChangeDate?: string;
  driverType: 'Frota' | 'Externo';
}

export type VWStatus = 'Pendente' | 'Retirado Cragea' | 'Chegada Volks' | 'Saída Volks' | 'Baixa Cragea';

export interface VWSchedule {
  id: string;
  dateTime: string;
  os: string;
  container: string;
  cva: string;
  driverName: string;
  cpf: string;
  plateHorse: string;
  plateTrailer: string;
  origin: string;
  destination: string;
  status: VWStatus;
  retiradoTime?: string;
  previsaoVolks?: string;
  chegadaTime?: string;
  saidaTime?: string;
  baixaTime?: string;
}

export enum DashboardTab {
  INICIO = 'INICIO',
  MOTORISTAS = 'MOTORISTAS',
  CLIENTES = 'CLIENTES',
  PORTOS = 'PORTOS',
  PRE_STACKING = 'PRE_STACKING',
  VOLKSWAGEN = 'VOLKSWAGEN',
  FORMULARIOS = 'FORMULARIOS'
}
