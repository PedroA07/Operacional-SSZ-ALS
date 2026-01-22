
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus, StaySession, StayRecord, LoginCredential, SealBatch, SealRecord } from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: true },
      global: { 
        headers: { 'x-application-name': 'als-transportes' },
        fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
      }
    }) 
  : null;

export const db = {
  getUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map(u => ({
      id: u.id, username: u.username, password: u.password,
      displayName: u.display_name || u.displayname || u.username,
      role: u.role, lastLogin: u.last_login || u.lastlogin,
      photo: u.photo, position: u.position, driverId: u.driver_id || u.driverid,
      staffId: u.staff_id || u.staffid, status: u.status,
      isFirstLogin: u.isfirstlogin ?? false,
      lastSeen: u.last_seen || u.lastseen, presence_status: u.presence_status
    }));
  },

  saveUser: async (user: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').upsert({
      id: user.id, username: user.username, password: user.password,
      display_name: user.displayName, role: user.role, last_login: user.lastLogin,
      status: user.status || 'Ativo', driver_id: user.driverId, staff_id: user.staffId,
      position: user.position,
      isfirstlogin: user.isFirstLogin,
      presence_status: user.presence_status || 'offline',
      photo: user.photo
    });
    return !error;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (!supabase) return [];
    return await driverRepository.getAll(supabase);
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    if (!supabase) return false;
    return await driverRepository.save(supabase, driver);
  },

  deleteDriver: async (id: string) => {
    if (!supabase) return false;
    return await driverRepository.delete(supabase, id);
  },

  getTrips: async (): Promise<Trip[]> => {
    if (!supabase) return [];
    const trips = await tripRepository.getAll(supabase);
    return trips.map(t => ({
      ...t,
      status: t.status || 'Pendente',
      type: (t.type || 'EXPORTAÇÃO').toUpperCase() as any,
      statusHistory: Array.isArray(t.statusHistory) ? t.statusHistory : []
    }));
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    if (!supabase) return false;
    return await tripRepository.save(supabase, trip);
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    return !error;
  },

  getLogins: async (): Promise<LoginCredential[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('external_logins').select('*').order('site_name');
    if (error) throw error;
    return (data || []).map(l => ({
      id: l.id,
      siteName: l.site_name,
      url: l.url,
      username: l.username,
      password: l.password,
      additionalFields: l.additional_fields || [],
      createdAt: l.created_at
    }));
  },

  saveLogin: async (login: LoginCredential) => {
    if (!supabase) return false;
    const { error } = await supabase.from('external_logins').upsert({
      id: login.id.startsWith('new-') ? undefined : login.id,
      site_name: login.siteName,
      url: login.url,
      username: login.username,
      password: login.password,
      additional_fields: login.additionalFields
    });
    return !error;
  },

  deleteLogin: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('external_logins').delete().eq('id', id);
    return !error;
  },

  // LACRES
  getSealBatches: async (): Promise<SealBatch[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('seal_batches').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(b => ({
      id: b.id, carrier: b.carrier, startNumber: b.start_number, endNumber: b.end_number, createdAt: b.created_at
    }));
  },

  saveSealBatch: async (batch: SealBatch, records: Partial<SealRecord>[]) => {
    if (!supabase) return false;
    const { data, error } = await supabase.from('seal_batches').insert({
      carrier: batch.carrier, start_number: batch.startNumber, end_number: batch.endNumber
    }).select().single();
    
    if (error || !data) return false;

    const finalRecords = records.map(r => ({
      batch_id: data.id,
      seal_number: r.sealNumber,
      container_number: '',
      booking: '',
      driver_name: ''
    }));

    await supabase.from('seal_records').insert(finalRecords);
    return true;
  },

  deleteSealBatch: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('seal_batches').delete().eq('id', id);
    return !error;
  },

  getSealRecords: async (batchId: string): Promise<SealRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('seal_records').select('*').eq('batch_id', batchId).order('seal_number');
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id, batchId: r.batch_id, sealNumber: r.seal_number, containerNumber: r.container_number || '', booking: r.booking || '', reuseDate: r.reuse_date || '', driverName: r.driver_name || ''
    }));
  },

  updateSealRecord: async (record: SealRecord) => {
    if (!supabase) return false;
    const { error } = await supabase.from('seal_records').update({
      container_number: record.containerNumber,
      booking: record.booking,
      reuse_date: record.reuseDate || null,
      driver_name: record.driverName
    }).eq('id', record.id);
    return !error;
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return (data || []).map(c => ({
      ...c, legalName: c.legal_name || c.legalName, zipCode: c.zip_code || c.zipCode
    })) as Customer[];
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('customers').upsert({
      id: customer.id, name: customer.name, legal_name: customer.legalName,
      cnpj: customer.cnpj, address: customer.address, neighborhood: customer.neighborhood,
      zip_code: customer.zipCode, city: customer.city, state: customer.state,
      operations: customer.operations || []
    });
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
    return (data || []).map(p => ({
      ...p, legalName: p.legal_name || p.legalName, zipCode: p.zip_code || p.zipCode
    })) as Port[];
  },

  savePort: async (port: Port, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('ports').upsert({
      id: port.id, name: port.name, legal_name: port.legalName, cnpj: port.cnpj,
      address: port.address, neighborhood: port.neighborhood, zip_code: port.zipCode,
      city: port.city, state: port.state
    });
    return !error;
  },

  deletePort: async (id: string) => {
    if (!supabase) return false;
    return await supabase.from('ports').delete().eq('id', id);
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('pre_stacking').select('*').order('name');
    if (error) throw error;
    return (data || []).map(ps => ({
      ...ps, legalName: ps.legal_name || ps.legalName, zipCode: ps.zip_code || ps.zipCode
    })) as PreStacking[];
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking').upsert({
      id: ps.id, name: ps.name, legal_name: ps.legalName, cnpj: ps.cnpj,
      address: ps.address, neighborhood: ps.neighborhood, zip_code: ps.zipCode,
      city: ps.city, state: ps.state
    });
    return !error;
  },

  deletePreStacking: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking').delete().eq('id', id);
    return !error;
  },

  getStaff: async (): Promise<Staff[]> => {
    if (!supabase) return [];
    return await staffRepository.getAll(supabase);
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (!supabase) return false;
    const staffSuccess = await staffRepository.save(supabase, staff);
    if (!staffSuccess) return false;

    const { data: existingUsers } = await supabase
      .from('users')
      .select('*')
      .or(`staff_id.eq.${staff.id},username.eq.${staff.username.toLowerCase()}`);
    
    const existingUser = existingUsers?.[0];
    const userPayload: any = {
      username: staff.username.toLowerCase(),
      display_name: staff.name.toUpperCase(),
      role: staff.role,
      status: staff.status,
      staff_id: staff.id,
      position: staff.position,
      photo: staff.photo,
    };
    if (existingUser) userPayload.id = existingUser.id;
    if (password && password.trim() !== '') {
      userPayload.password = password.trim();
      userPayload.isfirstlogin = false;
    }
    const { error: userError } = await supabase.from('users').upsert(userPayload);
    return !userError;
  },

  deleteStaff: async (id: string) => {
    if (!supabase) return false;
    await supabase.from('users').delete().eq('staff_id', id);
    return await staffRepository.delete(supabase, id);
  },

  getCategories: async (): Promise<Category[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id, name: c.name, parentId: c.parent_id || c.parentId
    })) as Category[];
  },

  saveCategory: async (category: Category, actingUser?: User) => {
    if (!supabase) return false;
    const { error = null } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      parent_id: category.parentId
    });
    return !error;
  },

  getStaySessions: async (): Promise<StaySession[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('stay_sessions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id, category: s.category, startDate: s.start_date, endDate: s.end_date,
      createdAt: s.created_at, createdBy: s.created_by,
      gracePeriodHours: Number(s.grace_period_hours || 8),
      roundUpMinutes: Number(s.round_up_minutes || 30),
      costPerHour: Number(s.cost_per_hour || 0)
    }));
  },

  saveStaySession: async (session: StaySession) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_sessions').upsert({
      id: session.id, category: session.category, start_date: session.startDate,
      end_date: session.endDate, created_at: session.createdAt, created_by: session.createdBy,
      grace_period_hours: session.gracePeriodHours,
      round_up_minutes: session.roundUpMinutes,
      cost_per_hour: session.costPerHour
    });
    return !error;
  },

  deleteStaySession: async (id: string) => {
    if (!supabase) return false;
    return await supabase.from('stay_sessions').delete().eq('id', id).then(r => !r.error);
  },

  getStayRecords: async (sessionId: string): Promise<StayRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('stay_records').select('*').eq('session_id', sessionId).order('created_at');
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
      exceededHours: r.exceeded_hours
    }));
  },

  saveStayRecords: async (records: StayRecord[]) => {
    if (!supabase || records.length === 0) return false;
    const payload = records.map(r => ({
      id: r.id, session_id: r.sessionId, type: r.type, os: r.os, location: r.location,
      driver_name: r.driverName, ship: r.ship, container: r.container,
      scheduled_start: r.scheduledStart, arrival_time: r.arrivalTime,
      departure_time: r.departureTime, exceeded_hours: r.exceededHours
    }));
    const { error } = await supabase.from('stay_records').upsert(payload);
    return !error;
  },

  deleteStayRecord: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_records').delete().eq('id', id);
    return !error;
  },

  exportBackup: async () => {
    const [drivers, customers, ports, preStacking, staff, trips, categories] = await Promise.all([
      db.getDrivers(),
      db.getCustomers(),
      db.getPorts(),
      db.getPreStacking(),
      db.getStaff(),
      db.getTrips(),
      db.getCategories()
    ]);
    const backup = { version: '1.0', timestamp: new Date().toISOString(), data: { drivers, customers, ports, preStacking, staff, trips, categories } };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File): Promise<boolean> => {
    if (!supabase) return false;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (!content.data) return resolve(false);
          const { drivers, customers, ports, preStacking, staff, trips, categories } = content.data;
          await Promise.all([
            ...drivers.map((d: any) => driverRepository.save(supabase, d)),
            ...customers.map((c: any) => db.saveCustomer(c)),
            ...ports.map((p: any) => db.savePort(p)),
            ...preStacking.map((ps: any) => db.savePreStacking(ps)),
            ...staff.map((s: any) => staffRepository.save(supabase, s)),
            ...trips.map((t: any) => tripRepository.save(supabase, t)),
            ...categories.map((cat: any) => db.saveCategory(cat))
          ]);
          resolve(true);
        } catch (err) { resolve(false); }
      };
      reader.readAsText(file);
    });
  },

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: any) => {
    if (!supabase) return;
    const origin: NotificationOrigin = (user.role === 'driver' || user.role === 'motoboy') ? 'MOTORISTA' : 'OPERACIONAL';
    await supabase.from('notifications').insert({
      user_id: user.id, user_name: user.displayName, type, origin,
      message: `${title}: ${description}`, os_ref: summary?.os || '',
      summary: summary || {}, timestamp: new Date().toISOString()
    });
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50);
    if (error) return []; 
    return (data || []).map(n => ({
      id: String(n.id), title: n.type ? n.type.replace(/_/g, ' ').toUpperCase() : 'ALERTA', 
      description: n.message || '', type: n.type as NotificationType, origin: n.origin as NotificationOrigin,
      authorName: n.user_name || 'Sistema', authorId: n.user_id || 'system', 
      timestamp: n.timestamp || new Date().toISOString(), summary: { ...(n.summary || {}), os: n.os_ref }
    }));
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (supabase) {
      await supabase.from('users').update({ presence_status: status, last_seen: new Date().toISOString() }).eq('id', userId);
    }
  },

  getPreferences: (userId: string) => {
    const key = `als_prefs_${userId}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : { visibleColumns: {} };
  },

  savePreference: (userId: string, componentId: string, visibleColumns: string[]) => {
    const key = `als_prefs_${userId}`;
    const prefs = db.getPreferences(userId);
    prefs.visibleColumns[componentId] = visibleColumns;
    localStorage.setItem(key, JSON.stringify(prefs));
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch { return false; }
  }
};
