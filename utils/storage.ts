import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus } from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
  // @ts-ignore
  SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  // @ts-ignore
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

const withTimeout = <T = any>(promise: Promise<T> | any, ms: number = 30000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_CONEXAO_SUPABASE')), ms))
  ]) as any;
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
        const { data, error } = await withTimeout(supabase.from('users').select('*'));
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
      } catch (e) { console.warn("Supabase Users Indisponível"); }
    }
    return db._getLocal(KEYS.USERS);
  },

  saveUser: async (user: User) => {
    const payload = {
      id: user.id, username: user.username, password: user.password,
      displayname: user.displayName, role: user.role, lastlogin: user.lastLogin,
      photo: user.photo, position: user.position, staffid: user.staffId,
      driverid: user.driverId, status: user.status, isfirstlogin: user.isFirstLogin === true,
      lastseen: user.lastSeen, isonlinevisible: user.isOnlineVisible ?? true,
      presence_status: user.presence_status || 'offline', notification_prefs: user.notificationPrefs
    };
    if (supabase) { try { await withTimeout(supabase.from('users').upsert(payload)); } catch (e) {} }
    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);
    return true;
  },

  getNotifications: async (): Promise<Notification[]> => {
    const localNotifs = db._getLocal(KEYS.NOTIFICATIONS);
    if (supabase) {
      try {
        const { data, error } = await withTimeout(supabase
          .from('notifications')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50));
          
        if (!error && data) {
          const mapped: Notification[] = data.map(n => ({
            id: String(n.id), 
            title: n.type.replace(/_/g, ' '), 
            description: n.message, 
            type: n.type as NotificationType,
            origin: (n.origin as NotificationOrigin) || 'OPERACIONAL',
            authorName: n.user_name || 'Sistema', 
            authorId: n.user_id || 'system', 
            timestamp: n.timestamp, 
            summary: { ...n.summary, os: n.os_ref }
          }));

          // Detecção de novas notificações para disparar Toast
          const existingIds = new Set(localNotifs.map((n: any) => n.id));
          const newNotifs = mapped.filter(n => !existingIds.has(n.id));
          
          if (newNotifs.length > 0) {
            // Dispara evento para cada nova notificação encontrada na nuvem
            // Começa da mais antiga para a mais recente para ordem correta
            newNotifs.reverse().forEach(notif => {
              window.dispatchEvent(new CustomEvent('als_new_notification_event', { detail: notif }));
            });
          }

          db._saveLocal(KEYS.NOTIFICATIONS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return localNotifs;
  },

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: Notification['summary']) => {
    const authorName = user.displayName || user.username || 'Sistema';
    const timestamp = new Date().toISOString();
    const osRef = summary?.os || '';
    
    let origin: NotificationOrigin = 'OPERACIONAL';
    if (user.role === 'driver' || user.role === 'motoboy' || ['STATUS_UPDATED', 'DRIVER_DOC_UPLOADED', 'DRIVER_PROFILE_UPDATED'].includes(type)) {
      origin = 'MOTORISTA';
    }
    
    if (supabase) {
      try {
        await withTimeout(supabase.from('notifications').insert({
          user_id: user.id || 'system',
          user_name: authorName,
          type: type,
          origin: origin,
          message: description,
          os_ref: osRef,
          timestamp: timestamp,
          summary: summary || {}
        }));
      } catch (e) {}
    }

    // Nota: O getNotifications sincronizará este item na próxima batida, 
    // mas adicionamos localmente para feedback imediato
    const newNotif: Notification = {
      id: `local-${Date.now()}`,
      title, description, type, origin, authorName, authorId: user.id || 'system', timestamp, summary
    };

    const current = db._getLocal(KEYS.NOTIFICATIONS);
    db._saveLocal(KEYS.NOTIFICATIONS, [newNotif, ...current].slice(0, 100));
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

  updateDriverLocation: async (driverId: string, lat: number, lng: number) => {
    const now = new Date().toISOString();
    if (supabase) {
      try {
        await supabase.from('drivers').update({ 
          current_lat: lat,
          current_lng: lng,
          last_location_at: now
        }).eq('id', driverId);
      } catch (e) {}
    }
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: any) => d.id === driverId);
    if (idx >= 0) {
      current[idx] = { ...current[idx], currentLat: lat, currentLng: lng, lastLocationAt: now };
      db._saveLocal(KEYS.DRIVERS, current);
    }
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) { try { const s = await withTimeout(staffRepository.getAll(supabase)); db._saveLocal(KEYS.STAFF, s); return s; } catch (e) {} }
    return db._getLocal(KEYS.STAFF);
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (supabase) { try { await withTimeout(staffRepository.save(supabase, staff)); } catch (e) {} }
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
    if (supabase) { try { await withTimeout(staffRepository.delete(supabase, id)); } catch (e) {} }
    const current = db._getLocal(KEYS.STAFF);
    db._saveLocal(KEYS.STAFF, current.filter((s: any) => s.id !== id));
    return true;
  },

  getTrips: async (): Promise<Trip[]> => {
    if (supabase) { try { const t = await withTimeout(tripRepository.getAll(supabase)); db._saveLocal(KEYS.TRIPS, t); return t; } catch (e) {} }
    return db._getLocal(KEYS.TRIPS);
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    const currentTrips = db._getLocal(KEYS.TRIPS);
    const oldTrip = currentTrips.find((t: any) => t.id === trip.id);
    if (supabase) { try { await withTimeout(tripRepository.save(supabase, trip)); } catch (e) {} }
    const current = db._getLocal(KEYS.TRIPS);
    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    db._saveLocal(KEYS.TRIPS, current);
    if (actingUser) {
      const summary = { os: trip.os, motorista: trip.driver.name, placa: trip.driver.plateHorse, cliente: trip.customer.name };
      if (!oldTrip) await db.addNotification(actingUser, 'TRIP_CREATED', 'Nova Programação', `OS ${trip.os} cadastrada com sucesso.`, summary);
      else if (oldTrip.status !== trip.status) await db.addNotification(actingUser, 'STATUS_UPDATED', 'Status de Viagem', `A OS ${trip.os} foi alterada para "${trip.status}".`, summary);
    }
    return true;
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    const current = db._getLocal(KEYS.TRIPS);
    const trip = current.find((t: Trip) => t.id === id);
    if (supabase) { try { await withTimeout(tripRepository.delete(supabase, id)); } catch (e) {} }
    db._saveLocal(KEYS.TRIPS, current.filter((t: Trip) => t.id !== id));
    if (actingUser && trip) await db.addNotification(actingUser, 'DELETED', 'Viagem Removida', `A OS ${trip.os} foi removida.`, { os: trip.os, motorista: trip.driver.name });
    return true;
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    if (supabase) { try { await withTimeout(driverRepository.save(supabase, driver)); } catch (e) {} }
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    if (actingUser) await db.addNotification(actingUser, 'DRIVER_UPDATED', 'Cadastro Atualizado', `Motorista ${driver.name} atualizado.`, { motorista: driver.name, placa: driver.plateHorse });
    return true;
  },

  deleteDriver: async (id: string) => {
    if (supabase) { try { await withTimeout(driverRepository.delete(supabase, id)); } catch (e) {} }
    const current = db._getLocal(KEYS.DRIVERS);
    db._saveLocal(KEYS.DRIVERS, current.filter((d: any) => d.id !== id));
    return true;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) { try { const d = await withTimeout(driverRepository.getAll(supabase)); db._saveLocal(KEYS.DRIVERS, d); return d; } catch (e) {} }
    return db._getLocal(KEYS.DRIVERS);
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) { 
      try { 
        const { data } = await withTimeout(supabase.from('customers').select('*')); 
        if (data) { 
          const mapped = data.map(c => ({ ...c, legalName: c.legal_name, zipCode: c.zip_code })) as Customer[];
          db._saveLocal(KEYS.CUSTOMERS, mapped); 
          return mapped; 
        } 
      } catch (e) {} 
    }
    return db._getLocal(KEYS.CUSTOMERS);
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    const payload = { ...customer, legal_name: customer.legalName, zip_code: customer.zipCode };
    if (supabase) { try { await withTimeout(supabase.from('customers').upsert(payload)); } catch (e) {} }
    const current = db._getLocal(KEYS.CUSTOMERS);
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    return true;
  },

  deleteCustomer: async (id: string) => {
    if (supabase) { try { await withTimeout(supabase.from('customers').delete().eq('id', id)); } catch (e) {} }
    const current = db._getLocal(KEYS.CUSTOMERS);
    db._saveLocal(KEYS.CUSTOMERS, current.filter((c: any) => c.id !== id));
    return true;
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) { try { const { data } = await withTimeout(supabase.from('ports').select('*')); if (data) { const mapped = data.map(d => ({ ...d, legalName: d.legal_name, zipCode: d.zip_code })) as Port[]; db._saveLocal(KEYS.PORTS, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.PORTS);
  },

  savePort: async (port: Port, actingUser?: User) => {
    const payload = { ...port, legal_name: port.legalName, zip_code: port.zipCode };
    if (supabase) { try { await withTimeout(supabase.from('ports').upsert(payload)); } catch (e) {} }
    const current = db._getLocal(KEYS.PORTS);
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    db._saveLocal(KEYS.PORTS, current);
    return true;
  },

  deletePort: async (id: string) => {
    if (supabase) { try { await withTimeout(supabase.from('ports').delete().eq('id', id)); } catch (e) {} }
    const current = db._getLocal(KEYS.PORTS);
    db._saveLocal(KEYS.PORTS, current.filter((p: any) => p.id !== id));
    return true;
  },

  getCategories: async (): Promise<Category[]> => {
    if (supabase) { try { const { data } = await withTimeout(supabase.from('categories').select('*')); if (data) { const mapped = data.map(c => ({ ...c, parentId: c.parent_id })) as Category[]; db._saveLocal(KEYS.CATEGORIES, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.CATEGORIES);
  },

  saveCategory: async (category: Category, actingUser?: User) => {
    const payload = { ...category, parent_id: category.parentId };
    if (supabase) { try { await withTimeout(supabase.from('categories').upsert(payload)); } catch (e) {} }
    const current = db._getLocal(KEYS.CATEGORIES);
    const idx = current.findIndex((c: any) => c.id === category.id);
    if (idx >= 0) current[idx] = category; else current.push(category);
    db._saveLocal(KEYS.CATEGORIES, current);
    return true;
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) { try { const { data } = await withTimeout(supabase.from('pre_stacking').select('*')); if (data) { const mapped = data.map(d => ({ ...d, legalName: d.legal_name, zipCode: d.zip_code })) as PreStacking[]; db._saveLocal(KEYS.PRE_STACKING, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.PRE_STACKING);
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    const payload = { ...ps, legal_name: ps.legalName, zip_code: ps.zipCode };
    if (supabase) { try { await withTimeout(supabase.from('pre_stacking').upsert(payload)); } catch (e) {} }
    const current = db._getLocal(KEYS.PRE_STACKING);
    const idx = current.findIndex((p: any) => p.id === ps.id);
    if (idx >= 0) current[idx] = ps; else current.push(ps);
    db._saveLocal(KEYS.PRE_STACKING, current);
    return true;
  },

  deletePreStacking: async (id: string) => {
    if (supabase) { try { await withTimeout(supabase.from('pre_stacking').delete().eq('id', id)); } catch (e) {} }
    const current = db._getLocal(KEYS.PRE_STACKING);
    db._saveLocal(KEYS.PRE_STACKING, current.filter((p: any) => p.id !== id));
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
  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try { 
      const { error } = await withTimeout(supabase.from('users').select('count', { count: 'exact', head: true }).limit(1), 5000); 
      return !error; 
    } catch { return false; }
  },

  importBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          if (data.drivers) db._saveLocal(KEYS.DRIVERS, data.drivers);
          if (data.customers) db._saveLocal(KEYS.CUSTOMERS, data.customers);
          if (data.ports) db._saveLocal(KEYS.PORTS, data.ports);
          if (data.preStacking) db._saveLocal(KEYS.PRE_STACKING, data.preStacking);
          if (data.staff) db._saveLocal(KEYS.STAFF, data.staff);
          if (data.trips) db._saveLocal(KEYS.TRIPS, data.trips);
          if (data.categories) db._saveLocal(KEYS.CATEGORIES, data.categories);
          if (data.users) db._saveLocal(KEYS.USERS, data.users);
          resolve(true);
        } catch (err) { resolve(false); }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  },

  exportBackup: async () => {
    const data = {
      drivers: await db.getDrivers(),
      customers: await db.getCustomers(),
      ports: await db.getPorts(),
      preStacking: await db.getPreStacking(),
      staff: await db.getStaff(),
      trips: await db.getTrips(),
      categories: await db.getCategories(),
      users: await db.getUsers()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};