
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus } from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export const db = {
  // USUÁRIOS
  getUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase.from('users').select('*');
      if (error) throw error;
      return (data || []).map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        displayName: u.displayname || u.display_name,
        role: u.role,
        lastLogin: u.lastlogin || u.last_login,
        photo: u.photo,
        position: u.position,
        driverId: u.driverid || u.driver_id,
        staffId: u.staffid || u.staff_id,
        status: u.status,
        isFirstLogin: u.isfirstlogin || u.is_first_login,
        lastSeen: u.lastseen || u.last_seen,
        presence_status: u.presence_status
      }));
    } catch (e) { return []; }
  },

  saveUser: async (user: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      username: user.username,
      password: user.password,
      displayname: user.displayName,
      role: user.role,
      lastlogin: user.lastLogin,
      status: user.status || 'Ativo',
      driverid: user.driverId,
      staffid: user.staffId,
      position: user.position,
      isfirstlogin: user.isFirstLogin,
      presence_status: user.presence_status || 'offline'
    });
    return !error;
  },

  // MOTORISTAS
  getDrivers: async (): Promise<Driver[]> => {
    if (!supabase) return [];
    return await driverRepository.getAll(supabase);
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    if (!supabase) return false;
    const success = await driverRepository.save(supabase, driver);
    if (success && actingUser) {
      await db.addNotification(actingUser, 'DRIVER_UPDATED', 'Cadastro Atualizado', `Motorista ${driver.name} sincronizado no Supabase.`, { os: 'CADASTRO', motorista: driver.name, placa: driver.plateHorse });
    }
    return success;
  },

  deleteDriver: async (id: string) => {
    if (!supabase) return false;
    return await driverRepository.delete(supabase, id);
  },

  // VIAGENS
  getTrips: async (): Promise<Trip[]> => {
    if (!supabase) return [];
    return await tripRepository.getAll(supabase);
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    if (!supabase) return false;
    const success = await tripRepository.save(supabase, trip);
    if (success && actingUser) {
      const summary = { os: trip.os, motorista: trip.driver.name, placa: trip.driver.plateHorse, cliente: trip.customer.name };
      await db.addNotification(actingUser, 'TRIP_UPDATED', 'Viagem Sincronizada', `OS ${trip.os} salva na nuvem ALS.`, summary);
    }
    return success;
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (!error && actingUser) {
      await db.addNotification(actingUser, 'DELETED', 'Viagem Removida', `Programação excluída do banco de dados.`, { os: 'EXCLUÍDA' });
    }
    return !error;
  },

  // CLIENTES
  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('customers').select('*').order('name');
    return (data || []).map(c => ({
      ...c,
      legalName: c.legalName || c.legal_name,
      zipCode: c.zipCode || c.zip_code
    })) as Customer[];
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      legal_name: customer.legalName,
      cnpj: customer.cnpj,
      address: customer.address,
      neighborhood: customer.neighborhood,
      zip_code: customer.zipCode,
      city: customer.city,
      state: customer.state,
      operations: customer.operations || []
    });
    if (!error && actingUser) {
      await db.addNotification(actingUser, 'CUSTOMER_UPDATED', 'Cliente Atualizado', `Cliente ${customer.name} salvo com sucesso.`, { cliente: customer.name });
    }
    return !error;
  },

  // Fix: Added missing deleteCustomer method
  deleteCustomer: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    return !error;
  },

  // PORTOS E PRE-STACKING
  getPorts: async (): Promise<Port[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('ports').select('*').order('name');
    return (data || []).map(p => ({
      ...p,
      legalName: p.legalName || p.legal_name,
      zipCode: p.zipCode || p.zip_code
    })) as Port[];
  },

  savePort: async (port: Port, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('ports').upsert({
      id: port.id,
      name: port.name,
      legal_name: port.legalName,
      cnpj: port.cnpj,
      address: port.address,
      neighborhood: port.neighborhood,
      zip_code: port.zipCode,
      city: port.city,
      state: port.state
    });
    return !error;
  },

  // Fix: Added missing deletePort method
  deletePort: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('ports').delete().eq('id', id);
    return !error;
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('pre_stacking').select('*').order('name');
    return (data || []).map(ps => ({
      ...ps,
      legalName: ps.legalName || ps.legal_name,
      zipCode: ps.zipCode || ps.zip_code
    })) as PreStacking[];
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking').upsert({
      id: ps.id,
      name: ps.name,
      legal_name: ps.legalName,
      cnpj: ps.cnpj,
      address: ps.address,
      neighborhood: ps.neighborhood,
      zip_code: ps.zipCode,
      city: ps.city,
      state: ps.state
    });
    return !error;
  },

  // Fix: Added missing deletePreStacking method
  deletePreStacking: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking').delete().eq('id', id);
    return !error;
  },

  // STAFF E CATEGORIAS
  getStaff: async (): Promise<Staff[]> => {
    if (!supabase) return [];
    return await staffRepository.getAll(supabase);
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (!supabase) return false;
    const success = await staffRepository.save(supabase, staff);
    if (success && password) {
      await supabase.from('users').update({ password }).eq('staffid', staff.id);
    }
    return success;
  },

  // Fix: Added missing deleteStaff method
  deleteStaff: async (id: string) => {
    if (!supabase) return false;
    return await staffRepository.delete(supabase, id);
  },

  getCategories: async (): Promise<Category[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('categories').select('*').order('name');
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id
    })) as Category[];
  },

  saveCategory: async (category: Category, actingUser?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('categories').upsert({
      id: category.id,
      name: category.name,
      parent_id: category.parentId
    });
    return !error;
  },

  // NOTIFICAÇÕES
  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: any) => {
    if (!supabase) return;
    const origin: NotificationOrigin = (user.role === 'driver' || user.role === 'motoboy') ? 'MOTORISTA' : 'OPERACIONAL';
    await supabase.from('notifications').insert({
      user_id: user.id,
      user_name: user.displayName,
      type,
      origin,
      title,
      message: description,
      os_ref: summary?.os || '',
      summary: summary || {},
      timestamp: new Date().toISOString()
    });
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(40);
    return (data || []).map(n => ({
      id: String(n.id),
      title: n.title,
      description: n.message,
      type: n.type as NotificationType,
      origin: n.origin as NotificationOrigin,
      authorName: n.user_name,
      authorId: n.user_id,
      timestamp: n.timestamp,
      summary: { ...n.summary, os: n.os_ref }
    }));
  },

  // STATUS E PRESENÇA
  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (supabase) {
      await supabase.from('users').update({ 
        presence_status: status, 
        lastseen: new Date().toISOString() 
      }).eq('id', userId);
    }
  },

  updateDriverLocation: async (driverId: string, lat: number, lng: number) => {
    if (!supabase) return false;
    const { error } = await supabase.from('drivers').update({ 
      current_lat: lat, 
      current_lng: lng, 
      last_location_at: new Date().toISOString() 
    }).eq('id', driverId);
    return !error;
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch { return false; }
  },

  getPreferences: (userId: string) => {
    const saved = localStorage.getItem(`als_prefs_${userId}`);
    return saved ? JSON.parse(saved) : { visibleColumns: {} };
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const prefs = db.getPreferences(userId);
    prefs.visibleColumns[componentId] = columns;
    localStorage.setItem(`als_prefs_${userId}`, JSON.stringify(prefs));
  },

  exportBackup: async () => {
    const [drivers, customers, ports, ps, trips, staff, categories] = await Promise.all([
      db.getDrivers(), db.getCustomers(), db.getPorts(), 
      db.getPreStacking(), db.getTrips(), db.getStaff(), db.getCategories()
    ]);
    const data = { drivers, customers, ports, preStacking: ps, trips, staff, categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALS_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  },

  // Fix: Implemented missing importBackup method
  importBackup: async (file: File) => {
    if (!supabase) return false;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Perform imports
      if (data.drivers) for (const d of data.drivers) await db.saveDriver(d);
      if (data.customers) for (const c of data.customers) await db.saveCustomer(c);
      if (data.ports) for (const p of data.ports) await db.savePort(p);
      if (data.preStacking) for (const ps of data.preStacking) await db.savePreStacking(ps);
      if (data.trips) for (const t of data.trips) await db.saveTrip(t);
      if (data.staff) for (const s of data.staff) await db.saveStaff(s);
      if (data.categories) for (const c of data.categories) await db.saveCategory(c);
      
      return true;
    } catch (e) {
      console.error("Import error:", e);
      return false;
    }
  }
};
