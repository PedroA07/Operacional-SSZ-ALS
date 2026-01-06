
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, PresenceStatus } from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

// Proteção contra erro de acesso a variáveis de ambiente
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
  SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
} catch (e) {
  console.warn("Ambiente não suporta import.meta.env");
}

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export const KEYS = {
  DRIVERS: 'als_drivers',
  CUSTOMERS: 'als_customers',
  PORTS: 'als_ports',
  PRE_STACKING: 'als_pre_stacking',
  STAFF: 'als_staff',
  USERS: 'als_users',
  TRIPS: 'als_trips',
  CATEGORIES: 'als_categories',
  PREFERENCES: 'als_ui_preferences',
  NOTIFICATIONS: 'als_notifications'
};

export const db = {
  _saveLocal: (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn(`Quota local excedida`); }
  },
  _getLocal: (key: string) => {
    try { 
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : []; 
    } catch { return []; }
  },
  
  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          const mapped = data.map(u => ({
            id: u.id, 
            username: u.username, 
            password: u.password,
            displayName: u.displayname || u.username,
            role: u.role,
            lastLogin: u.lastlogin || new Date().toISOString(),
            photo: u.photo,
            position: u.position, 
            staffId: u.staffid,
            driverId: u.driverid,
            status: u.status, 
            isFirstLogin: u.isfirstlogin === true,
            lastSeen: u.lastseen,
            isOnlineVisible: u.isonlinevisible ?? true,
            presence_status: u.presence_status || 'offline',
            notificationPrefs: u.notification_prefs || { newTrip: true, statusUpdate: true, paymentLiberated: true, systemChanges: true, newRegistrations: true }
          }));
          db._saveLocal(KEYS.USERS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return db._getLocal(KEYS.USERS);
  },

  saveUser: async (user: User) => {
    const payload = {
      id: user.id, 
      username: user.username, 
      password: user.password,
      displayname: user.displayName,
      role: user.role, 
      lastlogin: user.lastLogin,
      photo: user.photo, 
      position: user.position, 
      staffid: user.staffId,
      driverid: user.driverId,
      status: user.status, 
      isfirstlogin: user.isFirstLogin === true,
      lastseen: user.lastSeen,
      isonlinevisible: user.isOnlineVisible ?? true,
      presence_status: user.presence_status || 'offline',
      notification_prefs: user.notificationPrefs
    };
    if (supabase) { try { await supabase.from('users').upsert(payload); } catch (e) {} }
    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);
    return true;
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (supabase) {
      try {
        const { data } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50);
        if (data) {
          const mapped = data.map(n => ({
            id: n.id,
            title: n.title,
            description: n.description,
            type: n.type as any,
            authorName: n.author_name,
            authorId: n.author_id,
            timestamp: n.timestamp,
            summary: n.summary
          }));
          db._saveLocal(KEYS.NOTIFICATIONS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return db._getLocal(KEYS.NOTIFICATIONS);
  },

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: Notification['summary']) => {
    const authorName = user.displayName || user.username || 'Sistema';
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title, description, type, authorName, authorId: user.id || 'system', timestamp: new Date().toISOString(), summary
    };
    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          title: newNotif.title, description: newNotif.description, type: newNotif.type,
          author_name: authorName, author_id: user.id, summary: newNotif.summary
        });
      } catch (e) {}
    }
    const current = db._getLocal(KEYS.NOTIFICATIONS);
    db._saveLocal(KEYS.NOTIFICATIONS, [newNotif, ...current].slice(0, 50));
    window.dispatchEvent(new CustomEvent('als_new_notification_event', { detail: newNotif }));
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (supabase) {
      try {
        await supabase.from('users').update({ 
          lastseen: new Date().toISOString(),
          presence_status: status
        }).eq('id', userId);
      } catch (e) {}
    }
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) { try { const s = await staffRepository.getAll(supabase); db._saveLocal(KEYS.STAFF, s); return s; } catch (e) {} }
    return db._getLocal(KEYS.STAFF);
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (supabase) { await staffRepository.save(supabase, staff); }
    const currentUsers = await db.getUsers();
    const linkedUser = currentUsers.find(u => u.staffId === staff.id);
    if (linkedUser) {
      const updatedUser = { ...linkedUser, username: staff.username, displayName: staff.name, role: staff.role, position: staff.position, status: staff.status, photo: staff.photo };
      if (password) updatedUser.password = password;
      await db.saveUser(updatedUser);
    }
    const current = db._getLocal(KEYS.STAFF);
    const idx = current.findIndex((s: any) => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    db._saveLocal(KEYS.STAFF, current);
    return true;
  },

  deleteStaff: async (id: string) => {
    if (supabase) { await staffRepository.delete(supabase, id); }
    db._saveLocal(KEYS.STAFF, db._getLocal(KEYS.STAFF).filter((s: any) => s.id !== id));
    return true;
  },

  getTrips: async (): Promise<Trip[]> => {
    if (supabase) { try { const t = await tripRepository.getAll(supabase); db._saveLocal(KEYS.TRIPS, t); return t; } catch (e) {} }
    return db._getLocal(KEYS.TRIPS);
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    const oldTrip = db._getLocal(KEYS.TRIPS).find((t: any) => t.id === trip.id);
    if (supabase) { try { await tripRepository.save(supabase, trip); } catch (e) {} }
    const current = db._getLocal(KEYS.TRIPS);
    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    db._saveLocal(KEYS.TRIPS, current);
    if (actingUser) {
      const summary = { os: trip.os, motorista: trip.driver.name, placa: trip.driver.plateHorse };
      if (!oldTrip) await db.addNotification(actingUser, 'TRIP_CREATED', 'Nova Programação', `OS ${trip.os} cadastrada.`, summary);
      else if (oldTrip.status !== trip.status) await db.addNotification(actingUser, 'STATUS_UPDATED', 'Status Atualizado', `OS ${trip.os} para "${trip.status}".`, summary);
    }
    return true;
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    const trip = db._getLocal(KEYS.TRIPS).find((t: any) => t.id === id);
    if (supabase) { await tripRepository.delete(supabase, id); }
    db._saveLocal(KEYS.TRIPS, db._getLocal(KEYS.TRIPS).filter((t: any) => t.id !== id));
    if (actingUser && trip) await db.addNotification(actingUser, 'DELETED', 'OS Excluída', `OS ${trip.os} removida.`, { os: trip.os });
    return true;
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    const isNew = !db._getLocal(KEYS.DRIVERS).some((d: any) => d.id === driver.id);
    if (supabase) { await driverRepository.save(supabase, driver); }
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    if (actingUser && isNew) await db.addNotification(actingUser, 'DRIVER_CREATED', 'Novo Motorista', `${driver.name} cadastrado.`, { motorista: driver.name, placa: driver.plateHorse });
    return true;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) { try { const d = await driverRepository.getAll(supabase); db._saveLocal(KEYS.DRIVERS, d); return d; } catch (e) {} }
    return db._getLocal(KEYS.DRIVERS);
  },

  deleteDriver: async (id: string) => {
    if (supabase) { try { await driverRepository.delete(supabase, id); } catch (e) {} }
    db._saveLocal(KEYS.DRIVERS, db._getLocal(KEYS.DRIVERS).filter((d: any) => d.id !== id));
    return true;
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    const isNew = !db._getLocal(KEYS.CUSTOMERS).some((c: any) => c.id === customer.id);
    if (supabase) { 
      const payload = { ...customer, legal_name: customer.legalName };
      delete (payload as any).legalName;
      await supabase.from('customers').upsert(payload);
    }
    const current = db._getLocal(KEYS.CUSTOMERS);
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    if (actingUser && isNew) await db.addNotification(actingUser, 'CUSTOMER_CREATED', 'Novo Cliente', `${customer.name} adicionado.`, { cliente: customer.name });
    return true;
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) { try { const { data } = await supabase.from('customers').select('*'); if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.CUSTOMERS);
  },

  deleteCustomer: async (id: string) => {
    if (supabase) { await supabase.from('customers').delete().eq('id', id); }
    db._saveLocal(KEYS.CUSTOMERS, db._getLocal(KEYS.CUSTOMERS).filter((c: any) => c.id !== id));
    return true;
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) { try { const { data } = await supabase.from('ports').select('*'); if (data) { const mapped = data.map(d => ({ ...d, legalName: d.legal_name })) as Port[]; db._saveLocal(KEYS.PORTS, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.PORTS);
  },

  savePort: async (port: Port, actingUser?: User) => {
    const isNew = !db._getLocal(KEYS.PORTS).some((p: any) => p.id === port.id);
    if (supabase) { 
      const payload = { ...port, legal_name: port.legalName };
      delete (payload as any).legalName;
      await supabase.from('ports').upsert(payload);
    }
    const current = db._getLocal(KEYS.PORTS);
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    db._saveLocal(KEYS.PORTS, current);
    if (actingUser && isNew) await db.addNotification(actingUser, 'PORT_CREATED', 'Novo Porto', `Localidade ${port.name} cadastrada.`);
    return true;
  },

  deletePort: async (id: string) => {
    if (supabase) { await supabase.from('ports').delete().eq('id', id); }
    db._saveLocal(KEYS.PORTS, db._getLocal(KEYS.PORTS).filter((p: any) => p.id !== id));
    return true;
  },

  getCategories: async (): Promise<Category[]> => {
    if (supabase) { try { const { data } = await supabase.from('categories').select('*'); if (data) { db._saveLocal(KEYS.CATEGORIES, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.CATEGORIES);
  },

  saveCategory: async (category: Partial<Category>, actingUser?: User) => {
    if (supabase) { await supabase.from('categories').upsert(category); }
    const current = db._getLocal(KEYS.CATEGORIES);
    const idx = current.findIndex((c: any) => c.id === category.id);
    if (idx >= 0) current[idx] = category as any; else current.push(category as any);
    db._saveLocal(KEYS.CATEGORIES, current);
    if (actingUser) await db.addNotification(actingUser, 'CATEGORY_CREATED', 'Nova Categoria', `Categoria "${category.name}" adicionada.`);
    return true;
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) { try { const { data, error } = await supabase.from('pre_stacking').select('*'); if (data) { const mapped = data.map(d => ({ ...d, legalName: d.legal_name })); db._saveLocal(KEYS.PRE_STACKING, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.PRE_STACKING);
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    const isNew = !db._getLocal(KEYS.PRE_STACKING).some((p: any) => p.id === ps.id);
    if (supabase) { 
      const payload = { ...ps, legal_name: ps.legalName };
      delete (payload as any).legalName;
      await supabase.from('pre_stacking').upsert(payload);
    }
    const current = db._getLocal(KEYS.PRE_STACKING);
    const idx = current.findIndex((p: any) => p.id === ps.id);
    if (idx >= 0) current[idx] = ps; else current.push(ps);
    db._saveLocal(KEYS.PRE_STACKING, current);
    if (actingUser && isNew) await db.addNotification(actingUser, 'PRESTACKING_CREATED', 'Novo Pré-Stacking', `Terminal ${ps.name} cadastrado.`);
    return true;
  },

  deletePreStacking: async (id: string) => {
    if (supabase) { await supabase.from('pre_stacking').delete().eq('id', id); }
    db._saveLocal(KEYS.PRE_STACKING, db._getLocal(KEYS.PRE_STACKING).filter((p: any) => p.id !== id));
    return true;
  },

  getPreferences: (userId: string) => {
    const allPrefs = JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || '{}');
    return allPrefs[userId] || { visibleColumns: {} };
  },
  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const allPrefs = JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || '{}');
    if (!allPrefs[userId]) allPrefs[userId] = { visibleColumns: {} };
    allPrefs[userId].visibleColumns[componentId] = columns;
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(allPrefs));
  },
  exportBackup: async () => {
    const backup: any = {};
    for (const key of Object.values(KEYS)) backup[key] = localStorage.getItem(key);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ALS_BACKUP_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
  },
  importBackup: async (file: File) => {
    try {
      const text = await file.text(); const backup = JSON.parse(text);
      for (const [key, value] of Object.entries(backup)) { if (value) localStorage.setItem(key, value as string); }
      return true;
    } catch (e) { return false; }
  },
  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try { 
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true }).limit(1); 
      return !error; 
    } catch { return false; }
  }
};
