import { createClient } from '@supabase/supabase-js';
import {
  User, Driver, Customer, Port, PreStacking, Staff, Trip, Category,
  Notification, AvantidaRecord, AvantidaPriceRule, SealBatch, SealRecord, StaySession,
  StayRecord, NotificationType, NotificationOrigin, PresenceStatus,
  LoginCredential, EmailTemplate, CustomStatus, Automation, HandoverPost, HandoverComment, HandoverNotification, DutySwapRequest,
  BotGroup, BotAutomation, FreightContract, Beneficiary, MonitoredShip, ShipTerminalConfig, Ship,
  Devolucao, DevolucaoStatus, Liberacao, LiberacaoStatus,
  FreightRoute, FreightVehicleType
} from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

import { getEnv } from './env';

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Fallback local para Mensagens Prontas (caso a tabela Supabase não exista ainda)
const LOCAL_MESSAGE_TEMPLATES_KEY = 'als_message_templates';

function readLocalMessageTemplates(): import('../types').MessageTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGE_TEMPLATES_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? [...list].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      : [];
  } catch {
    return [];
  }
}

function writeLocalMessageTemplates(list: import('../types').MessageTemplate[]) {
  try {
    localStorage.setItem(LOCAL_MESSAGE_TEMPLATES_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[message_templates] erro ao salvar localmente', e);
  }
}

function mapShipFromDb(row: any): Ship {
  return {
    id: row.id,
    name: row.name,
    imo: row.imo,
    armador: row.armador,
    viagem: row.viagem,
    terminal: row.terminal,
    berco: row.berco,
    eta: row.eta,
    etd: row.etd,
    prevAtracacao: row.prev_atracacao,
    abertGate: row.abert_gate,
    deadLine: row.dead_line,
    dataAtracacao: row.data_atracacao,
    dataDesatrac: row.data_desatrac,
    statusHistory: row.status_history || [],
    status: row.status || 'NOVO',
    observacoes: row.observacoes,
    tripIds: row.trip_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapShipToDb(s: Partial<Ship>): any {
  return {
    ...(s.name !== undefined && { name: s.name }),
    ...(s.imo !== undefined && { imo: s.imo }),
    ...(s.armador !== undefined && { armador: s.armador }),
    ...(s.viagem !== undefined && { viagem: s.viagem }),
    ...(s.terminal !== undefined && { terminal: s.terminal }),
    ...(s.berco !== undefined && { berco: s.berco }),
    ...(s.eta !== undefined && { eta: s.eta }),
    ...(s.etd !== undefined && { etd: s.etd }),
    ...(s.prevAtracacao !== undefined && { prev_atracacao: s.prevAtracacao || null }),
    ...(s.abertGate !== undefined && { abert_gate: s.abertGate || null }),
    ...(s.deadLine !== undefined && { dead_line: s.deadLine || null }),
    ...(s.dataAtracacao !== undefined && { data_atracacao: s.dataAtracacao || null }),
    ...(s.dataDesatrac !== undefined && { data_desatrac: s.dataDesatrac || null }),
    ...(s.statusHistory !== undefined && { status_history: s.statusHistory }),
    ...(s.status !== undefined && { status: s.status }),
    ...(s.observacoes !== undefined && { observacoes: s.observacoes }),
    ...(s.tripIds !== undefined && { trip_ids: s.tripIds }),
  };
}

// Normaliza reações do feed: aceita o formato antigo (lista de userIds) e o
// novo (lista de { id, name }), sempre devolvendo { id, name }.
function normHandoverReactions(raw: any): Record<string, { id: string; name: string }[]> {
  const out: Record<string, { id: string; name: string }[]> = {};
  if (raw && typeof raw === 'object') {
    for (const emoji of Object.keys(raw)) {
      const arr = Array.isArray(raw[emoji]) ? raw[emoji] : [];
      out[emoji] = arr.map((u: any) =>
        typeof u === 'string' ? { id: u, name: '' } : { id: String(u?.id || ''), name: u?.name || '' }
      ).filter((u: any) => u.id);
    }
  }
  return out;
}

export const db = {
  checkConnection: async () => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch { return false; }
  },

  getUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map(u => ({
      id: u.id,
      username: u.username || '',
      password: u.password,
      displayName: u.display_name || u.displayname || u.username || 'Usuário',
      role: u.role,
      lastLogin: u.lastlogin || u.lastLogin,
      photo: u.photo,
      position: u.position,
      driverId: u.driver_id || u.driverid,
      staffId: u.staff_id || u.staffid,
      status: u.status,
      isFirstLogin: u.isfirstlogin,
      lastSeen: u.last_seen || u.lastseen,
      presence_status: u.presence_status,
      thirdPartyConfig: u.config,
      notificationPrefs: u.notification_prefs || undefined,
    }));
  },

  saveUser: async (user: User): Promise<string | false> => {
    if (!supabase) return false;
    const payload = {
      id: user.id,
      username: user.username?.trim(),
      password: user.password,
      display_name: user.displayName?.trim(),
      role: user.role,
      lastlogin: user.lastLogin,
      photo: user.photo,
      position: user.position?.trim(),
      driver_id: user.driverId,
      staff_id: user.staffId,
      status: user.status,
      isfirstlogin: user.isFirstLogin,
      last_seen: user.lastSeen,
      presence_status: user.presence_status,
      config: user.thirdPartyConfig,
      notification_prefs: user.notificationPrefs || null,
    };
    const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
    // Se o id não existe mas o username já está ocupado (race condition / CPF duplicado),
    // buscamos o id real pelo username e atualizamos esse registro
    if (error?.code === '23505' && user.username) {
      const { data: existing } = await supabase
        .from('users').select('id').eq('username', user.username.trim()).maybeSingle();
      if (existing?.id) {
        const { error: e2 } = await supabase
          .from('users').upsert({ ...payload, id: existing.id }, { onConflict: 'id' });
        if (e2) { console.error('[saveUser] Erro:', e2.message); return false; }
        return existing.id; // Retorna o ID real do usuário existente
      }
    }
    if (error) { console.error('[saveUser] Erro:', error.message); return false; }
    return user.id;
  },

  deleteUser: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').delete().eq('id', id);
    return !error;
  },

  // ── Contratos de frete avulsos (sem vínculo com viagem) ──────────────────────
  saveStandaloneContract: async (doc: {
    id: string; code: string; url: string; fileName: string;
    uploadDate: string; expiresAt?: string; parsedData?: Record<string, string | undefined>;
  }) => {
    if (!supabase) return false;
    const { error } = await supabase.from('standalone_freight_contracts').upsert({
      id: doc.id, code: doc.code, url: doc.url, file_name: doc.fileName,
      upload_date: doc.uploadDate, expires_at: doc.expiresAt || null,
      parsed_data: doc.parsedData || null,
    }, { onConflict: 'id' });
    if (error) console.error('[saveStandaloneContract] Erro:', error.code, error.message);
    return !error;
  },

  getStandaloneContracts: async () => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('standalone_freight_contracts')
      .select('*')
      .order('upload_date', { ascending: false });
    if (error) { console.error('[getStandaloneContracts] Erro:', error.code, error.message); return []; }
    const now = new Date();
    return (data || [])
      .filter((r: any) => !r.expires_at || new Date(r.expires_at) > now)
      .map((r: any) => ({
        id: r.id, code: r.code, url: r.url, fileName: r.file_name,
        uploadDate: r.upload_date, expiresAt: r.expires_at || undefined,
        parsedData: r.parsed_data || undefined,
      }));
  },

  deleteStandaloneContract: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('standalone_freight_contracts').delete().eq('id', id);
    return !error;
  },

  changePassword: async (userId: string, newPassword: string) => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword, isfirstlogin: false })
      .eq('id', userId);
    return !error;
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('users')
      .update({ presence_status: status, last_seen: new Date().toISOString() })
      .eq('id', userId);
    return !error;
  },

  getDrivers: () => driverRepository.getAll(supabase!),
  saveDriver: async (d: Driver, user?: User) => {
    const res = await driverRepository.save(supabase!, d);
    if (user) db.logActivity('MOTORISTA', d.id ? 'EDICAO' : 'CRIACAO', `Cadastro de motorista ${d.name || ''}`, { user, entityId: d.id, entityLabel: d.name });
    return res;
  },
  deleteDriver: (id: string) => driverRepository.delete(supabase!, id),

  updateDriverLastFreightContract: async (driverId: string, date: string, location?: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('drivers').update({
      last_freight_contract_date: date,
      last_freight_contract_location: location?.trim() || null,
    }).eq('id', driverId);
    if (error) console.error('[updateDriverLastFreightContract]', error.message);
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      legalName: c.legal_name || c.legalName,
      zipCode: c.zip_code || c.zipCode,
      registrationDate: c.registration_date || c.registrationdate || c.registrationDate
    }));
  },

  saveCustomer: async (c: Partial<Customer>, user?: User) => {
    if (!supabase) {
      console.error("Supabase não inicializado. Verifique as variáveis de ambiente.");
      return false;
    }
    
    const payload: any = {
      id: c.id,
      name: c.name,
      address: c.address,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
      cnpj: c.cnpj,
      operations: c.operations,
      legal_name: c.legalName,
      zip_code: c.zipCode,
      registrationDate: c.registrationDate
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    // Log removed
    const { error } = await supabase.from('customers').upsert(payload);
    if (error) {
      console.error("ERRO DETALHADO CLIENTE:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    if (user) db.logActivity('CLIENTE', c.id ? 'EDICAO' : 'CRIACAO', `Cadastro de cliente ${c.name || ''}`, { user, entityId: c.id, entityLabel: c.name });
    return true;
  },

  deleteCustomer: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    return !error;
  },

  getPorts: async (): Promise<Port[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('ports').select('*').order('name');
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Schema discovery log removed
    }

    return (data || []).map(p => ({
      ...p,
      legalName: p.legal_name || p.legalName,
      zipCode: p.zip_code || p.zipCode,
      registrationDate: p.registration_date || p.registrationdate || p.registrationDate
    }));
  },

  savePort: async (p: Partial<Port>, user?: User) => {
    if (!supabase) {
      console.error("Supabase não inicializado.");
      return false;
    }
    
    const payload: any = {
      id: p.id,
      name: p.name,
      address: p.address,
      neighborhood: p.neighborhood,
      city: p.city,
      state: p.state,
      cnpj: p.cnpj,
      legal_name: p.legalName,
      zip_code: p.zipCode,
      registrationDate: p.registrationDate
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    
    // Log removed
    const { error } = await supabase.from('ports').upsert(payload);
    if (error) {
      console.error("ERRO DETALHADO PORTO:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    if (user) db.logActivity('PORTO', p.id ? 'EDICAO' : 'CRIACAO', `Cadastro de porto ${p.name || ''}`, { user, entityId: p.id, entityLabel: p.name });
    return true;
  },

  deletePort: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('ports').delete().eq('id', id);
    return !error;
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('pre_stacking').select('*').order('name');
    if (error) throw error;

    if (data && data.length > 0) {
      // Schema discovery log removed
    }

    return (data || []).map(p => ({
      ...p,
      legalName: p.legal_name || p.legalName,
      zipCode: p.zip_code || p.zipCode,
      registrationDate: p.registration_date || p.registrationdate || p.registrationDate
    }));
  },

  savePreStacking: async (p: Partial<PreStacking>, user?: User) => {
    if (!supabase) {
      console.error("Supabase não inicializado.");
      return false;
    }
    
    const payload: any = {
      id: p.id,
      name: p.name,
      cnpj: p.cnpj,
      address: p.address,
      neighborhood: p.neighborhood,
      city: p.city,
      state: p.state,
      legal_name: p.legalName,
      zip_code: p.zipCode,
      registrationDate: p.registrationDate
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    // Log removed
    const { error } = await supabase.from('pre_stacking').upsert(payload);
    if (error) {
      console.error("ERRO DETALHADO UNIDADE:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    if (user) db.logActivity('PRE-STACKING', p.id ? 'EDICAO' : 'CRIACAO', `Cadastro de unidade pré-stacking ${p.name || ''}`, { user, entityId: p.id, entityLabel: p.name });
    return true;
  },

  deletePreStacking: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking').delete().eq('id', id);
    return !error;
  },

  getStaff: () => staffRepository.getAll(supabase!),
  saveStaff: (s: Staff, password?: string) => staffRepository.save(supabase!, s, password),
  deleteStaff: (id: string) => staffRepository.delete(supabase!, id),

  getTrips: () => tripRepository.getAll(supabase!),
  saveTrip: async (t: Trip, user?: User) => {
    const res = await tripRepository.save(supabase!, t, user);
    // Registra na auditoria apenas quando há um usuário responsável explícito
    // (evita ruído dos autosaves internos que não passam usuário).
    if (user) db.logActivity('VIAGEM', 'EDICAO', `Viagem OS ${t.os || '—'} — status: ${t.status || '—'}`, { user, entityId: t.id, entityLabel: t.os || t.container });
    return res;
  },
  deleteTrip: async (id: string, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (!error && user) db.logActivity('VIAGEM', 'EXCLUSAO', `Viagem removida`, { user, entityId: id });
    return !error;
  },

  subscribeToTrips: (callback: (trips: Trip[]) => void) => {
    if (!supabase) return () => {};
    
    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, async () => {
        const trips = await tripRepository.getAll(supabase!);
        callback(trips);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  },

  getCategories: async (): Promise<Category[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id,
      color: c.color,
      allowDuplicateOS: c.allow_duplicate_os ?? false,
      createdAt: c.created_at
    }));
  },

  saveCategory: async (c: Partial<Category>, user?: User) => {
    if (!supabase) return false;
    
    // Tentativa inicial com a coluna color
    const { error } = await supabase.from('categories').upsert({
      id: c.id,
      name: c.name,
      parent_id: c.parentId,
      color: c.color,
      allow_duplicate_os: c.allowDuplicateOS ?? false,
      created_at: new Date().toISOString()
    });

    if (error) {
      if (error.code === 'PGRST204' || error.message.includes('color') || error.message.includes('allow_duplicate_os')) {
        console.warn('Coluna opcional não encontrada em "categories". Tentando salvar sem ela...');
        const { error: retryError } = await supabase.from('categories').upsert({
          id: c.id,
          name: c.name,
          parent_id: c.parentId,
          created_at: new Date().toISOString()
        });

        if (retryError) {
          console.error('Error saving category (retry):', retryError);
          return false;
        }
        return true;
      }

      console.error('Error saving category:', error);
      return false;
    }
    return true;
  },

  getContainerTypes: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('container_types').select('*').order('name');
    if (error) return [];
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      createdAt: c.created_at
    }));
  },

  saveContainerType: async (c: any) => {
    if (!supabase) return false;
    const { error } = await supabase.from('container_types').upsert({
      id: c.id,
      name: c.name,
      created_at: c.createdAt || new Date().toISOString()
    });
    return !error;
  },

  deleteContainerType: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('container_types').delete().eq('id', id);
    return !error;
  },

  // ─── PESSOAS AUTORIZADAS (selecionáveis nos memorandos) ──────────────────
  getAuthorizedPersons: async (): Promise<import('../types').AuthorizedPerson[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('pessoas_autorizadas').select('*').order('name');
    if (error) { console.error('[getAuthorizedPersons]', error.message); return []; }
    return (data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      cpf: p.cpf || undefined,
      rg: p.rg || undefined,
      veiculo: p.veiculo || undefined,
      createdAt: p.created_at,
    }));
  },

  saveAuthorizedPerson: async (p: import('../types').AuthorizedPerson): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('pessoas_autorizadas').upsert({
      id: p.id,
      name: p.name,
      cpf: p.cpf || null,
      rg: p.rg || null,
      veiculo: p.veiculo || null,
      created_at: p.createdAt || new Date().toISOString(),
    });
    if (error) { console.error('[saveAuthorizedPerson]', error.message); return false; }
    return true;
  },

  deleteAuthorizedPerson: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('pessoas_autorizadas').delete().eq('id', id);
    if (error) { console.error('[deleteAuthorizedPerson]', error.message); return false; }
    return true;
  },

  getColetaTiposViagem: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('coleta_tipos_viagem').select('*').order('name');
    if (error) return [];
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      config: c.config || {},
      createdAt: c.created_at
    }));
  },

  saveColetaTipoViagem: async (c: any) => {
    if (!supabase) return false;
    const payload: any = {
      name: c.name,
      color: c.color,
      config: c.config || {},
      created_at: c.createdAt || new Date().toISOString()
    };

    let error;
    if (c.id) {
      const { error: updateError } = await supabase.from('coleta_tipos_viagem').update(payload).eq('id', c.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('coleta_tipos_viagem').insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("ERRO DETALHADO COLETA TIPO VIAGEM:", error);
      return false;
    }
    return true;
  },

  deleteColetaTipoViagem: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('coleta_tipos_viagem').delete().eq('id', id);
    return !error;
  },

  getOperationTypes: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('operation_types').select('*').order('name');
    if (error) return [];
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      config: c.config || {},  // config usado em OperationTypesManager (categoria, tipos de viagem)
      createdAt: c.created_at
    }));
  },

  saveOperationType: async (c: any) => {
    if (!supabase) return false;
    const payload: any = {
      name: c.name,
      color: c.color,
      config: c.config || {},
      created_at: c.createdAt || new Date().toISOString()
    };

    let error;
    if (c.id) {
      const { error: updateError } = await supabase.from('operation_types').update(payload).eq('id', c.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('operation_types').insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("ERRO DETALHADO TIPO OPERACAO:", error);
      return false;
    }
    return true;
  },

  deleteOperationType: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('operation_types').delete().eq('id', id);
    return !error;
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .gte('timestamp', cutoff)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(n => ({
      id: String(n.id),
      title: n.title,
      description: n.message || n.description,
      type: n.type,
      origin: n.origin,
      authorName: n.user_name || n.authorName,
      authorId: n.user_id || n.authorId,
      timestamp: n.timestamp,
      summary: n.summary || { os: n.os_ref }
    }));
  },

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: any) => {
    if (!supabase) return false;
    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      user_name: user.displayName,
      type, title,
      message: description,
      origin: (user.role === 'driver' || user.role === 'motoboy') ? 'MOTORISTA' : 'OPERACIONAL',
      timestamp: new Date().toISOString(),
      summary: summary,
      os_ref: summary?.os
    });
    return !error;
  },

  saveFormHistory: async (formType: string, formData: any, label: string, user: any) => {
    if (!supabase) return false;
    const { error } = await supabase.from('form_history').insert({
      form_type: formType,
      form_data: formData,
      label,
      user_name: user?.displayName || 'Sistema',
      user_id: user?.id || null,
    });
    if (error) console.error('[saveFormHistory] Erro ao salvar histórico:', error.message, error);
    if (!error) db.logActivity('FORMULARIO', 'CRIACAO', `Formulário ${formType} — ${label || ''}`, { user, entityLabel: label });
    return !error;
  },

  getFormHistory: async (formType: string, limit = 8) => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('form_history')
      .select('*')
      .eq('form_type', formType)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[getFormHistory] Erro ao buscar histórico:', error.message, error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      formType: r.form_type,
      formData: r.form_data,
      label: r.label || '',
      userName: r.user_name || '',
      userId: r.user_id || '',
      createdAt: r.created_at,
    }));
  },

  getAllFormHistory: async (limit = 100): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('form_history')
      .select('*')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.error('[getAllFormHistory]', error.message); return []; }
    return (data || []).map((r: any) => ({
      id: r.id,
      formType: r.form_type,
      formData: r.form_data,
      label: r.label || '',
      userName: r.user_name || '',
      userId: r.user_id || '',
      createdAt: r.created_at,
    }));
  },

  deleteFormHistory: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('form_history').delete().eq('id', id);
    if (error) { console.error('[deleteFormHistory]', error.message); return false; }
    return true;
  },

  // Remove registros com mais de 90 dias de form_history e notifications.
  // Chamado silenciosamente na inicialização da sessão.
  purgeOldHistory: async () => {
    if (!supabase) return;
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('form_history').delete().lt('created_at', cutoff);
    await supabase.from('notifications').delete().lt('timestamp', cutoff);
  },

  // Fallback: grava no form_history genérico quando a tabela dedicada falhar
  // (tabela ausente, RLS, etc.) — a emissão nunca se perde.
  _saveEmissaoFallback: async (formType: string, formData: any, label: string, user: any): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('form_history').insert({
      form_type: formType,
      form_data: formData,
      label,
      user_name: user?.displayName || 'Sistema',
      user_id: user?.id || null,
    });
    if (error) { console.error('[_saveEmissaoFallback]', formType, error.message); return false; }
    return true;
  },

  // Lê emissões do form_history genérico para um tipo (legado + fallback)
  _getEmissoesFallback: async (formType: string, limit: number): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('form_history')
      .select('*').eq('form_type', formType)
      .gte('created_at', cutoff).order('created_at', { ascending: false }).limit(limit);
    if (error) return [];
    return (data || []).map((r: any) => ({
      id: r.id, formType: r.form_type, formData: r.form_data,
      label: r.label || '', userName: r.user_name || '', userId: r.user_id || '', createdAt: r.created_at,
    }));
  },

  // ─── ORDENS DE COLETA ────────────────────────────────────────────────────
  saveOrdemColeta: async (formData: any, user: any): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('ordens_coleta').insert({
      os: formData.os || null,
      container: formData.container || null,
      booking: formData.booking || null,
      form_data: formData,
      user_name: user?.displayName || 'Sistema',
      user_id: user?.id || null,
    });
    if (error) {
      console.error('[saveOrdemColeta]', error.message);
      return db._saveEmissaoFallback('ORDEM_COLETA', formData, formData.os || formData.container || formData.booking || '', user);
    }
    return true;
  },

  getOrdemColetaHistory: async (limit = 8): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('ordens_coleta')
      .select('*').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(limit);
    if (error) console.error('[getOrdemColetaHistory]', error.message);
    const dedicated = (data || []).map((r: any) => ({
      id: r.id, formType: 'ORDEM_COLETA', formData: r.form_data,
      label: r.os || r.container || r.booking || '',
      userName: r.user_name || '', userId: r.user_id || '', createdAt: r.created_at,
    }));
    const fallback = await db._getEmissoesFallback('ORDEM_COLETA', limit);
    return [...dedicated, ...fallback]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  deleteOrdemColeta: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('ordens_coleta').delete().eq('id', id);
    return !error;
  },

  // ─── PRÉ-STACKING EMISSÕES ───────────────────────────────────────────────
  savePreStackingEmissao: async (formData: any, user: any): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking_emissoes').insert({
      os: formData.os || null,
      container: formData.container || null,
      booking: formData.booking || null,
      form_data: formData,
      user_name: user?.displayName || 'Sistema',
      user_id: user?.id || null,
    });
    if (error) {
      console.error('[savePreStackingEmissao]', error.message);
      return db._saveEmissaoFallback('PRE_STACKING', formData, formData.container || formData.os || formData.booking || '', user);
    }
    return true;
  },

  getPreStackingEmissaoHistory: async (limit = 8): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('pre_stacking_emissoes')
      .select('*').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(limit);
    if (error) console.error('[getPreStackingEmissaoHistory]', error.message);
    const dedicated = (data || []).map((r: any) => ({
      id: r.id, formType: 'PRE_STACKING', formData: r.form_data,
      label: r.container || r.os || r.booking || '',
      userName: r.user_name || '', userId: r.user_id || '', createdAt: r.created_at,
    }));
    const fallback = await db._getEmissoesFallback('PRE_STACKING', limit);
    return [...dedicated, ...fallback]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  deletePreStackingEmissao: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking_emissoes').delete().eq('id', id);
    return !error;
  },

  // ─── RETIRADAS DE CHEIO ──────────────────────────────────────────────────
  saveRetiradaCheio: async (formData: any, user: any): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('retiradas_cheio').insert({
      container: formData.container || null,
      booking: formData.booking || null,
      ship: formData.ship || null,
      form_data: formData,
      user_name: user?.displayName || 'Sistema',
      user_id: user?.id || null,
    });
    if (error) {
      console.error('[saveRetiradaCheio]', error.message);
      return db._saveEmissaoFallback('RETIRADA_CHEIO', formData, formData.container || formData.booking || '', user);
    }
    return true;
  },

  getRetiradaCheioHistory: async (limit = 8): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('retiradas_cheio')
      .select('*').gte('created_at', cutoff).order('created_at', { ascending: false }).limit(limit);
    if (error) console.error('[getRetiradaCheioHistory]', error.message);
    const dedicated = (data || []).map((r: any) => ({
      id: r.id, formType: 'RETIRADA_CHEIO', formData: r.form_data,
      label: r.container || r.booking || '',
      userName: r.user_name || '', userId: r.user_id || '', createdAt: r.created_at,
    }));
    const fallback = await db._getEmissoesFallback('RETIRADA_CHEIO', limit);
    return [...dedicated, ...fallback]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  deleteRetiradaCheio: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('retiradas_cheio').delete().eq('id', id);
    return !error;
  },

  // ─── HISTÓRICO DE DEVOLUÇÃO (lê da tabela devolucoes) ───────────────────
  getDevolucaoHistory: async (limit = 8): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('devolucoes')
      .select('id, container, booking, ship, agencia, pod, container_type, padrao, obs, local_name, local_id, driver_id, driver_name, customer_id, scheduled_date_time, created_at, user_name, user_id')
      .gte('created_at', cutoff).order('created_at', { ascending: false }).limit(limit);
    if (error) { console.error('[getDevolucaoHistory]', error.message); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, formType: 'DEVOLUCAO_VAZIO',
      formData: {
        container: r.container, booking: r.booking, ship: r.ship,
        agencia: r.agencia, pod: r.pod, tipo: r.container_type,
        padrao: r.padrao, obs: r.obs, manualLocal: r.local_name,
        destinatarioId: r.local_id, driverId: r.driver_id,
        agendamentoDateTime: r.scheduled_date_time,
      },
      label: r.container || r.booking || '',
      userName: r.user_name || r.driver_name || '', userId: r.user_id || r.driver_id || '', createdAt: r.created_at,
    }));
  },

  // ─── HISTÓRICO DE LIBERAÇÃO (lê da tabela liberacoes) ───────────────────
  getLiberacaoHistory: async (limit = 8): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('liberacoes')
      .select('id, booking, ship, agencia, pod, container_type, qtd_container, padrao, obs, local_name, local_id, driver_id, driver_name, customer_id, created_at, user_name, user_id')
      .gte('created_at', cutoff).order('created_at', { ascending: false }).limit(limit);
    if (error) { console.error('[getLiberacaoHistory]', error.message); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, formType: 'LIBERACAO_VAZIO',
      formData: {
        booking: r.booking, ship: r.ship, agencia: r.agencia, pod: r.pod,
        tipo: r.container_type, qtdContainer: r.qtd_container,
        padrao: r.padrao, obs: r.obs, manualLocal: r.local_name,
        destinatarioId: r.local_id, driverId: r.driver_id,
      },
      label: r.booking || '',
      userName: r.user_name || r.driver_name || '', userId: r.user_id || r.driver_id || '', createdAt: r.created_at,
    }));
  },

  // ─── MEMORANDOS: LIBERAÇÃO DE LACRES ─────────────────────────────────────
  // Persistido no form_history genérico (formType LIBERACAO_LACRES), sem tabela dedicada.
  saveLiberacaoLacres: async (formData: any, user: any): Promise<boolean> => {
    const label = formData.container || formData.booking || formData.localRetirada || formData.armador || '';
    return db._saveEmissaoFallback('LIBERACAO_LACRES', formData, label, user);
  },

  getLiberacaoLacresHistory: async (limit = 8): Promise<import('../types').FormHistoryEntry[]> => {
    return db._getEmissoesFallback('LIBERACAO_LACRES', limit);
  },

  // ─── HISTÓRICO COMBINADO (todas as emissões) ─────────────────────────────
  getAllEmissoesHistory: async (limit = 500): Promise<import('../types').FormHistoryEntry[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const q = (table: string, cols = '*') =>
      supabase!.from(table).select(cols).gte('created_at', cutoff).order('created_at', { ascending: false }).limit(limit);

    const [ocR, psR, rcR, devR, libR, fhR] = await Promise.allSettled([
      q('ordens_coleta'),
      q('pre_stacking_emissoes'),
      q('retiradas_cheio'),
      q('devolucoes', 'id, container, booking, driver_name, driver_id, user_name, user_id, created_at, container_type, agencia, pod'),
      q('liberacoes',  'id, booking, driver_name, driver_id, user_name, user_id, created_at, container_type, agencia, pod'),
      q('form_history'),
    ]);

    const safe = (r: PromiseSettledResult<any>, map: (d: any) => any) =>
      r.status === 'fulfilled' && !r.value.error ? (r.value.data || []).map(map) : [];

    const raw: import('../types').FormHistoryEntry[] = [
      ...safe(ocR,  (r) => ({ id: r.id, formType: 'ORDEM_COLETA',    formData: r.form_data, label: r.os || r.container || r.booking || '',  userName: r.user_name || '',                       userId: r.user_id || '',       createdAt: r.created_at })),
      ...safe(psR,  (r) => ({ id: r.id, formType: 'PRE_STACKING',    formData: r.form_data, label: r.container || r.os || r.booking || '',   userName: r.user_name || '',                       userId: r.user_id || '',       createdAt: r.created_at })),
      ...safe(rcR,  (r) => ({ id: r.id, formType: 'RETIRADA_CHEIO',  formData: r.form_data, label: r.container || r.booking || '',           userName: r.user_name || '',                       userId: r.user_id || '',       createdAt: r.created_at })),
      ...safe(devR, (r) => ({ id: r.id, formType: 'DEVOLUCAO_VAZIO', formData: { container: r.container, booking: r.booking, tipo: r.container_type, agencia: r.agencia, pod: r.pod, driverId: r.driver_id }, label: r.container || r.booking || '', userName: r.user_name || r.driver_name || '', userId: r.user_id || r.driver_id || '', createdAt: r.created_at })),
      ...safe(libR, (r) => ({ id: r.id, formType: 'LIBERACAO_VAZIO', formData: { booking: r.booking, tipo: r.container_type, agencia: r.agencia, pod: r.pod, driverId: r.driver_id },           label: r.booking || '',        userName: r.user_name || r.driver_name || '', userId: r.user_id || r.driver_id || '', createdAt: r.created_at })),
      // form_history genérico: emissões legadas + fallback quando a tabela dedicada falha
      ...safe(fhR,  (r) => ({ id: r.id, formType: r.form_type,       formData: r.form_data, label: r.label || '',                            userName: r.user_name || '',                       userId: r.user_id || '',       createdAt: r.created_at })),
    ];

    const sorted = raw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);

    // Detecta reemissões: entradas com mesmo formType+label = edição, versões 2, 3…
    const versionMap = new Map<string, number>();
    for (const entry of sorted) {
      if (!entry.label) continue;
      const key = `${entry.formType}||${entry.label}`;
      const v = (versionMap.get(key) ?? 0) + 1;
      versionMap.set(key, v);
      if (v > 1) { entry.isEdited = true; entry.editVersion = v; }
    }

    return sorted;
  },

  deleteEmissao: async (id: string, formType: string): Promise<boolean> => {
    if (!supabase) return false;
    const tableMap: Record<string, string> = {
      ORDEM_COLETA:   'ordens_coleta',
      PRE_STACKING:   'pre_stacking_emissoes',
      RETIRADA_CHEIO: 'retiradas_cheio',
      DEVOLUCAO_VAZIO:'devolucoes',
      LIBERACAO_VAZIO:'liberacoes',
    };
    const table = tableMap[formType];
    if (table) {
      const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
      if (!error && (data || []).length > 0) return true;
    }
    // Registro pode estar no form_history genérico (legado / fallback)
    const { error: fhError } = await supabase.from('form_history').delete().eq('id', id);
    return !fhError;
  },

  // ─── AUDITORIA DA ORGANIZAÇÃO ────────────────────────────────────────────
  saveOrgAudit: async (entry: Omit<import('../types').OrgAuditEntry, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('org_audit_log').insert({
      area:         entry.area,
      action:       entry.action,
      description:  entry.description,
      entity_id:    entry.entityId    || null,
      entity_label: entry.entityLabel || null,
      changes:      entry.changes?.length ? entry.changes : null,
      user_name:    entry.userName || 'Sistema',
      user_id:      entry.userId   || null,
    });
    if (error) { console.error('[saveOrgAudit]', error.message); return false; }
    return true;
  },

  getOrgAuditLog: async (limit = 500): Promise<import('../types').OrgAuditEntry[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('org_audit_log')
      .select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) { console.error('[getOrgAuditLog]', error.message); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, area: r.area, action: r.action, description: r.description || '',
      entityId: r.entity_id || undefined, entityLabel: r.entity_label || undefined,
      changes: r.changes || undefined,
      userName: r.user_name || 'Sistema', userId: r.user_id || undefined,
      createdAt: r.created_at,
    }));
  },

  // Registro genérico de atividade/auditoria (quem fez o quê). Reaproveita a
  // tabela org_audit_log. `area` = tipo da entidade (VIAGEM, FORMULARIO,
  // CLIENTE, MOTORISTA, PORTO, PRE-STACKING, ...).
  logActivity: async (
    area: string,
    action: string,
    description: string,
    opts?: { user?: any; entityId?: string; entityLabel?: string; changes?: { field: string; from?: string; to?: string }[] }
  ): Promise<void> => {
    const u = opts?.user;
    try {
      await db.saveOrgAudit({
        area, action, description,
        entityId: opts?.entityId,
        entityLabel: opts?.entityLabel,
        changes: opts?.changes,
        userName: u?.displayName || u?.name || 'Sistema',
        userId: u?.id,
      });
    } catch (e) { /* auditoria nunca deve quebrar a operação */ }
  },

  getAvantidaRecords: async (): Promise<AvantidaRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('avantida_records').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      date: a.date,
      containerNumber: a.container_number,
      exportRef: a.export_ref,
      requestedPrice: Number(a.requested_price || 0),
      customerRef: a.customer_ref,
      tripSettlement: a.trip_settlement,
      verified: a.verified,
      driverId: a.driver_id,
      createdAt: a.created_at,
      shippingLine: a.shipping_line || '',
      importLocation: a.import_location || '',
      reuseDate: a.reuse_date || '',
      status: a.status || 'EM ANÁLISE'
    }));
  },

  saveAvantidaRecord: async (record: Partial<AvantidaRecord>) => {
    if (!supabase) return false;
    
    const payload: any = {
      date: record.date || new Date().toISOString().split('T')[0],
      container_number: record.containerNumber,
      export_ref: record.exportRef || null,
      requested_price: record.requestedPrice || 0,
      customer_ref: record.customerRef || null,
      trip_settlement: record.tripSettlement || null,
      verified: record.verified || false,
      driver_id: record.driverId || null,
      shipping_line: record.shippingLine || null,
      import_location: record.importLocation || null,
      reuse_date: (record.reuseDate && String(record.reuseDate).trim() !== "") ? record.reuseDate : null,
      status: record.status || 'EM ANÁLISE'
    };

    if (record.id && !record.id.startsWith('new-')) {
      payload.id = record.id;
    }

    const { error } = await supabase.from('avantida_records').upsert(payload);
    return !error;
  },

  deleteAvantidaRecord: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('avantida_records').delete().eq('id', id);
    return !error;
  },

  getAvantidaPrices: async (): Promise<AvantidaPriceRule[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('avantida_prices').select('*').order('shipping_line');
    if (error) return [];
    return (data || []).map(p => ({
      id: p.id,
      shippingLine: p.shipping_line,
      price: Number(p.price || 0),
      updatedAt: p.updated_at
    }));
  },

  saveAvantidaPrice: async (rule: Partial<AvantidaPriceRule>) => {
    if (!supabase) return false;
    const payload = {
      id: rule.id || `prc-${Date.now()}`,
      shipping_line: rule.shippingLine?.toUpperCase(),
      price: Number(rule.price || 0),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('avantida_prices').upsert(payload);
    return !error;
  },

  deleteAvantidaPrice: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('avantida_prices').delete().eq('id', id);
    return !error;
  },

  getLogins: async (): Promise<LoginCredential[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('logins').select('*').order('sitename');
    if (error) throw error;
    return (data || []).map(l => ({
      id: l.id,
      siteName: l.sitename,
      url: l.url,
      username: l.username,
      password: l.password,
      additionalFields: l.additionalfields || [],
      createdAt: l.createdat
    }));
  },

  saveLogin: async (l: LoginCredential) => {
    if (!supabase) return false;
    
    const payload: any = {
      sitename: l.siteName,
      url: l.url,
      username: l.username,
      password: l.password,
      additionalfields: l.additionalFields || [],
      createdat: l.createdAt || new Date().toISOString()
    };

    if (l.id && !l.id.startsWith('new-')) {
      payload.id = l.id;
    }

    const { error } = await supabase.from('logins').upsert(payload);
    return !error;
  },

  deleteLogin: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('logins').delete().eq('id', id);
    return !error;
  },

  getSealBatches: async (): Promise<SealBatch[]> => {
    if (!supabase) return [];
    // Busca todos os lotes ordenados pelo mais recente
    const { data, error } = await supabase.from('seal_batches').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Erro getSealBatches:", error);
      return [];
    }
    return (data || []).map(b => ({
      id: b.id,
      carrier: b.carrier,
      startNumber: b.start_number,
      endNumber: b.end_number,
      createdAt: b.created_at
    }));
  },

  getSealRecords: async (batchId: string): Promise<SealRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('seal_records').select('*').eq('batch_id', batchId).order('seal_number');
    if (error) throw error;
    return (data || []).map(r => ({
      id: String(r.id),
      batchId: r.batch_id,
      sealNumber: r.seal_number,
      containerNumber: r.container_number,
      booking: r.booking,
      reuseDate: r.reuse_date || '',
      driverName: r.driver_name
    }));
  },

  saveSealBatch: async (batch: SealBatch, records: Partial<SealRecord>[]) => {
    if (!supabase) return { success: false, message: 'Supabase não configurado.' };
    
    // SEMPRE gera um ID único para novos lotes para evitar sobrescrita acidental
    const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 1. Grava o cabeçalho do lote (UPSERT garantindo ID novo)
    const { error: batchErr } = await supabase.from('seal_batches').insert({
      id: batchId,
      carrier: batch.carrier,
      start_number: batch.startNumber,
      end_number: batch.endNumber,
      created_at: new Date().toISOString()
    });
    
    if (batchErr) {
      console.error("Erro seal_batches:", batchErr);
      return { success: false, message: batchErr.message };
    }

    // 2. Prepara e grava os lacres individuais vinculados ao NOVO batchId
    const recordsToInsert = records.map(r => ({
      batch_id: batchId,
      seal_number: r.sealNumber,
      container_number: r.containerNumber || null,
      booking: r.booking || null,
      reuse_date: (r.reuseDate && String(r.reuseDate).trim() !== "") ? r.reuseDate : null,
      driver_name: r.driverName || null
    }));

    const { error: recErr } = await supabase.from('seal_records').insert(recordsToInsert);
    if (recErr) {
      console.error("Erro seal_records:", recErr);
      // Rollback se falhar a inserção dos itens
      await supabase.from('seal_batches').delete().eq('id', batchId);
      return { success: false, message: recErr.message };
    }

    return { success: true };
  },

  updateSealRecord: async (record: SealRecord) => {
    if (!supabase) return false;
    const { error } = await supabase.from('seal_records').update({
      container_number: record.containerNumber || null,
      booking: record.booking || null,
      reuse_date: (record.reuseDate && String(record.reuseDate).trim() !== "") ? record.reuseDate : null,
      driver_name: record.driverName || null
    }).eq('id', record.id);
    return !error;
  },

  deleteSealBatch: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('seal_batches').delete().eq('id', id);
    return !error;
  },

  getStaySessions: async (): Promise<StaySession[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('stay_sessions').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((s: any) => ({
      id: s.id,
      category: s.category,
      startDate: s.start_date,
      endDate: s.end_date,
      createdAt: s.created_at,
      createdBy: s.created_by,
      gracePeriodHours: s.grace_period_hours,
      roundUpMinutes: s.round_up_minutes,
      costPerHour: s.cost_per_hour,
      customColumns: s.custom_columns,
      useCustomColumns: s.use_custom_columns
    }));
  },

  getStayRecords: async (sessionId: string): Promise<StayRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('stay_records')
      .select('*')
      .eq('session_id', sessionId)
      .order('os');
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      type: r.type,
      os: r.os,
      location: r.location,
      driverName: r.driver_name,
      ship: r.ship,
      container: r.container,
      scheduledStart: r.scheduled_start,
      arrivalTime: r.arrival_time,
      departureTime: r.departure_time,
      exceededHours: r.exceeded_hours,
      observations: r.observations,
      customValues: r.custom_values
    }));
  },

  saveStaySession: async (s: StaySession) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_sessions').upsert({
      id: s.id,
      category: s.category,
      start_date: s.startDate,
      end_date: s.endDate,
      created_at: s.createdAt,
      created_by: s.createdBy,
      grace_period_hours: s.gracePeriodHours,
      round_up_minutes: s.roundUpMinutes,
      cost_per_hour: s.costPerHour,
      custom_columns: s.customColumns,
      use_custom_columns: s.useCustomColumns
    });
    return !error;
  },

  saveStayRecords: async (records: StayRecord[]) => {
    if (!supabase) return false;
    const payload = records.map(r => ({
      id: r.id,
      session_id: r.sessionId,
      type: r.type,
      os: r.os,
      location: r.location,
      driver_name: r.driverName,
      ship: r.ship,
      container: r.container,
      scheduled_start: (!r.scheduledStart || r.scheduledStart === '---') ? null : r.scheduledStart,
      arrival_time: (!r.arrivalTime || r.arrivalTime === '---') ? null : r.arrivalTime,
      departure_time: (!r.departureTime || r.departureTime === '---') ? null : r.departureTime,
      exceeded_hours: r.exceededHours,
      observations: r.observations,
      custom_values: r.customValues || {}
    }));
    const { error } = await supabase.from('stay_records').upsert(payload);
    if (error) console.error("Error saving stay records:", error);
    return !error;
  },

  deleteStaySession: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_sessions').delete().eq('id', id);
    return !error;
  },

  deleteStayRecord: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_records').delete().eq('id', id);
    return !error;
  },

  getEmailTemplates: async (): Promise<EmailTemplate[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('email_templates').select('*').order('name');
    return (data || []).map(t => ({
      id: t.id,
      name: t.name,
      to: t.to,
      cc: t.cc,
      subject: t.subject,
      body: t.body,
      config: t.config,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
  },

  saveEmailTemplate: async (template: EmailTemplate, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('email_templates').upsert({
      id: template.id,
      name: template.name,
      to: template.to,
      cc: template.cc,
      subject: template.subject,
      body: template.body,
      config: template.config,
      created_at: template.createdAt,
      updated_at: template.updatedAt
    });
    if (!error && user) {
      await db.addNotification(
        user,
        template.createdAt === template.updatedAt ? 'EMAIL_TEMPLATE_CREATED' : 'EMAIL_TEMPLATE_UPDATED',
        `Modelo de E-mail: ${template.name}`,
        `O modelo de e-mail "${template.name}" foi salvo por ${user.displayName}.`
      );
    }
    return !error;
  },

  deleteEmailTemplate: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    return !error;
  },

  // ---------------------------------------------------------------------------
  // Mensagens Prontas (WhatsApp) — usa Supabase quando a tabela existe e cai
  // para localStorage como fallback (resiliente caso a migração ainda não tenha
  // sido aplicada ou o Supabase esteja indisponível).
  // ---------------------------------------------------------------------------
  getMessageTemplates: async (): Promise<import('../types').MessageTemplate[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('message_templates').select('*').order('name');
      if (!error) {
        return (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          body: t.body,
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
      }
    }
    return readLocalMessageTemplates();
  },

  saveMessageTemplate: async (template: import('../types').MessageTemplate, user?: User) => {
    if (supabase) {
      const { error } = await supabase.from('message_templates').upsert({
        id: template.id,
        name: template.name,
        body: template.body,
        created_at: template.createdAt,
        updated_at: template.updatedAt
      });
      if (!error) {
        if (user) {
          await db.addNotification(
            user,
            template.createdAt === template.updatedAt ? 'EMAIL_TEMPLATE_CREATED' : 'EMAIL_TEMPLATE_UPDATED',
            `Mensagem Pronta: ${template.name}`,
            `A mensagem pronta "${template.name}" foi salva por ${user.displayName}.`
          );
        }
        return true;
      }
    }
    // Fallback local
    const list = readLocalMessageTemplates().filter(t => t.id !== template.id);
    list.push(template);
    writeLocalMessageTemplates(list);
    return true;
  },

  deleteMessageTemplate: async (id: string) => {
    if (supabase) {
      const { error } = await supabase.from('message_templates').delete().eq('id', id);
      if (!error) return true;
    }
    writeLocalMessageTemplates(readLocalMessageTemplates().filter(t => t.id !== id));
    return true;
  },

  getCustomStatuses: async (): Promise<CustomStatus[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('trip_statuses').select('*').order('order_index');
    if (error) {
      console.error('Erro ao buscar status:', error);
      return [];
    }
    return (data || []).map(s => ({
      id: s.id,
      name: s.name,
      customerId: s.customer_id,
      modality: s.modality,
      destinationId: s.destination_id,
      orderIndex: s.order_index,
      color: s.color,
      isFinal: s.is_final,
      operationalOnly: s.operational_only || false,
    }));
  },

  saveCustomStatus: async (status: CustomStatus) => {
    if (!supabase) return { success: false, error: 'Supabase não inicializado' };
    const { error } = await supabase.from('trip_statuses').upsert({
      id: status.id,
      name: status.name,
      customer_id: status.customerId || null,
      modality: status.modality || null,
      destination_id: status.destinationId || null,
      order_index: status.orderIndex,
      color: status.color || null,
      is_final: status.isFinal || false,
      operational_only: status.operationalOnly || false,
    });
    if (error) {
      console.error('Erro ao salvar status customizado:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  deleteCustomStatus: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trip_statuses').delete().eq('id', id);
    return !error;
  },

  getAutomations: async (): Promise<Automation[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao buscar automações:', error);
      return [];
    }
    return (data || []).map(a => ({
      id: a.id,
      status: a.status,
      emailTemplateId: a.email_template_id,
      whatsappGroupId: a.whatsapp_group_id,
      isActive: a.is_active,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));
  },

  saveAutomation: async (automation: Partial<Automation>) => {
    if (!supabase) return { success: false, error: 'Supabase não inicializado' };
    
    const payload: any = {
      status: automation.status,
      email_template_id: automation.emailTemplateId || null,
      whatsapp_group_id: automation.whatsappGroupId || null,
      is_active: automation.isActive !== undefined ? automation.isActive : true,
      updated_at: new Date().toISOString()
    };

    if (automation.id && !automation.id.startsWith('new-')) {
      payload.id = automation.id;
    } else {
      payload.created_at = new Date().toISOString();
    }

    const { error } = await supabase.from('automations').upsert(payload);
    if (error) {
      console.error('Erro ao salvar automação:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  deleteAutomation: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('automations').delete().eq('id', id);
    return !error;
  },

  exportBackup: async () => {
    if (!supabase) return;
    const tables = ['users', 'drivers', 'customers', 'ports', 'pre_stacking', 'staff', 'trips', 'categories', 'notifications', 'avantida_records', 'avantida_prices', 'logins', 'seal_batches', 'seal_records', 'stay_sessions', 'stay_records', 'email_templates', 'trip_statuses', 'automations'];
    const backup: any = {};
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backup[table] = data;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File) => {
    if (!supabase) return false;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      for (const table in backup) {
        if (backup[table] && Array.isArray(backup[table])) {
          await supabase.from(table).upsert(backup[table]);
        }
      }
      return true;
    } catch { return false; }
  },

  getPreferences: (userId: string) => {
    try {
      const prefs = localStorage.getItem(`als_prefs_${userId}`);
      return prefs ? JSON.parse(prefs) : { visibleColumns: {} };
    } catch { return { visibleColumns: {} }; }
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const prefs = db.getPreferences(userId);
    if (!prefs.visibleColumns) prefs.visibleColumns = {};
    prefs.visibleColumns[componentId] = columns;
    localStorage.setItem(`als_prefs_${userId}`, JSON.stringify(prefs));
  },

  // Passagem de Serviço
  getHandoverPosts: async (limit = 100, offset = 0): Promise<HandoverPost[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('handover_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) { console.error('[getHandoverPosts]', error.message); return []; }
    return (data || []).map(p => ({
      id: String(p.id),
      title: p.title || '',
      content: p.content || '',
      authorId: p.author_id || '',
      authorName: p.author_name || '',
      authorPhoto: p.author_photo,
      authorRole: p.author_role,
      authorPosition: p.author_position || '',
      mentions: p.mentions || [],
      reactions: normHandoverReactions(p.reactions),
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  },

  // Conta posts do feed mais novos que `sinceIso` (novidades desde a última
  // visita). Opcionalmente exclui os posts do próprio usuário.
  getHandoverUnreadCount: async (sinceIso: string | null, excludeAuthorId?: string): Promise<number> => {
    if (!supabase) return 0;
    let q = supabase.from('handover_posts').select('id', { count: 'exact', head: true });
    if (sinceIso) q = q.gt('created_at', sinceIso);
    if (excludeAuthorId) q = q.neq('author_id', excludeAuthorId);
    const { count, error } = await q;
    if (error) { console.error('[getHandoverUnreadCount]', error.message); return 0; }
    return count || 0;
  },

  saveHandoverPost: async (post: Omit<HandoverPost, 'id' | 'createdAt'>): Promise<string | null> => {
    if (!supabase) return null;
    const row: any = {
      content: post.content,
      author_id: post.authorId,
      author_name: post.authorName,
      author_photo: post.authorPhoto,
      author_role: post.authorRole,
      mentions: post.mentions,
    };
    if (post.title !== undefined) row.title = post.title;
    if (post.authorPosition) row.author_position = post.authorPosition;
    let { data, error } = await supabase.from('handover_posts').insert(row).select('id').single();
    // Colunas 'title'/'author_position' podem não existir ainda — refaz sem elas
    if (error && /(title|author_position)/i.test(error.message)) {
      delete row.title;
      delete row.author_position;
      ({ data, error } = await supabase.from('handover_posts').insert(row).select('id').single());
    }
    if (error) { console.error('[saveHandoverPost]', error.message); return null; }
    return String(data?.id);
  },

  deleteHandoverPost: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_posts').delete().eq('id', id);
    if (error) { console.error('[deleteHandoverPost]', error.message); return false; }
    return true;
  },

  updateHandoverPost: async (id: string, content: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_posts')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('[updateHandoverPost]', error.message); return false; }
    return true;
  },

  getHandoverComments: async (postId: string): Promise<HandoverComment[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('handover_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[getHandoverComments]', error.message); return []; }
    return (data || []).map(c => ({
      id: String(c.id),
      postId: c.post_id,
      parentId: c.parent_id || undefined,
      content: c.content || '',
      stickerUrl: c.sticker_url || undefined,
      attachments: Array.isArray(c.attachments) ? c.attachments : [],
      authorId: c.author_id || '',
      authorName: c.author_name || '',
      authorPhoto: c.author_photo,
      authorRole: c.author_role,
      authorPosition: c.author_position || '',
      reactions: normHandoverReactions(c.reactions),
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  },

  saveHandoverComment: async (comment: Omit<HandoverComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    if (!supabase) return null;
    const row: any = {
      post_id: comment.postId,
      content: comment.content,
      author_id: comment.authorId,
      author_name: comment.authorName,
      author_photo: comment.authorPhoto,
      author_role: comment.authorRole,
    };
    if (comment.parentId) row.parent_id = comment.parentId;
    if (comment.authorPosition) row.author_position = comment.authorPosition;
    if (comment.stickerUrl) row.sticker_url = comment.stickerUrl;
    if (comment.attachments && comment.attachments.length) row.attachments = comment.attachments;
    let { data, error } = await supabase.from('handover_comments').insert(row).select('id').single();
    // Colunas opcionais podem não existir ainda — refaz sem elas
    if (error && /(parent_id|author_position|sticker_url|attachments)/i.test(error.message)) {
      delete row.parent_id;
      delete row.author_position;
      delete row.sticker_url;
      delete row.attachments;
      ({ data, error } = await supabase.from('handover_comments').insert(row).select('id').single());
    }
    if (error) { console.error('[saveHandoverComment]', error.message); return null; }
    return String(data?.id);
  },

  updateHandoverComment: async (id: string, content: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('[updateHandoverComment]', error.message); return false; }
    return true;
  },

  deleteHandoverComment: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_comments').delete().eq('id', id);
    if (error) { console.error('[deleteHandoverComment]', error.message); return false; }
    return true;
  },

  // Reações (emoji -> quem reagiu) em posts ou comentários do feed
  updateHandoverReactions: async (
    kind: 'post' | 'comment',
    id: string,
    reactions: Record<string, { id: string; name: string }[]>
  ): Promise<boolean> => {
    if (!supabase) return false;
    const table = kind === 'post' ? 'handover_posts' : 'handover_comments';
    const { error } = await supabase.from(table).update({ reactions }).eq('id', id);
    if (error) { console.error('[updateHandoverReactions]', error.message); return false; }
    return true;
  },

  // ── Notificações do Feed ────────────────────────────────────────────────────
  createHandoverNotification: async (n: Omit<HandoverNotification, 'id' | 'read' | 'createdAt'>): Promise<void> => {
    if (!supabase) return;
    // Não notifica a si mesmo
    if (n.actorId && (n.actorId === n.recipientUserId)) return;
    const { error } = await supabase.from('handover_notifications').insert({
      recipient_user_id:  n.recipientUserId || null,
      recipient_staff_id: n.recipientStaffId || null,
      recipient_name:     n.recipientName || null,
      actor_id:           n.actorId || null,
      actor_name:         n.actorName || null,
      type:               n.type,
      post_id:            n.postId || null,
      comment_id:         n.commentId || null,
      excerpt:            n.excerpt || null,
    });
    if (error) console.error('[createHandoverNotification]', error.message);
  },

  getHandoverNotifications: async (userId?: string, staffId?: string): Promise<HandoverNotification[]> => {
    if (!supabase) return [];
    const ors: string[] = [];
    if (userId)  ors.push(`recipient_user_id.eq.${userId}`);
    if (staffId) ors.push(`recipient_staff_id.eq.${staffId}`);
    if (ors.length === 0) return [];
    const { data, error } = await supabase
      .from('handover_notifications')
      .select('*')
      .or(ors.join(','))
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) { console.error('[getHandoverNotifications]', error.message); return []; }
    return (data || []).map(r => ({
      id: String(r.id),
      recipientUserId: r.recipient_user_id || undefined,
      recipientStaffId: r.recipient_staff_id || undefined,
      recipientName: r.recipient_name || undefined,
      actorId: r.actor_id || undefined,
      actorName: r.actor_name || undefined,
      type: (r.type || 'mention') as HandoverNotification['type'],
      postId: r.post_id || undefined,
      commentId: r.comment_id || undefined,
      excerpt: r.excerpt || undefined,
      read: !!r.read,
      createdAt: r.created_at,
    }));
  },

  markHandoverNotificationRead: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('handover_notifications').update({ read: true }).eq('id', id);
    if (error) console.error('[markHandoverNotificationRead]', error.message);
  },

  markAllHandoverNotificationsRead: async (userId?: string, staffId?: string): Promise<void> => {
    if (!supabase) return;
    const ors: string[] = [];
    if (userId)  ors.push(`recipient_user_id.eq.${userId}`);
    if (staffId) ors.push(`recipient_staff_id.eq.${staffId}`);
    if (ors.length === 0) return;
    const { error } = await supabase.from('handover_notifications').update({ read: true }).or(ors.join(',')).eq('read', false);
    if (error) console.error('[markAllHandoverNotificationsRead]', error.message);
  },

  getHandoverEditWindow: async (): Promise<number> => {
    if (!supabase) return 30;
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'handover_edit_window')
      .maybeSingle();
    if (error) { console.error('[getHandoverEditWindow]', error.message); return 30; }
    if (data?.value === null || data?.value === undefined) return 30;
    return Number(data.value);
  },

  saveHandoverEditWindow: async (minutes: number): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('system_settings').upsert(
      { key: 'handover_edit_window', value: minutes, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) console.error('[saveHandoverEditWindow]', error.message);
  },

  // ── Escala de Plantão ──────────────────────────────────────────────────────

  getDutyRoster: async (): Promise<string[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'duty_roster')
      .maybeSingle();
    if (error) { console.error('[getDutyRoster]', error.message); return []; }
    return (data?.value as string[]) || [];
  },

  saveDutyRoster: async (roster: string[]): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('system_settings').upsert(
      { key: 'duty_roster', value: roster, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) { console.error('[saveDutyRoster]', error.message); return false; }
    return true;
  },

  sendSwapRequest: async (
    fromStaffId: string, fromStaffName: string,
    toStaffId: string, toStaffName: string,
    message?: string
  ): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('duty_swap_requests').insert({
      from_staff_id: fromStaffId,
      from_staff_name: fromStaffName,
      to_staff_id: toStaffId,
      to_staff_name: toStaffName,
      message: message || null,
      status: 'pending',
    });
    if (error) console.error('[sendSwapRequest]', error.message);
  },

  respondSwapRequest: async (id: string, status: 'accepted' | 'rejected', newRoster?: string[]): Promise<void> => {
    if (!supabase) return;
    await supabase.from('duty_swap_requests').update({ status }).eq('id', id);
    if (status === 'accepted' && newRoster) {
      await supabase.from('system_settings').upsert(
        { key: 'duty_roster', value: newRoster, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    }
  },

  getSwapRequests: async (staffId: string): Promise<DutySwapRequest[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('duty_swap_requests')
      .select('*')
      .or(`from_staff_id.eq.${staffId},to_staff_id.eq.${staffId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) { console.error('[getSwapRequests]', error.message); return []; }
    return (data || []).map(r => ({
      id: String(r.id),
      fromStaffId: r.from_staff_id,
      fromStaffName: r.from_staff_name,
      toStaffId: r.to_staff_id,
      toStaffName: r.to_staff_name,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    }));
  },

  // ── Grupos do WhatsApp (ALS BOT) ───────────────────────────────────────────

  getBotGroups: async (): Promise<BotGroup[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bot_groups')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[getBotGroups]', error.message); return []; }
    return (data || []).map(g => ({
      id: g.id,
      jid: g.jid,
      name: g.name || g.jid,
      type: g.type || 'internal',
      driverId: g.driver_id || null,
      driverName: g.driver_name || null,
      active: g.active === true,
      createdAt: g.created_at,
      updatedAt: g.updated_at,
    }));
  },

  saveBotGroup: async (group: Partial<BotGroup> & { jid: string }): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('bot_groups').upsert({
      jid: group.jid,
      name: group.name || group.jid,
      type: group.type || 'internal',
      driver_id: group.driverId || null,
      driver_name: group.driverName || null,
      active: group.active ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'jid' });
    if (error) { console.error('[saveBotGroup]', error.message); return false; }
    return true;
  },

  deleteBotGroup: async (jid: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('bot_groups').delete().eq('jid', jid);
    if (error) { console.error('[deleteBotGroup]', error.message); return false; }
    return true;
  },

  // ── Automações do Bot WhatsApp ─────────────────────────────────────────────

  getBotAutomations: async (): Promise<BotAutomation[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('bot_automations')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.error('[getBotAutomations]', error.message); return []; }
    return (data || []).map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      isActive: a.is_active,
      scheduleTime: a.schedule_time || undefined,
      scheduleDays: a.schedule_days || undefined,
      triggerStatus: a.trigger_status || undefined,
      delayMinutes: a.delay_minutes ?? 0,
      reminderMinutes: a.reminder_minutes ?? 60,
      target: a.target || 'internals',
      targetJid: a.target_jid || undefined,
      messageTemplate: a.message_template || '',
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));
  },

  saveBotAutomation: async (auto: Partial<BotAutomation>): Promise<boolean> => {
    if (!supabase) return false;
    const payload: any = {
      name:             auto.name,
      type:             auto.type,
      is_active:        auto.isActive ?? true,
      schedule_time:    auto.scheduleTime   || null,
      schedule_days:    auto.scheduleDays   || null,
      trigger_status:   auto.triggerStatus  || null,
      delay_minutes:    auto.delayMinutes   ?? 0,
      reminder_minutes: auto.reminderMinutes ?? 60,
      target:           auto.target         || 'internals',
      target_jid:       auto.targetJid      || null,
      message_template: auto.messageTemplate || '',
      updated_at:       new Date().toISOString(),
    };
    if (auto.id) {
      const { error } = await supabase.from('bot_automations').update(payload).eq('id', auto.id);
      if (error) { console.error('[saveBotAutomation update]', error.message); return false; }
    } else {
      const { error } = await supabase.from('bot_automations').insert(payload);
      if (error) { console.error('[saveBotAutomation insert]', error.message); return false; }
    }
    return true;
  },

  // ── Contratos de Frete ────────────────────────────────────────────────────

  getFreightContracts: async (): Promise<FreightContract[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('freight_contracts')
      .select('*')
      .order('uploaded_at', { ascending: false });
    if (error) { console.error('[getFreightContracts]', error.message); return []; }
    return (data || []).map(r => ({
      id:             r.id,
      fileName:       r.file_name,
      fileUrl:        r.file_url || undefined,
      contractNumber: r.contract_number || undefined,
      container:      r.container || undefined,
      tripId:         r.trip_id || undefined,
      tripOs:         r.trip_os || undefined,
      destination:    r.destination || undefined,
      driverId:       r.driver_id || undefined,
      driverName:     r.driver_name || undefined,
      status:         r.status,
      uploadedAt:     r.uploaded_at,
    }));
  },

  saveFreightContract: async (c: Omit<FreightContract, 'id' | 'uploadedAt'>): Promise<string | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('freight_contracts').insert({
      file_name:       c.fileName,
      file_url:        c.fileUrl || null,
      contract_number: c.contractNumber || null,
      container:       c.container || null,
      trip_id:         c.tripId || null,
      trip_os:         c.tripOs || null,
      destination:     c.destination || null,
      driver_id:       c.driverId || null,
      driver_name:     c.driverName || null,
      status:          c.status,
      updated_at:      new Date().toISOString(),
    }).select('id').single();
    if (error) { console.error('[saveFreightContract]', error.message); return null; }
    return data?.id ?? null;
  },

  updateFreightContractLink: async (id: string, tripId: string | null, tripOs: string | null, destination: string | null): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('freight_contracts').update({
      trip_id:     tripId,
      trip_os:     tripOs,
      destination: destination,
      status:      tripId ? 'linked' : 'unlinked',
      updated_at:  new Date().toISOString(),
    }).eq('id', id);
    if (error) { console.error('[updateFreightContractLink]', error.message); return false; }
    return true;
  },

  deleteFreightContract: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('freight_contracts').delete().eq('id', id);
    if (error) { console.error('[deleteFreightContract]', error.message); return false; }
    return true;
  },

  deleteBotAutomation: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('bot_automations').delete().eq('id', id);
    if (error) { console.error('[deleteBotAutomation]', error.message); return false; }
    return true;
  },

  getBeneficiaries: async (): Promise<Beneficiary[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('beneficiaries').select('*').order('name');
    if (error) { console.error('[getBeneficiaries]', error.message); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, name: r.name, cpf: r.cpf || undefined, cnpj: r.cnpj || undefined,
      phone: r.phone, email: r.email || undefined, pixKey: r.pix_key || undefined,
      paymentPreference: r.payment_preference || undefined, bankName: r.bank_name || undefined,
      bankAgency: r.bank_agency || undefined, bankAccount: r.bank_account || undefined,
      status: r.status || 'Ativo', registrationDate: r.registration_date || undefined,
      userId: r.user_id || undefined, observations: r.observations || undefined,
    }));
  },

  saveBeneficiary: async (b: Beneficiary): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('beneficiaries').upsert({
      id: b.id, name: b.name, cpf: b.cpf || null, cnpj: b.cnpj || null, phone: b.phone,
      email: b.email || null, pix_key: b.pixKey || null, payment_preference: b.paymentPreference || null,
      bank_name: b.bankName || null, bank_agency: b.bankAgency || null, bank_account: b.bankAccount || null,
      status: b.status, registration_date: b.registrationDate || new Date().toISOString(),
      user_id: b.userId || null, observations: b.observations || null,
    }, { onConflict: 'id' });
    if (error) { console.error('[saveBeneficiary]', error.message); return false; }
    return true;
  },

  deleteBeneficiary: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('beneficiaries').delete().eq('id', id);
    if (error) { console.error('[deleteBeneficiary]', error.message); return false; }
    return true;
  },

  getMonitoredShips: async (): Promise<MonitoredShip[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('monitored_ships').select('*').order('created_at', { ascending: false });
    if (error) { console.error('[getMonitoredShips]', error.message); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, shipName: r.ship_name, voyage: r.voyage, terminal: r.terminal,
      status: r.status, eta: r.eta, etd: r.etd, ataDate: r.ata_date, atdDate: r.atd_date,
      notes: r.notes, linkedTripOs: r.linked_trip_os, createdAt: r.created_at, updatedAt: r.updated_at,
    }));
  },

  saveMonitoredShip: async (s: MonitoredShip): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('monitored_ships').upsert({
      id: s.id, ship_name: s.shipName, voyage: s.voyage, terminal: s.terminal,
      status: s.status, eta: s.eta || null, etd: s.etd || null,
      ata_date: s.ataDate || null, atd_date: s.atdDate || null,
      notes: s.notes || null, linked_trip_os: s.linkedTripOs || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) { console.error('[saveMonitoredShip]', error.message); return false; }
    return true;
  },

  deleteMonitoredShip: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('monitored_ships').delete().eq('id', id);
    if (error) { console.error('[deleteMonitoredShip]', error.message); return false; }
    return true;
  },

  getShipTerminalConfigs: async (): Promise<ShipTerminalConfig[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('ship_terminal_config')
      .select('*')
      .order('sort_order');
    if (error) { console.error('[getShipTerminalConfigs]', error.message); return []; }
    return (data || []).map((r: any) => ({
      id: r.id, name: r.name, url: r.url, active: r.active, sortOrder: r.sort_order,
    }));
  },

  saveShipTerminalConfig: async (t: ShipTerminalConfig): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('ship_terminal_config').upsert({
      id: t.id, name: t.name, url: t.url, active: t.active, sort_order: t.sortOrder,
    }, { onConflict: 'id' });
    if (error) { console.error('[saveShipTerminalConfig]', error.message); return false; }
    return true;
  },

  deleteShipTerminalConfig: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('ship_terminal_config').delete().eq('id', id);
    if (error) { console.error('[deleteShipTerminalConfig]', error.message); return false; }
    return true;
  },

  // ── Ships (Navios) ────────────────────────────────────────────────────────

  getShips: async (): Promise<Ship[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('ships').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapShipFromDb);
  },

  saveShip: async (ship: Partial<Ship>): Promise<Ship> => {
    if (!supabase) throw new Error('Supabase não inicializado');
    const payload = mapShipToDb(ship);
    if (ship.id) {
      const { data, error } = await supabase.from('ships').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', ship.id).select().single();
      if (error) throw error;
      return mapShipFromDb(data);
    }
    const { data, error } = await supabase.from('ships').insert({ ...payload, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    return mapShipFromDb(data);
  },

  deleteShip: async (id: string): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('ships').delete().eq('id', id);
    if (error) throw error;
  },

  // ── Devoluções de Vazio ───────────────────────────────────────────────────

  getDevolucoes: async (): Promise<Devolucao[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('devolucoes').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((r: any): Devolucao => ({
      id:             r.id,
      os:             r.os,
      container:      r.container,
      containerType:  r.container_type   ?? undefined,
      booking:        r.booking          ?? undefined,
      ship:           r.ship             ?? undefined,
      agencia:        r.agencia          ?? undefined,
      pod:            r.pod              ?? undefined,
      padrao:         r.padrao           ?? undefined,
      local:          r.local_name       ?? undefined,
      localId:        r.local_id         ?? undefined,
      customer: r.customer_id ? {
        id:        r.customer_id,
        name:      r.customer_name      ?? '',
        legalName: r.customer_legal_name ?? undefined,
        cnpj:      r.customer_cnpj      ?? undefined,
        city:      r.customer_city      ?? undefined,
        state:     r.customer_state     ?? undefined,
      } : undefined,
      driver: r.driver_id ? {
        id:           r.driver_id,
        name:         r.driver_name          ?? '',
        plateHorse:   r.driver_plate_horse   ?? undefined,
        plateTrailer: r.driver_plate_trailer ?? undefined,
        cpf:          r.driver_cpf           ?? undefined,
      } : undefined,
      scheduledDateTime: r.scheduled_date_time ?? undefined,
      agendamentoDoc: r.agendamento_doc_id ? {
        id:         r.agendamento_doc_id,
        type:       'AGENDAMENTO',
        url:        r.agendamento_doc_url        ?? '',
        fileName:   r.agendamento_doc_file_name  ?? '',
        uploadDate: r.agendamento_doc_upload_date ?? '',
      } : undefined,
      semAgendamento: r.sem_agendamento ?? false,
      obs:         r.obs          ?? undefined,
      status:      (r.status as DevolucaoStatus) ?? 'Pendente',
      isCompleted: r.is_completed ?? false,
      createdAt:   r.created_at,
      updatedAt:   r.updated_at  ?? undefined,
      userName:    r.user_name   ?? undefined,
      userId:      r.user_id     ?? undefined,
    }));
  },

  saveDevolucao: async (d: Devolucao): Promise<boolean> => {
    if (!supabase) return false;
    const now = new Date().toISOString();
    const payload: any = {
      id:                         d.id,
      os:                         d.os,
      container:                  d.container,
      container_type:             d.containerType             ?? null,
      booking:                    d.booking                   ?? null,
      ship:                       d.ship                      ?? null,
      agencia:                    d.agencia                   ?? null,
      pod:                        d.pod                       ?? null,
      padrao:                     d.padrao                    ?? null,
      local_name:                 d.local                     ?? null,
      local_id:                   d.localId                   ?? null,
      customer_id:                d.customer?.id              ?? null,
      customer_name:              d.customer?.name            ?? null,
      customer_legal_name:        d.customer?.legalName       ?? null,
      customer_cnpj:              d.customer?.cnpj            ?? null,
      customer_city:              d.customer?.city            ?? null,
      customer_state:             d.customer?.state           ?? null,
      driver_id:                  d.driver?.id                ?? null,
      driver_name:                d.driver?.name              ?? null,
      driver_plate_horse:         d.driver?.plateHorse        ?? null,
      driver_plate_trailer:       d.driver?.plateTrailer      ?? null,
      driver_cpf:                 d.driver?.cpf               ?? null,
      scheduled_date_time:        d.scheduledDateTime         ?? null,
      agendamento_doc_id:         d.agendamentoDoc?.id        ?? null,
      agendamento_doc_url:        d.agendamentoDoc?.url       ?? null,
      agendamento_doc_file_name:  d.agendamentoDoc?.fileName  ?? null,
      agendamento_doc_upload_date:d.agendamentoDoc?.uploadDate?? null,
      sem_agendamento:            d.semAgendamento            ?? false,
      obs:                        d.obs                       ?? null,
      status:                     d.status,
      is_completed:               d.isCompleted               ?? false,
      user_name:                  d.userName                  ?? null,
      user_id:                    d.userId                    ?? null,
      created_at:                 d.createdAt || now,
      updated_at:                 now,
    };
    const { error } = await supabase.from('devolucoes').upsert(payload);
    if (error && /sem_agendamento/.test(error.message || '')) {
      // Banco ainda sem a coluna (migração pendente) — salva sem a flag
      delete payload.sem_agendamento;
      const { error: retryError } = await supabase.from('devolucoes').upsert(payload);
      return !retryError;
    }
    return !error;
  },

  deleteDevolucao: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('devolucoes').delete().eq('id', id);
    return !error;
  },

  getLiberacoes: async (): Promise<Liberacao[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('liberacoes').select('*').order('created_at', { ascending: false });
    if (error) { console.error('[getLiberacoes]', error.message); return []; }
    return (data || []).map((r: any): Liberacao => ({
      id: r.id,
      os: r.os,
      local: r.local_name || undefined,
      localId: r.local_id || undefined,
      booking: r.booking || undefined,
      ship: r.ship || undefined,
      agencia: r.agencia || undefined,
      pod: r.pod || undefined,
      containerType: r.container_type || undefined,
      qtdContainer: r.qtd_container || undefined,
      padrao: r.padrao || undefined,
      customer: r.customer_id ? {
        id: r.customer_id,
        name: r.customer_name || '',
        legalName: r.customer_legal_name || undefined,
        cnpj: r.customer_cnpj || undefined,
        city: r.customer_city || undefined,
        state: r.customer_state || undefined,
      } : undefined,
      driver: r.driver_id ? {
        id: r.driver_id,
        name: r.driver_name || '',
        plateHorse: r.driver_plate_horse || undefined,
        plateTrailer: r.driver_plate_trailer || undefined,
        cpf: r.driver_cpf || undefined,
      } : undefined,
      obs: r.obs || undefined,
      status: (r.status as LiberacaoStatus) || 'Pendente',
      createdAt: r.created_at,
      updatedAt: r.updated_at || undefined,
      userName: r.user_name || undefined,
      userId: r.user_id || undefined,
    }));
  },

  saveLiberacao: async (l: Liberacao): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('liberacoes').upsert({
      id: l.id,
      os: l.os,
      local_name: l.local || null,
      local_id: l.localId || null,
      booking: l.booking || null,
      ship: l.ship || null,
      agencia: l.agencia || null,
      pod: l.pod || null,
      container_type: l.containerType || null,
      qtd_container: l.qtdContainer || null,
      padrao: l.padrao || null,
      customer_id: l.customer?.id || null,
      customer_name: l.customer?.name || null,
      customer_legal_name: l.customer?.legalName || null,
      customer_cnpj: l.customer?.cnpj || null,
      customer_city: l.customer?.city || null,
      customer_state: l.customer?.state || null,
      driver_id: l.driver?.id || null,
      driver_name: l.driver?.name || null,
      driver_plate_horse: l.driver?.plateHorse || null,
      driver_plate_trailer: l.driver?.plateTrailer || null,
      driver_cpf: l.driver?.cpf || null,
      obs: l.obs || null,
      status: l.status,
      user_name: l.userName || null,
      user_id: l.userId || null,
      created_at: l.createdAt,
      updated_at: l.updatedAt || new Date().toISOString(),
    });
    if (error) { console.error('[saveLiberacao]', error.message); return false; }
    return true;
  },

  deleteLiberacao: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('liberacoes').delete().eq('id', id);
    return !error;
  },

  // ── Tabela de Frete ──────────────────────────────────────────────────────

  getFreightVehicleTypes: async (): Promise<FreightVehicleType[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('freight_vehicle_types')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) { console.error('[getFreightVehicleTypes]', error.message); return []; }
    return (data || []).map(t => ({
      id: t.id,
      code: t.code,
      name: t.name,
      sortOrder: t.sort_order,
      axlesGoing:     t.axles_going     ?? 4,
      axlesReturning: t.axles_returning ?? 6,
      createdAt: t.created_at,
    }));
  },

  saveFreightVehicleType: async (type: FreightVehicleType): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('freight_vehicle_types').upsert({
      id: type.id,
      code: type.code.toUpperCase().trim(),
      name: type.name,
      sort_order: type.sortOrder,
      axles_going:     type.axlesGoing     ?? 4,
      axles_returning: type.axlesReturning ?? 6,
    }, { onConflict: 'id' });
    if (error) { console.error('[saveFreightVehicleType]', error.message); return false; }
    return true;
  },

  deleteFreightVehicleType: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('freight_vehicle_types').delete().eq('id', id);
    return !error;
  },

  getFreightRoutes: async (): Promise<FreightRoute[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('freight_routes')
      .select('*')
      .order('origin_city', { ascending: true });
    if (error) { console.error('[getFreightRoutes]', error.message); return []; }
    return (data || []).map(r => ({
      id: r.id,
      originCity: r.origin_city,
      destinationCity: r.destination_city,
      vehicleValues: r.vehicle_values || {},
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  },

  saveFreightRoute: async (route: FreightRoute): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('freight_routes').upsert({
      id: route.id,
      origin_city: route.originCity.trim(),
      destination_city: route.destinationCity.trim(),
      vehicle_values: route.vehicleValues,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
    if (error) { console.error('[saveFreightRoute]', error.message); return false; }
    return true;
  },

  deleteFreightRoute: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('freight_routes').delete().eq('id', id);
    return !error;
  },

  consultarPedagioRotas: async (
    origin: string,
    destination: string,
    axles: number,
    via?: string,
  ): Promise<any> => {
    if (!supabase) return { error: 'Supabase não configurado' };
    try {
      const { data, error } = await supabase.functions.invoke('rotas-brasil-proxy', {
        body: { origin, destination, axles, ...(via ? { via } : {}) },
      });
      if (error) { console.error('[consultarPedagioRotas]', error); return { error: error.message ?? 'Erro na consulta' }; }
      return data;
    } catch (e) {
      return { error: String(e) };
    }
  },
};