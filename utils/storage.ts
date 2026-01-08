
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
        ...c, 
        legalName: c.legal_name || c.legalName, 
        zipCode: c.zip_code || c.zipCode,
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
      return (data || []).map(d => ({ 
        ...d, 
        legalName: d.legal_name || d.legalName, 
        zipCode: d.zip_code || d.zipCode 
      })) as Port[];
    } catch (e) { return []; }
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await withTimeout(supabase.from('pre_stacking').select('*').order('name'));
      if (error) throw error;
      return (data || []).map(d => ({ 
        ...d, 
        legalName: d.legal_name || d.legalName, 
        zipCode: d.zip_code || d.zipCode 
      })) as PreStacking[];
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
        const summary = { 
          os: trip.os, 
          motorista: trip.driver.name, 
          placa: trip.driver.plateHorse, 
          cliente: trip.customer.name 
        };
        await db.addNotification(actingUser, 'TRIP_UPDATED', 'Programação Atualizada', `A OS ${trip.os} foi persistida no banco de dados.`, summary);
      }
      return success;
    } catch (e) { 
      console.error("Erro db.saveTrip:", e);
      return false; 
    }
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
    try { 
      const { error } = await supabase.from('users').upsert(payload); 
      if (error) console.error("Erro db.saveUser:", error);
      return !error; 
    } catch (e) { return false; }
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const success = await driverRepository.save(supabase, driver);
      if (success && actingUser) {
        await db.addNotification(actingUser, 'DRIVER_UPDATED', 'Cadastro Motorista', `Dados de ${driver.name} salvos no servidor.`, { motorista: driver.name, placa: driver.plateHorse });
      }
      return success;
    } catch (e) { 
      console.error("Erro db.saveDriver:", e);
      return false; 
    }
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const payload = { 
        id: customer.id,
        name: customer.name?.toUpperCase(),
        legal_name: customer.legalName?.toUpperCase(),
        cnpj: customer.cnpj,
        address: customer.address?.toUpperCase(),
        neighborhood: customer.neighborhood?.toUpperCase(),
        zip_code: customer.zipCode,
        city: customer.city?.toUpperCase(),
        state: customer.state?.toUpperCase(),
        operations: customer.operations || []
      };
      const { error } = await supabase.from('customers').upsert(payload);
      if (error) {
        console.error("Erro Supabase upsert customers:", error);
        return false;
      }
      if (actingUser) {
        await db.addNotification(actingUser, 'CUSTOMER_UPDATED', 'Cadastro Cliente', `Cliente ${customer.name} atualizado no servidor.`, { cliente: customer.name });
      }
      return true;
    } catch (e) { 
      console.error("Erro catch db.saveCustomer:", e);
      return false; 
    }
  },

  savePort: async (port: Port, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const payload = {
        id: port.id,
        name: port.name?.toUpperCase(),
        legal_name: port.legalName?.toUpperCase(),
        cnpj: port.cnpj,
        address: port.address?.toUpperCase(),
        neighborhood: port.neighborhood?.toUpperCase(),
        zip_code: port.zipCode,
        city: port.city?.toUpperCase(),
        state: port.state?.toUpperCase()
      };
      const { error } = await supabase.from('ports').upsert(payload);
      if (error) {
        console.error("Erro Supabase upsert ports:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Erro catch db.savePort:", e);
      return false;
    }
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    if (!supabase) return false;
    try {
      const payload = {
        id: ps.id,
        name: ps.name?.toUpperCase(),
        legal_name: ps.legalName?.toUpperCase(),
        cnpj: ps.cnpj,
        address: ps.address?.toUpperCase(),
        neighborhood: ps.neighborhood?.toUpperCase(),
        zip_code: ps.zipCode,
        city: ps.city?.toUpperCase(),
        state: ps.state?.toUpperCase()
      };
      const { error } = await supabase.from('pre_stacking').upsert(payload);
      if (error) {
        console.error("Erro Supabase upsert pre_stacking:", error);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Erro catch db.savePreStacking:", e);
      return false;
    }
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
    const { error } = await supabase.from('categories').upsert({ id: category.id, name: category.name, parent_id: category.parentId });
    return !error;
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffISO = cutoff.toISOString();
      
      const { data, error } = await withTimeout(
        supabase.from('notifications')
          .select('*')
          .gte('timestamp', cutoffISO)
          .order('timestamp', { ascending: false })
          .limit(50)
      );

      if (error) throw error;
      return (data || []).map(n => ({
        id: String(n.id), title: n.title || n.type?.replace(/_/g, ' '), 
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

  getPreferences: (userId: string) => {
    const saved = localStorage.getItem(`als_prefs_${userId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { visibleColumns: {} };
      }
    }
    return { visibleColumns: {} };
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const current = db.getPreferences(userId);
    if (!current.visibleColumns) current.visibleColumns = {};
    current.visibleColumns[componentId] = columns;
    localStorage.setItem(`als_prefs_${userId}`, JSON.stringify(current));
  },

  exportBackup: async () => {
    try {
      const [drivers, customers, ports, preStacking, trips, categories, staff] = await Promise.all([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
        db.getTrips(),
        db.getCategories(),
        db.getStaff()
      ]);

      const backup = {
        drivers, customers, ports, preStacking, trips, categories, staff,
        exportedAt: new Date().toISOString(),
        version: '5.5.0'
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Erro na exportação de backup:", e);
    }
  },

  importBackup: async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.exportedAt) return false;
      const actingUser: User = { id: 'system', username: 'system', displayName: 'Importador', role: 'admin', lastLogin: new Date().toISOString() };
      
      if (backup.drivers) {
        for (const d of backup.drivers) await db.saveDriver(d, actingUser);
      }
      if (backup.customers) {
        for (const c of backup.customers) await db.saveCustomer(c, actingUser);
      }
      if (backup.ports) {
        for (const p of backup.ports) await db.savePort(p, actingUser);
      }
      if (backup.preStacking) {
        for (const ps of backup.preStacking) await db.savePreStacking(ps, actingUser);
      }
      if (backup.trips) {
        for (const t of backup.trips) await db.saveTrip(t, actingUser);
      }
      if (backup.categories) {
        for (const cat of backup.categories) await db.saveCategory(cat, actingUser);
      }
      if (backup.staff) {
        for (const s of backup.staff) await db.saveStaff(s);
      }
      
      return true;
    } catch (e) {
      console.error("Erro na importação de backup:", e);
      return false;
    }
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try { 
      const { error } = await withTimeout(supabase.from('users').select('id').limit(1));
      return !error; 
    } catch { return false; }
  }
};
