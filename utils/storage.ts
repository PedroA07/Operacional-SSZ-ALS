
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus, StaySession } from '../types';
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
      isFirstLogin: u.is_first_login ?? u.isfirstlogin,
      lastSeen: u.last_seen || u.lastseen, presence_status: u.presence_status
    }));
  },

  saveUser: async (user: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').upsert({
      id: user.id, username: user.username, password: user.password,
      display_name: user.displayName, role: user.role, last_login: user.lastLogin,
      status: user.status || 'Ativo', driver_id: user.driverId, staff_id: user.staffId,
      position: user.position, is_first_login: user.isFirstLogin,
      presence_status: user.presence_status || 'offline',
      photo: user.photo
    });
    return !error;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (!supabase) return [];
    return await driverRepository.getAll(supabase);
  },

  // FIX: Added missing getDriverByCPF method
  getDriverByCPF: async (cpf: string): Promise<Driver | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('cpf', cpf)
      .maybeSingle();
    if (error) throw error;
    return data ? driverRepository.mapFromDb(data) : null;
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    if (!supabase) return false;
    const success = await driverRepository.save(supabase, driver);
    if (success && actingUser) {
      await db.addNotification(actingUser, 'DRIVER_UPDATED', 'Cadastro Sincronizado', `Motorista ${driver.name} atualizado no banco de dados.`, { os: 'CADASTRO', motorista: driver.name, placa: driver.plateHorse });
    }
    return success;
  },

  deleteDriver: async (id: string) => {
    if (!supabase) return false;
    return await driverRepository.delete(supabase, id);
  },

  getTrips: async (): Promise<Trip[]> => {
    if (!supabase) return [];
    return await tripRepository.getAll(supabase);
  },

  getTripsBySession: async (sessionId: string): Promise<Trip[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('stay_session_id', sessionId)
      .order('date_time', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => tripRepository.mapFromDb(d));
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    if (!supabase) return false;
    const success = await tripRepository.save(supabase, trip);
    if (success && actingUser) {
      const summary = { os: trip.os, motorista: trip.driver.name, placa: trip.driver.plateHorse, cliente: trip.customer.name };
      await db.addNotification(actingUser, 'TRIP_UPDATED', 'Viagem Sincronizada', `Dados da OS ${trip.os} enviados para a nuvem.`, summary);
    }
    return success;
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (!error && actingUser) {
      await db.addNotification(actingUser, 'DELETED', 'Viagem Removida', `Programação excluída do servidor ALS.`, { os: 'EXCLUÍDA' });
    }
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
    const { error } = await supabase.from('ports').delete().eq('id', id);
    return !error;
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
    const success = await staffRepository.save(supabase, staff);
    if (success && password) {
      await supabase.from('users').upsert({
        id: `u-staff-${staff.id}`,
        username: staff.username.toLowerCase(),
        password: password,
        display_name: staff.name,
        role: staff.role,
        staff_id: staff.id,
        status: staff.status,
        position: staff.position,
        photo: staff.photo
      });
    }
    return success;
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
    const { error } = await supabase.from('categories').upsert({
      id: category.id, name: category.name, parent_id: category.parentId
    });
    return !error;
  },

  getStaySessions: async (): Promise<StaySession[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('stay_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(s => ({
      id: s.id, category: s.category, startDate: s.start_date, endDate: s.end_date,
      createdAt: s.created_at, createdBy: s.created_by
    }));
  },

  saveStaySession: async (session: StaySession) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_sessions').upsert({
      id: session.id, category: session.category, start_date: session.startDate,
      end_date: session.endDate, created_at: session.createdAt, created_by: session.createdBy
    });
    return !error;
  },

  deleteStaySession: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_sessions').delete().eq('id', id);
    return !error;
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
    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, user_name, type, message, os_ref, timestamp, summary, origin')
      .order('timestamp', { ascending: false })
      .limit(50);
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

  // FIX: Added missing exportBackup method
  exportBackup: async () => {
    if (!supabase) return;
    try {
      const [drivers, customers, ports, preStacking, staff, trips, categories, sessions, users] = await Promise.all([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
        db.getStaff(),
        db.getTrips(),
        db.getCategories(),
        db.getStaySessions(),
        db.getUsers()
      ]);

      const backupData = {
        drivers,
        customers,
        ports,
        preStacking,
        staff,
        trips,
        categories,
        staySessions: sessions,
        users,
        exportedAt: new Date().toISOString(),
        version: '6.8.0'
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export Error:", e);
      throw e;
    }
  },

  // FIX: Added missing importBackup method
  importBackup: async (file: File): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Perform sequence of imports
      if (data.drivers) for (const d of data.drivers) await driverRepository.save(supabase, d);
      if (data.customers) for (const c of data.customers) await db.saveCustomer(c);
      if (data.ports) for (const p of data.ports) await db.savePort(p);
      if (data.preStacking) for (const ps of data.preStacking) await db.savePreStacking(ps);
      if (data.staff) for (const s of data.staff) await staffRepository.save(supabase, s);
      if (data.trips) for (const t of data.trips) await tripRepository.save(supabase, t);
      if (data.categories) for (const cat of data.categories) await db.saveCategory(cat);
      if (data.staySessions) for (const ss of data.staySessions) await db.saveStaySession(ss);
      if (data.users) for (const u of data.users) await db.saveUser(u);
      
      return true;
    } catch (e) {
      console.error("Import Error:", e);
      return false;
    }
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch { return false; }
  }
};
