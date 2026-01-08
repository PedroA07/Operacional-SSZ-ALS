
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus } from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';
import { offlineManager } from './offlineManager';

let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
  // @ts-ignore
  SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  // @ts-ignore
  SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
} catch (e) {}

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export const KEYS = {
  DRIVERS: 'drivers',
  CUSTOMERS: 'customers',
  PORTS: 'ports',
  PRE_STACKING: 'pre_stacking',
  STAFF: 'staff',
  USERS: 'users',
  TRIPS: 'trips',
  CATEGORIES: 'categories',
  NOTIFICATIONS: 'notifications'
};

const withTimeout = <T = any>(promise: Promise<T> | any, ms: number = 8000): Promise<T> => {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
  ]) as any;
};

export const db = {
  // --- PROCESSADOR DE SINCRONIZAÇÃO (CHAMADO PELO DASHBOARD) ---
  processSyncQueue: async () => {
    if (!supabase) return;
    const queue = offlineManager.getQueue();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        let success = false;
        switch (item.type) {
          case 'TRIP':
            await tripRepository.save(supabase, item.payload);
            success = true;
            break;
          case 'DRIVER':
            await driverRepository.save(supabase, item.payload);
            success = true;
            break;
          case 'CUSTOMER':
            await supabase.from('customers').upsert({ ...item.payload, legal_name: item.payload.legalName, zip_code: item.payload.zipCode });
            success = true;
            break;
          case 'PORT':
            await supabase.from('ports').upsert({ ...item.payload, legal_name: item.payload.legalName, zip_code: item.payload.zipCode });
            success = true;
            break;
          case 'PRESTACKING':
            await supabase.from('pre_stacking').upsert({ ...item.payload, legal_name: item.payload.legalName, zip_code: item.payload.zipCode });
            success = true;
            break;
          case 'STAFF':
            await staffRepository.save(supabase, item.payload);
            success = true;
            break;
          case 'CATEGORY':
            await supabase.from('categories').upsert({ ...item.payload, parent_id: item.payload.parentId });
            success = true;
            break;
        }

        if (success) offlineManager.removeFromQueue(item.id);
      } catch (e) {
        offlineManager.updateAttempt(item.id);
      }
    }
  },

  // --- LEITURAS COM CACHE ---

  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      try {
        const { data, error } = await withTimeout(supabase.from('users').select('*'));
        if (!error && data) {
          const mapped = data.map(u => ({
            id: u.id, username: u.username, password: u.password,
            displayName: u.displayname || u.username, role: u.role,
            lastLogin: u.lastlogin || new Date().toISOString(),
            photo: u.photo, position: u.position, staffId: u.staffid,
            driverId: u.driverid, status: u.status, isFirstLogin: u.isfirstlogin === true,
            lastSeen: u.lastseen, isOnlineVisible: u.isonlinevisible ?? true,
            presence_status: u.presence_status || 'offline',
            notificationPrefs: u.notification_prefs
          }));
          offlineManager.setRegistry(KEYS.USERS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return offlineManager.getRegistry<User>(KEYS.USERS);
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      try {
        const data = await withTimeout(driverRepository.getAll(supabase));
        if (data) { offlineManager.setRegistry(KEYS.DRIVERS, data); return data; }
      } catch (e) {}
    }
    return offlineManager.getRegistry<Driver>(KEYS.DRIVERS);
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      try {
        const { data } = await withTimeout(supabase.from('customers').select('*'));
        if (data) {
          const mapped = data.map(c => ({ ...c, legalName: c.legal_name, zipCode: c.zip_code })) as Customer[];
          offlineManager.setRegistry(KEYS.CUSTOMERS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return offlineManager.getRegistry<Customer>(KEYS.CUSTOMERS);
  },

  getTrips: async (): Promise<Trip[]> => {
    if (supabase) {
      try {
        const data = await withTimeout(tripRepository.getAll(supabase));
        if (data) { offlineManager.setRegistry(KEYS.TRIPS, data); return data; }
      } catch (e) {}
    }
    return offlineManager.getRegistry<Trip>(KEYS.TRIPS);
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) {
      try {
        const { data } = await withTimeout(supabase.from('ports').select('*'));
        if (data) {
          const mapped = data.map(d => ({ ...d, legalName: d.legal_name, zipCode: d.zip_code })) as Port[];
          offlineManager.setRegistry(KEYS.PORTS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return offlineManager.getRegistry<Port>(KEYS.PORTS);
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) {
      try {
        const { data } = await withTimeout(supabase.from('pre_stacking').select('*'));
        if (data) {
          const mapped = data.map(d => ({ ...d, legalName: d.legal_name, zipCode: d.zip_code })) as PreStacking[];
          offlineManager.setRegistry(KEYS.PRE_STACKING, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return offlineManager.getRegistry<PreStacking>(KEYS.PRE_STACKING);
  },

  getCategories: async (): Promise<Category[]> => {
    if (supabase) {
      try {
        const { data } = await withTimeout(supabase.from('categories').select('*'));
        if (data) {
          const mapped = data.map(c => ({ ...c, parentId: c.parent_id })) as Category[];
          offlineManager.setRegistry(KEYS.CATEGORIES, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return offlineManager.getRegistry<Category>(KEYS.CATEGORIES);
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      try {
        const data = await withTimeout(staffRepository.getAll(supabase));
        if (data) { offlineManager.setRegistry(KEYS.STAFF, data); return data; }
      } catch (e) {}
    }
    return offlineManager.getRegistry<Staff>(KEYS.STAFF);
  },

  // --- ESCRITAS ENFILEIRADAS (OFFLINE FIRST) ---

  saveTrip: async (trip: Trip, actingUser?: User) => {
    // 1. Atualiza Cache Local Imediato para UX
    const current = offlineManager.getRegistry<Trip>(KEYS.TRIPS);
    const idx = current.findIndex(t => t.id === trip.id);
    const oldTrip = idx >= 0 ? current[idx] : null;
    
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    offlineManager.setRegistry(KEYS.TRIPS, current);

    // 2. Adiciona à Fila de Sync
    offlineManager.addToQueue('TRIP', 'UPSERT', trip);

    // 3. Notificações locais
    if (actingUser) {
      const summary = { os: trip.os, motorista: trip.driver.name, placa: trip.driver.plateHorse, cliente: trip.customer.name };
      if (!oldTrip) {
        await db.addNotification(actingUser, 'TRIP_CREATED', 'Nova Programação', `A OS ${trip.os} foi cadastrada por ${actingUser.displayName}.`, summary);
      } else if (oldTrip.status !== trip.status) {
        await db.addNotification(actingUser, 'STATUS_UPDATED', 'Status de Viagem', `A OS ${trip.os} foi alterada para "${trip.status}" por ${actingUser.displayName}.`, summary);
      }
    }
    
    // 4. Tenta processar fila imediatamente
    db.processSyncQueue();
    return true;
  },

  saveUser: async (user: User) => {
    const current = offlineManager.getRegistry<User>(KEYS.USERS);
    const idx = current.findIndex(u => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    offlineManager.setRegistry(KEYS.USERS, current);

    const payload = {
      id: user.id, username: user.username, password: user.password,
      displayname: user.displayName, role: user.role, lastlogin: user.lastLogin,
      photo: user.photo, position: user.position, staffid: user.staffId,
      driverid: user.driverId, status: user.status, isfirstlogin: user.isFirstLogin === true,
      lastseen: user.lastSeen, isonlinevisible: user.isOnlineVisible ?? true,
      presence_status: user.presence_status || 'offline', notification_prefs: user.notificationPrefs
    };

    if (supabase) {
      try { await supabase.from('users').upsert(payload); } catch (e) {}
    }
    return true;
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    const current = offlineManager.getRegistry<Driver>(KEYS.DRIVERS);
    const idx = current.findIndex(d => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    offlineManager.setRegistry(KEYS.DRIVERS, current);

    offlineManager.addToQueue('DRIVER', 'UPSERT', driver);
    if (actingUser) await db.addNotification(actingUser, 'DRIVER_UPDATED', 'Cadastro Atualizado', `Motorista ${driver.name} atualizado por ${actingUser.displayName}.`, { motorista: driver.name, placa: driver.plateHorse });
    db.processSyncQueue();
    return true;
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    const current = offlineManager.getRegistry<Customer>(KEYS.CUSTOMERS);
    const idx = current.findIndex(c => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    offlineManager.setRegistry(KEYS.CUSTOMERS, current);

    offlineManager.addToQueue('CUSTOMER', 'UPSERT', customer);
    if (actingUser) await db.addNotification(actingUser, 'CUSTOMER_UPDATED', 'Cadastro Cliente', `Cliente ${customer.name} atualizado por ${actingUser.displayName}.`, { cliente: customer.name });
    db.processSyncQueue();
    return true;
  },

  savePort: async (port: Port, actingUser?: User) => {
    const current = offlineManager.getRegistry<Port>(KEYS.PORTS);
    const idx = current.findIndex(p => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    offlineManager.setRegistry(KEYS.PORTS, current);
    offlineManager.addToQueue('PORT', 'UPSERT', port);
    db.processSyncQueue();
    return true;
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    const current = offlineManager.getRegistry<PreStacking>(KEYS.PRE_STACKING);
    const idx = current.findIndex(p => p.id === ps.id);
    if (idx >= 0) current[idx] = ps; else current.push(ps);
    offlineManager.setRegistry(KEYS.PRE_STACKING, current);
    offlineManager.addToQueue('PRESTACKING', 'UPSERT', ps);
    db.processSyncQueue();
    return true;
  },

  saveStaff: async (staff: Staff, password?: string) => {
    const current = offlineManager.getRegistry<Staff>(KEYS.STAFF);
    const idx = current.findIndex(s => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    offlineManager.setRegistry(KEYS.STAFF, current);
    
    offlineManager.addToQueue('STAFF', 'UPSERT', staff);

    if (password) {
      const users = await db.getUsers();
      const linked = users.find(u => u.staffId === staff.id);
      if (linked) await db.saveUser({ ...linked, password });
    }

    db.processSyncQueue();
    return true;
  },

  saveCategory: async (category: Category, actingUser?: User) => {
    const current = offlineManager.getRegistry<Category>(KEYS.CATEGORIES);
    const idx = current.findIndex(c => c.id === category.id);
    if (idx >= 0) current[idx] = category; else current.push(category);
    offlineManager.setRegistry(KEYS.CATEGORIES, current);
    offlineManager.addToQueue('CATEGORY', 'UPSERT', category);
    db.processSyncQueue();
    return true;
  },

  // --- OUTROS ---

  getNotifications: async (): Promise<Notification[]> => {
    if (supabase) {
      try {
        const { data, error } = await withTimeout(supabase
          .from('notifications')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50));
        if (!error && data) {
          const mapped: Notification[] = data.map(n => ({
            id: String(n.id), title: n.type.replace(/_/g, ' '), 
            description: n.message, type: n.type as NotificationType,
            origin: (n.origin as NotificationOrigin) || 'OPERACIONAL',
            authorName: n.user_name || 'Sistema', authorId: n.user_id || 'system', 
            timestamp: n.timestamp, summary: { ...n.summary, os: n.os_ref }
          }));
          return mapped;
        }
      } catch (e) {}
    }
    return [];
  },

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: Notification['summary']) => {
    const authorName = user.displayName || user.username || 'Sistema';
    const timestamp = new Date().toISOString();
    const osRef = summary?.os || '';
    let origin: NotificationOrigin = user.role === 'driver' || user.role === 'motoboy' ? 'MOTORISTA' : 'OPERACIONAL';
    
    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          user_id: user.id || 'system', user_name: authorName, type, origin,
          message: description, os_ref: osRef, timestamp, summary: summary || {}
        });
      } catch (e) {}
    }
    
    const newNotif: Notification = { id: `local-${Date.now()}`, title, description, type, origin, authorName, authorId: user.id || 'system', timestamp, summary };
    window.dispatchEvent(new CustomEvent('als_new_notification_event', { detail: newNotif }));
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (supabase) {
      try {
        await supabase.from('users').update({ lastseen: new Date().toISOString(), presence_status: status }).eq('id', userId);
      } catch (e) {}
    }
  },

  updateDriverLocation: async (driverId: string, lat: number, lng: number) => {
    const now = new Date().toISOString();
    if (supabase) {
      try {
        await supabase.from('drivers').update({ current_lat: lat, current_lng: lng, last_location_at: now }).eq('id', driverId);
      } catch (e) {}
    }
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    const current = offlineManager.getRegistry<Trip>(KEYS.TRIPS);
    const trip = current.find(t => t.id === id);
    offlineManager.setRegistry(KEYS.TRIPS, current.filter(t => t.id !== id));
    
    if (supabase) {
      try { await supabase.from('trips').delete().eq('id', id); } catch (e) {}
    }

    if (actingUser && trip) {
      await db.addNotification(actingUser, 'DELETED', 'Viagem Removida', `A OS ${trip.os} foi removida por ${actingUser.displayName}.`, { os: trip.os, motorista: trip.driver.name });
    }
    return true;
  },

  deleteDriver: async (id: string) => {
    const current = offlineManager.getRegistry<Driver>(KEYS.DRIVERS);
    offlineManager.setRegistry(KEYS.DRIVERS, current.filter(d => d.id !== id));
    if (supabase) { try { await supabase.from('drivers').delete().eq('id', id); } catch (e) {} }
    return true;
  },

  deleteCustomer: async (id: string) => {
    const current = offlineManager.getRegistry<Customer>(KEYS.CUSTOMERS);
    const idx = current.findIndex(c => c.id === id);
    offlineManager.setRegistry(KEYS.CUSTOMERS, current.filter(c => c.id !== id));
    if (supabase) { try { await supabase.from('customers').delete().eq('id', id); } catch (e) {} }
    return true;
  },

  deletePort: async (id: string) => {
    const current = offlineManager.getRegistry<Port>(KEYS.PORTS);
    offlineManager.setRegistry(KEYS.PORTS, current.filter(p => p.id !== id));
    if (supabase) { try { await supabase.from('ports').delete().eq('id', id); } catch (e) {} }
    return true;
  },

  deletePreStacking: async (id: string) => {
    const current = offlineManager.getRegistry<PreStacking>(KEYS.PRE_STACKING);
    offlineManager.setRegistry(KEYS.PRE_STACKING, current.filter(p => p.id !== id));
    if (supabase) { try { await supabase.from('pre_stacking').delete().eq('id', id); } catch (e) {} }
    return true;
  },

  deleteStaff: async (id: string) => {
    const current = offlineManager.getRegistry<Staff>(KEYS.STAFF);
    offlineManager.setRegistry(KEYS.STAFF, current.filter(s => s.id !== id));
    if (supabase) { try { await supabase.from('staff').delete().eq('id', id); } catch (e) {} }
    return true;
  },

  getPreferences: (userId: string) => {
    const allPrefs = JSON.parse(localStorage.getItem('als_ui_preferences') || '{}');
    return allPrefs[userId] || { visibleColumns: {} };
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const allPrefs = JSON.parse(localStorage.getItem('als_ui_preferences') || '{}');
    if (!allPrefs[userId]) allPrefs[userId] = { visibleColumns: {} };
    allPrefs[userId].visibleColumns[componentId] = columns;
    localStorage.setItem('als_ui_preferences', JSON.stringify(allPrefs));
  },

  // --- BACKUP & RESTORE ---

  /* Fix: Add exportBackup to fixed SystemTab.tsx error line 20 */
  exportBackup: async () => {
    const backup: Record<string, any> = {};
    Object.values(KEYS).forEach(key => {
      backup[key] = offlineManager.getRegistry(key);
    });
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALS_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /* Fix: Add importBackup to fixed SystemTab.tsx error line 39 */
  importBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (!content || typeof content !== 'object') {
            resolve(false);
            return;
          }
          
          Object.values(KEYS).forEach(key => {
            if (Array.isArray(content[key])) {
              offlineManager.setRegistry(key, content[key]);
            }
          });
          resolve(true);
        } catch (error) {
          console.error("Erro na importação ALS:", error);
          resolve(false);
        }
      };
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try { 
      const { error } = await withTimeout(supabase.from('users').select('count', { count: 'exact', head: true }).limit(1), 3000); 
      return !error; 
    } catch { return false; }
  }
};
