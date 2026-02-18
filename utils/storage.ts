import { createClient } from '@supabase/supabase-js';
import { 
  User, Driver, Customer, Port, PreStacking, Staff, Trip, Category, 
  Notification, AvantidaRecord, AvantidaPriceRule, SealBatch, SealRecord, StaySession, 
  StayRecord, NotificationType, NotificationOrigin, PresenceStatus, 
  LoginCredential 
} from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

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
      username: u.username,
      password: u.password,
      displayName: u.display_name || u.displayname || u.username,
      role: u.role,
      lastLogin: u.last_login || u.lastLogin,
      photo: u.photo,
      position: u.position,
      driverId: u.driver_id || u.driverid,
      staffId: u.staff_id || u.staffid,
      status: u.status,
      isFirstLogin: u.isfirstlogin,
      lastSeen: u.last_seen || u.lastSeen,
      presence_status: u.presence_status
    }));
  },

  saveUser: async (user: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      password: user.password,
      display_name: user.displayName,
      role: user.role,
      last_login: user.lastLogin,
      photo: user.photo,
      position: user.position,
      driver_id: user.driverId,
      staff_id: user.staffId,
      status: user.status,
      isfirstlogin: user.isFirstLogin,
      last_seen: user.lastSeen,
      presence_status: user.presence_status
    });
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
  saveDriver: (d: Driver, user?: User) => driverRepository.save(supabase!, d),
  deleteDriver: (id: string) => driverRepository.delete(supabase!, id),

  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  saveCustomer: async (c: Partial<Customer>, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('customers').upsert(c);
    return !error;
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
    return data || [];
  },

  savePort: async (p: Partial<Port>, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('ports').upsert(p);
    return !error;
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
    return data || [];
  },

  savePreStacking: async (p: Partial<PreStacking>, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking').upsert(p);
    return !error;
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
  saveTrip: (t: Trip, user?: User) => tripRepository.save(supabase!, t, user),
  deleteTrip: async (id: string, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    return !error;
  },

  getCategories: async (): Promise<Category[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id,
      createdAt: c.created_at
    }));
  },

  saveCategory: async (c: Partial<Category>, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('categories').upsert({
      id: c.id,
      name: c.name,
      parent_id: c.parentId,
      created_at: new Date().toISOString()
    });
    return !error;
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false });
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
      costPerHour: s.cost_per_hour
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
      observations: r.observations
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
      cost_per_hour: s.costPerHour
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
      scheduled_start: r.scheduledStart || null,
      arrival_time: r.arrivalTime || null,
      departure_time: r.departureTime || null,
      exceeded_hours: r.exceededHours,
      observations: r.observations
    }));
    const { error } = await supabase.from('stay_records').upsert(payload);
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

  exportBackup: async () => {
    if (!supabase) return;
    const tables = ['users', 'drivers', 'customers', 'ports', 'pre_stacking', 'staff', 'trips', 'categories', 'notifications', 'avantida_records', 'avantida_prices', 'logins', 'seal_batches', 'seal_records', 'stay_sessions', 'stay_records'];
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
  }
};