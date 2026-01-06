
export enum AppScreen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD'
}

export interface User {
  id: string;
  username: string;
  password?: string;
  displayName: string;
  role: 'admin' | 'staff' | 'driver' | 'motoboy';
  lastLogin: string;
  photo?: string;
  position?: string;
  driverId?: string;
  staffId?: string;
  status?: 'Ativo' | 'Inativo';
  isFirstLogin?: boolean;
  lastSeen?: string;
  isOnlineVisible?: boolean;
  notificationPrefs?: NotificationPreference;
}

export interface NotificationPreference {
  newTrip: boolean;
  statusUpdate: boolean;
  paymentLiberated: boolean;
  systemChanges: boolean;
  newRegistrations: boolean;
}

export type NotificationType = 
  | 'OC_GENERATED' 
  | 'MINUTA_GENERATED' 
  | 'LIBERACAO_GENERATED' 
  | 'STATUS_UPDATED' 
  | 'TRIP_CREATED' 
  | 'PAYMENT_LIBERATED' 
  | 'SYSTEM' 
  | 'DELETED';

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  authorName: string;
  authorId: string;
  timestamp: string;
  summary?: {
    os?: string;
    placa?: string;
    motorista?: string;
    cliente?: string;
    valor?: string;
  };
}

export enum DashboardTab {
  INICIO = 'INICIO',
  OPERACOES = 'OPERACOES',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  MOTORISTAS = 'MOTORISTAS',
  CLIENTES = 'CLIENTES',
  SISTEMA = 'SISTEMA',
  FORMULARIOS = 'FORMULARIOS',
  COLABORADORES = 'COLABORADORES',
  PORTOS = 'PORTOS',
  PRE_STACKING = 'PRE_STACKING',
  DOCUMENTOS = 'DOCUMENTOS'
}

export type TripStatus = 
  | 'Pendente' 
  | 'Retirada de vazio'
  | 'Retirada do cheio' 
  | 'Em viagem' 
  | 'Chegou no cliente' 
  | 'Pegou NF' 
  | 'Saiu do cliente' 
  | 'Chegou no destino' 
  | 'Devolução do cheio'
  | 'Viagem concluída' 
  | 'Viagem cancelada';

export interface StatusHistoryEntry {
  status: TripStatus;
  dateTime: string;
}

export interface PaymentStatus {
  status: 'BLOQUEADO' | 'LIBERAR' | 'PAGO' | 'AGUARDANDO_DOCS';
  liberatedAt?: string;
  paidDate?: string;
}

export interface TripDocument {
  id: string;
  type: 'CTE' | 'COMPLETO' | 'NF' | 'OC' | 'MINUTA' | 'OS_PDF' | 'AGENDAMENTO' | 'CVA';
  url: string;
  fileName: string;
  uploadDate: string;
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
}

export interface TripScheduling {
  dateTime: string;
  location: string;
  locationId?: string;
  obs?: string;
}

export interface Trip {
  id: string;
  os: string;
  booking: string;
  ship: string;
  dateTime: string;
  statusTime?: string;
  isLate: boolean;
  type: 'EXPORTAÇÃO' | 'IMPORTAÇÃO' | 'COLETA' | 'ENTREGA' | 'CABOTAGEM';
  containerType?: string; 
  category: string;
  subCategory?: string;
  container: string;
  tara?: string;
  seal?: string;
  cva?: string; 
  customer: { id: string; name: string; legalName?: string; cnpj?: string; city: string; state?: string };
  destination?: { id: string; name: string; legalName?: string; cnpj?: string; city: string; state?: string };
  driver: { id: string; name: string; plateHorse: string; plateTrailer: string; status: string; cpf?: string };
  status: TripStatus;
  statusHistory: StatusHistoryEntry[];
  balancePayment: PaymentStatus;
  advancePayment: PaymentStatus;
  documents?: TripDocument[];
  osDoc?: TripDocument;
  agendamentoDoc?: TripDocument;
  completoDoc?: TripDocument;
  cteDoc?: TripDocument;
  cvaDoc?: TripDocument;
  ocFormData?: any;
  preStackingFormData?: any;
  scheduling?: TripScheduling;
}

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  cnh?: string;
  cnhPdfUrl?: string; 
  photo?: string;
  phone: string;
  email?: string;
  plateHorse: string;
  yearHorse?: string;
  plateTrailer: string;
  yearTrailer?: string;
  driverType: 'Frota' | 'Externo' | 'Motoboy';
  status: 'Ativo' | 'Inativo';
  statusLastChangeDate?: string;
  beneficiaryName?: string;
  beneficiaryPhone?: string;
  beneficiaryEmail?: string;
  beneficiaryCnpj?: string;
  paymentPreference?: 'PIX' | 'TED';
  whatsappGroupName?: string;
  whatsappGroupLink?: string;
  registrationDate?: string;
  operations: { category: string; client: string }[];
  tripsCount?: number;
  generatedPassword?: string;
  hasAccess?: boolean;
}

export interface Customer { 
  id: string; 
  name: string; 
  legalName?: string;
  cnpj: string; 
  city: string; 
  state: string; 
  address?: string;
  neighborhood?: string;
  zipCode?: string;
  operations?: string[];
}

export interface Port { 
  id: string; 
  name: string; 
  legalName?: string;
  city: string; 
  state: string; 
  cnpj: string; 
  address: string; 
  neighborhood?: string; 
  zipCode?: string; 
}

export interface PreStacking { 
  id: string; 
  name: string; 
  legalName?: string;
  city: string; 
  state: string; 
  cnpj: string; 
  address: string; 
  neighborhood?: string; 
  zipCode?: string; 
}

export interface Staff { 
  id: string; 
  name: string; 
  username: string; 
  role: 'admin' | 'staff'; 
  position: string; 
  registrationDate: string; 
  status: 'Ativo' | 'Inativo'; 
  statusSince: string; 
  photo?: string; 
  lastLogin?: string; 
  emailCorp?: string; 
  phoneCorp?: string; 
}

export interface OperationDefinition { 
  id: string; 
  category: string; 
  clients: { name: string; hasDedicatedPage: boolean }[]; 
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

export interface OpentechTrip {
  id: string;
  smNumber: string;
  clientName: string;
  driverName: string;
  driverCpf: string;
  plateHorse: string;
  origin: string;
  destination: string;
  startTime: string;
  eta: string;
  status: 'Em Viagem' | 'Concluída' | 'Alerta' | 'Sinistrada' | 'Iniciada' | 'Alerta Risco';
  riskLevel: 'Crítico' | 'Alto' | 'Médio' | 'Baixo';
}
