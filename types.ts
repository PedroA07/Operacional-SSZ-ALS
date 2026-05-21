
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
  role: 'admin' | 'staff' | 'driver' | 'motoboy' | 'third_party' | 'beneficiary';
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
  emailCorp?: string;
  phoneCorp?: string;
  thirdPartyConfig?: {
    visibleFields: string[];
    allowedCategories?: string[];
    allowedTypes?: string[];
    allowedContainerTypes?: string[];
    allowedStatuses?: string[];
    allowedCustomers?: string[];
    visibleFilters?: string[];
    pages?: {
      orgColeta?:        { enabled: boolean; visibleFields: string[] };
      orgEntrega?:       { enabled: boolean; visibleFields: string[] };
      orgColetaEntrega?: { enabled: boolean; visibleFields: string[] };
      orgDevolucoes?:    { enabled: boolean; visibleFields: string[] };
    };
  };
}

export interface Beneficiary {
  id: string;
  name: string;
  cpf?: string;
  cnpj?: string;
  phone: string;
  email?: string;
  pixKey?: string;
  paymentPreference?: 'PIX' | 'TED';
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  status: 'Ativo' | 'Inativo';
  registrationDate?: string;
  userId?: string;      // references users table
  observations?: string;
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

export type AvantidaStatus = 'APROVADO' | 'RECUSADO' | 'EM ANÁLISE';

export interface AvantidaRecord {
  id: string;
  date: string;
  containerNumber: string;
  exportRef: string;
  requestedPrice: number;
  customerRef: string;
  tripSettlement: string;
  verified: boolean;
  driverId: string;
  createdAt: string;
  shippingLine: string;
  importLocation: string;
  reuseDate: string;
  status: AvantidaStatus;
}

export interface AvantidaPriceRule {
  id: string;
  shippingLine: string;
  price: number;
  updatedAt: string;
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

export interface CustomColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'formula' | 'date' | 'time' | 'datetime' | 'currency';
  formula?: string;
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
  customColumns?: CustomColumn[];
  useCustomColumns?: boolean;
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
  arrivalStatus?: string;
  observations?: string;
  customValues?: { [columnId: string]: string | number };
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
  | 'RETIRADA_CHEIO_GENERATED'
  | 'DOC_ATTACHED'
  | 'CONTRACT_UPLOADED'
  | 'DRIVER_DOC_UPLOADED'
  | 'DRIVER_PROFILE_UPDATED'
  | 'EMAIL_TEMPLATE_CREATED'
  | 'EMAIL_TEMPLATE_UPDATED';

export interface EmailTableConfig {
  id: string;
  title: string;
  hideTitle?: boolean;
  hideHeaders?: boolean;
  headerColor: string;
  headerOrientation: 'horizontal' | 'vertical';
  alternateRowColor: boolean;
  columns: string[];
  columnLabels?: Record<string, string>;
  customCells?: Record<string, string>;
  autoFilter?: string; // Formula to filter trips automatically
  splitTable?: boolean;
  splitLeftCondition?: string;
  splitRightCondition?: string;
  splitLeftTitle?: string;
  splitRightTitle?: string;
  defaultFilters?: {
    enabled?: boolean;
    useTodayDate?: boolean;
    date?: string;
    customer?: string;
    destination?: string;
    ship?: string;
    booking?: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  config: {
    tables?: EmailTableConfig[];
    // Legacy support
    headerColor?: string;
    headerOrientation?: 'horizontal' | 'vertical';
    alternateRowColor?: boolean;
    columns?: string[];
    fontSize?: string;
    fontFamily?: string;
    isColetaDefault?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

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

export interface FormHistoryEntry {
  id: string;
  formType: string;
  formData: any;
  label: string;
  userName: string;
  userId: string;
  createdAt: string;
}

export interface HandoverMention {
  type: 'trip' | 'driver' | 'customer' | 'port' | 'user';
  id: string;
  label: string;
}

export interface DutySwapRequest {
  id: string;
  fromStaffId: string;
  fromStaffName: string;
  toStaffId: string;
  toStaffName: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface HandoverPost {
  id: string;
  content: string; // HTML rich text
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorRole?: string;
  mentions: HandoverMention[];
  createdAt: string;
  updatedAt?: string;
}

export interface HandoverComment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  authorRole?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum DashboardTab {
  INICIO = 'INICIO',
  HANDOVER = 'HANDOVER',
  OPERACOES = 'OPERACOES',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
  MOTORISTAS = 'MOTORISTAS',
  BENEFICIARIOS = 'BENEFICIARIOS',
  CLIENTES = 'CLIENTES',
  SISTEMA = 'SISTEMA',
  FORMULARIOS = 'FORMULARIOS',
  COLABORADORES = 'COLABORADORES',
  PORTOS = 'PORTOS',
  PRE_STACKING = 'PRE_STACKING',
  DOCUMENTOS = 'DOCUMENTOS',
  ESTADIAS = 'ESTADIAS',
  LOGINS = 'COFRE_DE_LOGINS',
  LACRES = 'CONTROLE_DE_LACRES',
  AVANTIDA = 'AVANTIDA',
  ORGANIZACAO = 'ORGANIZACAO',
  COLETA_DIA = 'COLETA_DIA',
  AUTOMACOES = 'AUTOMACOES',
  NAVIOS = 'NAVIOS',
  EXTERNAL_PORTAL = 'EXTERNAL_PORTAL',
  EXTERNAL_USERS = 'EXTERNAL_USERS'
}

export interface Automation {
  id: string;
  status: string;
  emailTemplateId?: string;
  whatsappGroupId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  | 'Container sobre rodas'
  | 'Agendamento realizado'
  | 'Emissão Solicitada'
  | 'Cancelado'
  | 'Frete Morto'
  | 'Reutilização';

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

export interface FreightContractDoc extends TripDocument {
  expiresAt?: string; // ISO string — 90 dias após uploadDate
  parsedData?: {
    prevTermino?: string;
    localidade?: string;
    motorista?: string;
    container?: string;
  };
}

export interface Category {
  id: string;
  name: string;
  parentId?: string;
  color?: string;
  allowDuplicateOS?: boolean;
}

export interface ContainerType {
  id: string;
  name: string;
  createdAt?: string;
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
  fileName?: string;
  timestamp: string;
  extractedKey?: string; 
}

export interface CustomStatus {
  id: string;
  name: string;
  customerId?: string;    // Se vazio, é status geral
  modality?: string;      // EXPORTAÇÃO, IMPORTAÇÃO, etc.
  destinationId?: string; // ID do porto, pre-stacking ou cliente de destino
  orderIndex: number;
  color?: string;
  isFinal?: boolean;          // Marca viagem como concluída ao atingir este status
  operationalOnly?: boolean;  // Visível apenas no painel operacional (não para motoristas)
}

export interface FreightContract {
  id: string;
  fileName: string;
  fileUrl?: string;
  contractNumber?: string;
  container?: string;
  tripId?: string;
  tripOs?: string;
  destination?: string;
  driverId?: string;
  driverName?: string;
  status: 'linked' | 'unlinked';
  uploadedAt: string;
}

export interface BotGroup {
  id: string;
  jid: string;
  name: string;
  type: 'driver' | 'internal' | 'admin';
  driverId: string | null;
  driverName: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotAutomation {
  id: string;
  name: string;
  type: 'scheduled' | 'status_trigger' | 'reminder_before';
  isActive: boolean;
  // Agendado
  scheduleTime?: string;    // "07:00"
  scheduleDays?: number[];  // [0-6] 0=Dom
  // Gatilho de status
  triggerStatus?: string;
  delayMinutes?: number;
  // Lembrete antes
  reminderMinutes?: number;
  // Destino
  target: 'driver' | 'internals' | 'all' | 'specific';
  targetJid?: string;
  // Mensagem
  messageTemplate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  os: string;
  booking: string;
  ship: string;
  bu?: string;
  autColeta?: string;
  embarcador?: string;
  dateTime: string;
  statusTime?: string;
  isLate: boolean;
  type: string;
  containerType?: string; 
  category: string;
  subCategory?: string;
  container: string;
  tara?: string;
  seal?: string;
  cva?: string; 
  agencia?: string;
  customer: { id: string; name: string; legalName?: string; cnpj?: string; city: string; state?: string };
  destination?: { id: string; name: string; legalName?: string; cnpj?: string; city: string; state?: string };
  driver: { id: string; name: string; plateHorse: string; plateTrailer: string; status: string; cpf?: string; phone?: string };
  status: TripStatus;
  isCompleted?: boolean;
  statusHistory: StatusHistoryEntry[];
  balancePayment: PaymentStatus;
  advancePayment: PaymentStatus;
  documents?: TripDocument[];
  osDoc?: TripDocument;
  agendamentoDoc?: TripDocument;
  completoDoc?: TripDocument;
  freightContractDoc?: TripDocument;
  freightContractDocs?: FreightContractDoc[];
  cteDoc?: TripDocument;
  cvaDoc?: TripDocument;
  nfDoc?: TripDocument; 
  nfKey?: string; 
  ocFormData?: any;
  preStackingFormData?: any;
  scheduling?: TripScheduling | null;
  driver_docs?: DriverCapturedDoc[];
  stay_session_id?: string;
  isPriority?: boolean;
  sentNF?: boolean;
  isScheduled?: boolean;
  scheduledLocationId?: string;
  scheduledDateTime?: string;
  hasAdvance?: boolean;
  coletaTipoViagem?: string;
  coletaEmailSent?: boolean;
  coletaDocGenerated?: boolean;
  coletaEmissaoSolicitada?: boolean;
  isRemovedFromColeta?: boolean;
  isRemovedFromOrg?: boolean;
}

export interface ColetaDocOriginarioRule {
  customerId: string;
  customerName: string;
  text: string;
}

export interface ColetaReplaceRule {
  find: string;
  replace: string;
}

export interface ColetaOpConfig {
  emailRequired?: boolean;
  docOriginarioText?: string;       // template por OS — variáveis {os} {booking} {container} {ship}
  docOriginarioSeparator?: string;  // separador entre linhas de OS (default: \n)
  docOriginarioPrefix?: string;     // texto antes do bloco de OSes
  docOriginarioSuffix?: string;     // texto após o bloco de OSes
  docOriginarioReplaceRules?: ColetaReplaceRule[];
  docOriginarioByCustomer?: ColetaDocOriginarioRule[];
}

export interface OperationTypeTripRule {
  tripTypeId: string;
  isDefault?: boolean;
  customerIds?: string[];
}

export interface OperationTypeConfig {
  defaultCategoryId?: string;
  tripTypeRules?: OperationTypeTripRule[];
  coleta?: ColetaOpConfig;
}

export interface OperationType {
  id: string;
  name: string;
  color?: string;
  config?: OperationTypeConfig;
  createdAt?: string;
}

export interface ColetaTipoViagemOption {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
}

export interface PlateEntry {
  id: string;
  plate: string;
  year?: string;
  isPrimary: boolean;
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
  platesHorse?: PlateEntry[];
  platesTrailer?: PlateEntry[];
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
  freightContractSendTo?: 'driver' | 'beneficiary' | 'group';
  lastFreightContractDate?: string;
  lastFreightContractLocation?: string;
  beneficiaryIsDriver?: boolean;
  beneficiaryUserId?: string;
  beneficiaryId?: string;
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
  registrationDate?: string;
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
  registrationDate?: string;
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
  registrationDate?: string;
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
  lastLogin?: string | null; 
  emailCorp?: string; 
  phoneCorp?: string; 
  visibleCategories?: string[];
  visibleOperationTypes?: string[];
}

export interface OperationDefinition {
  id: string;
  category: string;
  color?: string;
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

export interface ShipStatusEntry {
  status: ShipStatus;
  dateTime: string;           // ISO
  obs?: string;
}

export interface Ship {
  id: string;
  name: string;               // nome do navio
  imo?: string;               // número IMO
  armador?: string;           // companhia (MSC, Maersk, etc.)
  viagem?: string;            // número da viagem
  terminal?: string;          // ECOPORTO | SANTOS BRASIL | EMBRAPORT | BTP | OUTRO
  berco?: string;             // berço de atracação
  eta?: string;               // previsão chegada (ISO date) — legado
  etd?: string;               // previsão saída (ISO date) — legado
  // Campos de monitoramento (estilo PortRisk)
  prevAtracacao?: string;     // previsão de atracação (ISO datetime)
  abertGate?: string;         // abertura de gate (ISO datetime)
  deadLine?: string;          // deadline embarque (ISO datetime)
  dataAtracacao?: string;     // atracação efetiva (ISO datetime)
  dataDesatrac?: string;      // desatracação efetiva (ISO datetime)
  statusHistory?: ShipStatusEntry[];
  status: ShipStatus;
  observacoes?: string;
  tripIds?: string[];         // viagens vinculadas
  createdAt: string;
  updatedAt: string;
}

export interface TerminalVessel {
  terminal: string;           // BTP | ECOPORTO | SANTOS BRASIL
  navio: string;
  situacao: string;           // Previsto | Em Operação | Desatracado | Encerrado | ...
  viagem?: string;
  armador?: string;           // armador/agência
  berco?: string;
  previsao?: string;          // campo genérico (terminais sem colunas detalhadas)
  // Campos detalhados (BTP e similares)
  rap?: string;
  agencia?: string;
  dtPrevChegada?: string;
  dtChegada?: string;
  dtPrevAtrac?: string;
  dtAtracacao?: string;
  dtPrevSaida?: string;
  dtSaida?: string;
  gateDry?: string;
  gateReefer?: string;
  deadLineStr?: string;
  servico?: string;
  fetchedAt?: string;
}

export interface SILProgramacao {
  _rowIndex: number;
  numeroProgramacao: string;
  tipoProgramado: string;
  container: string;
  tipoContainer: string;
  taraEspecifica: string;
  lacre1: string;
  booking: string;
  previsaoAtendimento: string;
  situacao: string;
  nomeMotorista: string;
  cpfMotorista: string;
  placaVeiculo: string;
  placaCarreta: string;
  cidadeAtendimento: string;
  referenciaPosCidade: string;
  nomeLocalAtendimento: string;
  numeroColeta: string;
  embarcador: string;
  navio: string;
  bl: string;
}

export type ShipStatus =
  | 'NOVO'
  | 'NÃO ENCONTRADO'
  | 'SEM PREVISÃO'
  | 'AG. ATRACAÇÃO'
  | 'ATRACADO'
  | 'GATE ABERTO'
  | 'GATE FECHADO'
  | 'GATE ENCERRADO'
  | 'DESATRACADO'
  | 'FINALIZADO'
  | 'EM TRÂNSITO'
  | 'FUNDEADO'
  | 'AGUARDANDO JANELA'
  | 'SAÍDO';

export interface MonitoredShip {
  id: string;
  shipName: string;
  voyage: string;
  terminal: string;
  status: ShipStatus;
  eta?: string;        // ISO datetime
  etd?: string;        // ISO datetime
  ataDate?: string;    // actual arrival
  atdDate?: string;    // actual departure
  notes?: string;
  linkedTripOs?: string;   // optional link to a trip OS
  createdAt: string;
  updatedAt: string;
}

export interface TerminalService {
  id: string;
  name: string;
  url: string;
  status: 'online' | 'offline' | 'checking' | 'unknown';
  lastCheck?: string;
  responseMs?: number;
}

export interface ShipTerminalConfig {
  id: string;
  name: string;
  url: string;
  active: boolean;
  sortOrder: number;
}
