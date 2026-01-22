
export enum AppScreen {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD'
}

export type PresenceStatus = 'online' | 'away' | 'offline';

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
  presence_status?: PresenceStatus;
}

export interface LoginCredential {
  id: string;
  siteName: string;
  url: string;
  username: string;
  password: string;
  additionalFields: { label: string; value: string }[];
  createdAt: string;
}

export interface SealBatch {
  id: string;
  carrier: string;
  startNumber: string;
  endNumber: string;
  createdAt: string;
}

export interface SealRecord {
  id: string;
  batchId: string;
  sealNumber: string;
  containerNumber: string;
  booking: string;
  reuseDate: string;
  driverName: string;
}

export interface StaySession {
  id: string;
  category: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  createdBy: string;
  gracePeriodHours?: number;
  roundUpMinutes?: number;
  costPerHour?: number;
}

export interface StayRecord {
  id: string;
  sessionId: string;
  type: string;
  os: string;
  location: string;
  driverName: string;
  ship: string;
  container: string;
  scheduledStart: string;
  arrivalTime: string;
  departureTime: string;
  exceededHours: string;
}

export interface NotificationPreference {
  newTrip: boolean;
  statusUpdate: boolean;
  paymentLiberated: boolean;
  systemChanges: boolean;
  newRegistrations: boolean;
}

export type NotificationOrigin = 'OPERACIONAL' | 'MOTORISTA';

export type NotificationType = 
  | 'TRIP_CREATED' 
  | 'TRIP_UPDATED'
  | 'STATUS_UPDATED' 
  | 'PAYMENT_LIBERATED' 
  | 'DRIVER_CREATED' 
  | 'DRIVER_UPDATED' 
  | 'CUSTOMER_CREATED'
  | 'CUSTOMER_UPDATED' 
  | 'PORT_CREATED'
  | 'PORT_UPDATED' 
  | 'PRESTACKING_CREATED'
  | 'PRESTACKING_UPDATED' 
  | 'CATEGORY_CREATED'
  | 'SYSTEM' 
  | 'DELETED'
  | 'OC_GENERATED'
  | 'OC_EDITED'
  | 'LIBERACAO_GENERATED'
  | 'MINUTA_GENERATED'
  | 'DOC_ATTACHED'
  | 'CONTRACT_UPLOADED'
  | 'DRIVER_DOC_UPLOADED'
  | 'DRIVER_PROFILE_UPDATED';

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  origin: NotificationOrigin;
  authorName: string;
  authorId: string;
  timestamp: string;
  summary?: {
    os?: string;
    placa?: string;
    motorista?: string;
    cliente?: string;
    valor?: string;
    porto?: string;
    categoria?: string;
    unidade?: string;
    fotos?: string;
    docType?: string;
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
  DOCUMENTOS = 'DOCUMENTOS',
  ESTADIAS = 'ESTADIAS',
  LOGINS = 'COFRE_DE_LOGINS',
  LACRES = 'CONTROLE_DE_LACRES'
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
  | 'Viagem cancelada'
  | 'Chegou no Cragea'
  | 'Aguardando carregar'
  | 'Saiu do Cragea'
  | 'Chegou na Volkswagen'
  | 'Saiu da Volkswagen'
  | 'Container sobre rodas';

export type VWStatus = TripStatus;

export interface StatusHistoryEntry {
  status: TripStatus;
  dateTime: string; 
  createdAt: string; 
}

export interface PaymentStatus {
  status: 'BLOQUEADO' | 'LIBERAR' | 'PAGO' | 'AGUARDANDO_DOCS';
  liberatedAt?: string;
  paidDate?: string;
}

export interface TripDocument {
  id: string;
  type: 'CTE' | 'COMPLETO' | 'NF' | 'OC' | 'MINUTA' | 'OS_PDF' | 'AGENDAMENTO' | 'CVA' | 'CONTRATO_FRETE' | 'DRIVER_SCAN';
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

export interface DriverCapturedDoc {
  id: string;
  url: string;
  timestamp: string;
  extractedKey?: string; 
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
  driver: { id: string; name: string; plateHorse: string; plateTrailer: string; status: string; cpf?: string; phone?: string };
  status: TripStatus;
  statusHistory: StatusHistoryEntry[];
  balancePayment: PaymentStatus;
  advancePayment: PaymentStatus;
  documents?: TripDocument[];
  osDoc?: TripDocument;
  agendamentoDoc?: TripDocument;
  completoDoc?: TripDocument;
  freightContractDoc?: TripDocument;
  cteDoc?: TripDocument;
  cvaDoc?: TripDocument;
  nfDoc?: TripDocument; 
  nfKey?: string; 
  ocFormData?: any;
  preStackingFormData?: any;
  scheduling?: TripScheduling;
  driver_docs?: DriverCapturedDoc[];
  stay_session_id?: string;
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
  currentLat?: number;
  currentLng?: number;
  lastLocationAt?: string;
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

export interface VWStatusUpdate {
  status: TripStatus;
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
  status: TripStatus;
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
  status: string;
  riskLevel: 'Crítico' | 'Alto' | 'Médio' | 'Baixo';
}
