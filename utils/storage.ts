
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus } from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
  // @ts-ignore
  SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any).VITE_SUPABASE_URL || '';
  // @ts-ignore
  SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any).VITE_SUPABASE_ANON_KEY || '';
} catch (e) {}

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const withTimeout = <T = any>(promise: Promise<T> | any, ms: number = 20000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_DATABASE')), ms))
  ]) as any;
};

export const db = {
  processSyncQueue: async () => { return; },

  getUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await withTimeout(supabase.from('users').select('*'));
      if (error) throw error;
      return (data || []).map(u => ({
        id: u.id, username: u.username, password: u.password,
        displayName: u.displayname || u.display_name || u.username, 
        role: u.role, lastLogin: u.lastlogin || u.last_login,
        photo: u.photo, position: u.position, staffId: u.staffid || u.staff_id,
        driverId: u.driverid || u.driver_id, status: u.status, 
        isFirstLogin: u.isfirstlogin === true || u.is_first_login === true,
        lastSeen: u.lastseen || u.last_seen, 
        presence_status: u.presence_status || 'offline',
        notificationPrefs: u.notification_prefs
      }));
    } catch (e) { return []; }
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (!supabase) return [];
    try { return await withTimeout(driverRepository.getAll(supabase)); } catch (e) { return []; }
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await withTimeout(supabase.from('customers').select('*').order('name'));
      if (error) throw error;
      return (data || []).map(c => ({ 
        ...c, legalName: c.legal_name || c.legalName, zipCode: c.zip_code || c.zipCode,
        operations: c.operations || []
      })) as Customer[];
    } catch (e) { return []; }
  },

  getTrips: async (): Promise<Trip[]> => {
    if (!supabase) return [];
    try { return await withTimeout(tripRepository.getAll(supabase)); } catch (e) { return []; }
  },

  getPorts: async (): Promise<Port[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await withTimeout(supabase.from('ports').select('*').order('name'));
      if (error) throw error;
      return (data || []).map(d => ({ ...d, legalName: d.legal_name || d.legalName, zipCode: d.zip_code || d.zipCode })) as Port[];
    } catch (e) { return []; }
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await withTimeout(supabase.from('pre_stacking').select('*').order('name'));
      if (error) throw error;
      return (data || []).map(d => ({ ...d, legalName: d.legal_name || d.legalName, zipCode: d.zip_code || d.zipCode })) as PreStacking[];
    } catch (e) { return []; }
  },

  getCategories: async (): Promise<Category[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await withTimeout(supabase.from('categories').select('*').order('name'));
      if (error) throw error;
      return (data || []).map(c => ({ ...c, parentId: c.parent_id || c.parentId })) as Category[];
    } catch (e) { return []; }
  },

  getStaff: async (): Promise<Staff[]> => {
    if (!supabase) return [];
    try { return await withTimeout(staffRepository.getAll(supabase)); } catch (e) { return []; }
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const success = await tripRepository.save(supabase, trip);
      if (success && actingUser) {
        const summary = { os: trip.os, motorista: trip.driver.name, placa: trip.driver.plateHorse, cliente: trip.customer.name };
        await db.addNotification(actingUser, 'TRIP_UPDATED', 'Programação Atualizada', `A OS ${trip.os} foi persistida no banco de dados.`, summary);
      }
      return success;
    } catch (e) { return false; }
  },

  saveUser: async (user: User) => {
    if (!supabase) return true;
    const payload = {
      id: user.id, username: user.username, password: user.password,
      displayname: user.displayName, role: user.role, lastlogin: user.lastLogin,
      photo: user.photo, position: user.position, staffid: user.staffId,
      driverid: user.driverId, status: user.status, isfirstlogin: user.isFirstLogin === true,
      lastseen: user.lastSeen, isonlinevisible: user.isOnlineVisible ?? true,
      presence_status: user.presence_status || 'offline', notification_prefs: user.notificationPrefs
    };
    try { const { error } = await supabase.from('users').upsert(payload); return !error; } catch (e) { return false; }
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const success = await driverRepository.save(supabase, driver);
      if (success && actingUser) {
        await db.addNotification(actingUser, 'DRIVER_UPDATED', 'Cadastro Motorista', `Dados de ${driver.name} salvos no servidor.`, { motorista: driver.name, placa: driver.plateHorse });
      }
      return success;
    } catch (e) { return false; }
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('customers').upsert({ 
        ...customer, legal_name: customer.legalName, zip_code: customer.zipCode, operations: customer.operations
      });
      if (!error && actingUser) {
        await db.addNotification(actingUser, 'CUSTOMER_UPDATED', 'Cadastro Cliente', `Cliente ${customer.name} atualizado no servidor.`, { cliente: customer.name });
      }
      return !error;
    } catch (e) { return false; }
  },

  savePort: async (port: Port, actingUser?: User) => {
    if (!supabase) return true;
    const { error } = await supabase.from('ports').upsert({ ...port, legal_name: port.legalName, zip_code: port.zipCode });
    return !error;
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    if (!supabase) return true;
    const { error } = await supabase.from('pre_stacking').upsert({ ...ps, legal_name: ps.legalName, zip_code: ps.zipCode });
    return !error;
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (!supabase) return true;
    try {
      const success = await staffRepository.save(supabase, staff);
      if (success && password) {
        const { data: userData } = await supabase.from('users').select('*').eq('staffid', staff.id).single();
        if (userData) await supabase.from('users').update({ password }).eq('id', userData.id);
      }
      return success;
    } catch (e) { return false; }
  },

  saveCategory: async (category: Category, actingUser?: User) => {
    if (!supabase) return true;
    const { error } = await supabase.from('categories').upsert({ ...category, parent_id: category.parentId });
    return !error;
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await withTimeout(supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(30));
      if (error) throw error;
      return (data || []).map(n => ({
        id: String(n.id), title: n.title || n.type.replace(/_/g, ' '), 
        description: n.message, type: n.type as NotificationType,
        origin: (n.origin as NotificationOrigin) || 'OPERACIONAL',
        authorName: n.user_name || 'Sistema', authorId: n.user_id || 'system', 
        timestamp: n.timestamp, summary: { ...n.summary, os: n.os_ref }
      }));
    } catch (e) { return []; }
  },

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: Notification['summary']) => {
    if (!supabase) return;
    const authorName = user.displayName || user.username || 'Sistema';
    const timestamp = new Date().toISOString();
    const osRef = summary?.os || '';
    let origin: NotificationOrigin = user.role === 'driver' || user.role === 'motoboy' ? 'MOTORISTA' : 'OPERACIONAL';
    
    try {
      // Inserção no banco: Todos os usuários logados receberão via Realtime no componente NotificationToast
      await supabase.from('notifications').insert({
        user_id: user.id || 'system', 
        user_name: authorName, 
        type, 
        origin,
        title, 
        message: description, 
        os_ref: osRef, 
        timestamp, 
        summary: summary || {}
      });
    } catch (e) {
      console.error("Erro ao registrar notificação no DB:", e);
    }
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (supabase) {
      try { await supabase.from('users').update({ lastseen: new Date().toISOString(), presence_status: status }).eq('id', userId); } catch (e) {}
    }
  },

  updateDriverLocation: async (driverId: string, lat: number, lng: number) => {
    if (!supabase) return;
    try { await supabase.from('drivers').update({ current_lat: lat, current_lng: lng, last_location_at: new Date().toISOString() }).eq('id', driverId); } catch (e) {}
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (!error && actingUser) {
        await db.addNotification(actingUser, 'DELETED', 'Viagem Removida', `A OS foi excluída permanentemente do banco de dados.`, { os: 'EXCLUÍDA' });
      }
      return !error;
    } catch (e) { return false; }
  },

  deleteDriver: async (id: string) => {
    if (!supabase) return true;
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    return !error;
  },

  deleteCustomer: async (id: string) => {
    if (!supabase) return true;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    return !error;
  },

  deletePort: async (id: string) => {
    if (!supabase) return true;
    const { error } = await supabase.from('ports').delete().eq('id', id);
    return !error;
  },

  deletePreStacking: async (id: string) => {
    if (!supabase) return true;
    const { error } = await supabase.from('pre_stacking').delete().eq('id', id);
    return !error;
  },

  deleteStaff: async (id: string) => {
    if (!supabase) return true;
    const { error } = await supabase.from('staff').delete().eq('id', id);
    return !error;
  },

  exportBackup: async () => {
    try {
      const [users, drivers, customers, trips, ports, preStacking, categories, staff] = await Promise.all([
        db.getUsers(), db.getDrivers(), db.getCustomers(), db.getTrips(),
        db.getPorts(), db.getPreStacking(), db.getCategories(), db.getStaff()
      ]);
      const data = { users, drivers, customers, trips, ports, preStacking, categories, staff };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url; a.download = `ALS_BACKUP_${date}.json`; a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (e) { throw e; }
  },

  importBackup: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.users) for (const item of data.users) await db.saveUser(item);
      if (data.drivers) for (const item of data.drivers) await db.saveDriver(item);
      if (data.customers) for (const item of data.customers) await db.saveCustomer(item);
      if (data.trips) for (const item of data.trips) await db.saveTrip(item);
      if (data.ports) for (const item of data.ports) await db.savePort(item);
      if (data.preStacking) for (const item of data.preStacking) await db.savePreStacking(item);
      if (data.categories) for (const item of data.categories) await db.saveCategory(item);
      if (data.staff) for (const item of data.staff) await db.saveStaff(item);
      return true;
    } catch (e) { return false; }
  },

  getPreferences: (userId: string) => {
    try {
      const allPrefs = JSON.parse(localStorage.getItem('als_ui_preferences') || '{}');
      return allPrefs[userId] || { visibleColumns: {} };
    } catch { return { visibleColumns: {} }; }
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    try {
      const allPrefs = JSON.parse(localStorage.getItem('als_ui_preferences') || '{}');
      if (!allPrefs[userId]) allPrefs[userId] = { visibleColumns: {} };
      allPrefs[userId].visibleColumns[componentId] = columns;
      localStorage.setItem('als_ui_preferences', JSON.stringify(allPrefs));
    } catch {}
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try { 
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error; 
    } catch { return false; }
  }
};
