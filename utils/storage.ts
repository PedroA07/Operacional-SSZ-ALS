
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus } from '../types';
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
      presence_status: user.presence_status || 'offline'
    });
    return !error;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (!supabase) return [];
    return await driverRepository.getAll(supabase);
  },

  getDriverByCPF: async (cpf: string): Promise<Driver | null> => {
    if (!supabase) return null;
    const cleanCPF = cpf.replace(/\D/g, '');
    const { data, error } = await supabase.from('drivers').select('*').or(`cpf.eq.${cleanCPF},cpf.eq.${cpf}`).maybeSingle();
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
      await supabase.from('users').update({ password }).eq('staff_id', staff.id);
    }
    return success;
  },

  deleteStaff: async (id: string) => {
    if (!supabase) return false;
    return await staffRepository.delete(supabase, id);
  },

  /* Added exportBackup to fix SystemTab.tsx error */
  exportBackup: async () => {
    if (!supabase) return;
    try {
      const [drivers, customers, ports, prestacking, staff, trips, categories, users] = await Promise.all([
        db.getDrivers(),
        db.getCustomers(),
        db.getPorts(),
        db.getPreStacking(),
        db.getStaff(),
        db.getTrips(),
        db.getCategories(),
        db.getUsers()
      ]);

      const data = {
        drivers,
        customers,
        ports,
        prestacking,
        staff,
        trips,
        categories,
        users,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ALS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Backup failed", e);
      throw e;
    }
  },

  /* Added importBackup to fix SystemTab.tsx error */
  importBackup: async (file: File): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const promises = [];
      
      if (data.drivers) {
        for (const d of data.drivers) promises.push(db.saveDriver(d));
      }
      if (data.customers) {
        for (const c of data.customers) promises.push(db.saveCustomer(c));
      }
      if (data.ports) {
        for (const p of data.ports) promises.push(db.savePort(p));
      }
      if (data.prestacking) {
        for (const ps of data.prestacking) promises.push(db.savePreStacking(ps));
      }
      if (data.staff) {
        for (const s of data.staff) promises.push(db.saveStaff(s));
      }
      if (data.trips) {
        for (const t of data.trips) promises.push(db.saveTrip(t));
      }
      if (data.categories) {
        for (const cat of data.categories) promises.push(db.saveCategory(cat));
      }
      if (data.users) {
        for (const u of data.users) promises.push(db.saveUser(u));
      }

      await Promise.allSettled(promises);
      return true;
    } catch (e) {
      console.error("Import failed", e);
      return false;
    }
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

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: any) => {
    if (!supabase) return;
    const origin: NotificationOrigin = (user.role === 'driver' || user.role === 'motoboy') ? 'MOTORISTA' : 'OPERACIONAL';
    await supabase.from('notifications').insert({
      user_id: user.id, user_name: user.displayName, type, origin,
      title, message: description, os_ref: summary?.os || '',
      summary: summary || {}, timestamp: new Date().toISOString()
    });
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    // Busca otimizada: Limite de 40 e ordenação por ID/Timestamp para evitar timeout
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(40);
      
    if (error) {
      console.error("Erro Supabase Notificações:", error);
      throw error; 
    }
    
    return (data || []).map(n => ({
      id: String(n.id), title: n.title, description: n.message,
      type: n.type as NotificationType, origin: n.origin as NotificationOrigin,
      authorName: n.user_name, authorId: n.user_id, timestamp: n.timestamp,
      summary: { ...n.summary, os: n.os_ref }
    }));
  },

  getPreferences: (userId: string) => {
    const key = `als_prefs_${userId}`;
    const saved = localStorage.getItem(key);
    try {
      return saved ? JSON.parse(saved) : { visibleColumns: {} };
    } catch { return { visibleColumns: {} }; }
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const key = `als_prefs_${userId}`;
    const prefs = db.getPreferences(userId);
    if (!prefs.visibleColumns) prefs.visibleColumns = {};
    prefs.visibleColumns[componentId] = columns;
    localStorage.setItem(key, JSON.stringify(prefs));
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (supabase) {
      await supabase.from('users').update({ 
        presence_status: status, 
        last_seen: new Date().toISOString() 
      }).eq('id', userId);
    }
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); 
      const { error } = await supabase.from('users').select('id').limit(1).abortSignal(controller.signal);
      clearTimeout(timeoutId);
      return !error;
    } catch { return false; }
  }
};
