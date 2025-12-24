
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, UserPreferences, Trip, TripStatus } from '../types';
import { driverRepository } from './driverRepository';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export const KEYS = {
  DRIVERS: 'als_drivers',
  CUSTOMERS: 'als_customers',
  PORTS: 'als_ports',
  PRE_STACKING: 'als_pre_stacking',
  STAFF: 'als_staff',
  USERS: 'als_users',
  TRIPS: 'als_trips',
  PREFERENCES: 'als_ui_preferences'
};

export const db = {
  _saveLocal: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  _getLocal: (key: string) => {
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  isCloudActive: () => !!supabase,

  // UI Preferences
  getPreferences: (userId: string): UserPreferences => {
    const allPrefs = JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || '{}');
    return allPrefs[userId] || { visibleColumns: {} };
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const allPrefs = JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || '{}');
    if (!allPrefs[userId]) allPrefs[userId] = { visibleColumns: {} };
    allPrefs[userId].visibleColumns[componentId] = columns;
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(allPrefs));
  },

  // TRIP MANAGEMENT (OPERATIONS)
  getTrips: async (): Promise<Trip[]> => {
    const local = db._getLocal(KEYS.TRIPS);
    if (supabase) {
      const { data } = await supabase.from('trips').select('*');
      if (data) { db._saveLocal(KEYS.TRIPS, data); return data; }
    }
    return local;
  },

  saveTrip: async (trip: Trip) => {
    const current = db._getLocal(KEYS.TRIPS);
    
    // Bloqueio de OS Duplicada
    const isDuplicate = current.some((t: Trip) => t.os === trip.os && t.id !== trip.id);
    if (isDuplicate) {
      throw new Error(`A OS Nº ${trip.os} já existe no sistema.`);
    }

    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) { current[idx] = trip; } else { current.push(trip); }
    db._saveLocal(KEYS.TRIPS, current);

    if (supabase) {
      try {
        await supabase.from('trips').upsert(trip);
      } catch (e) {
        console.error("Supabase trip save error:", e);
      }
    }
    return true;
  },

  // Presence & User logic
  updatePresence: async (userId: string, isVisible: boolean) => {
    if (!supabase) return;
    try {
      await supabase.from('users').update({ 
        lastseen: new Date().toISOString(),
        isonlinevisible: isVisible 
      }).eq('id', userId);
    } catch (e) { }
  },

  getUsers: async (): Promise<User[]> => {
    const localData = db._getLocal(KEYS.USERS);
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          const normalized = data.map((u: any) => ({
            id: u.id, username: u.username, password: u.password, displayName: u.name || u.displayName,
            role: u.role, staffId: u.staffid || u.staffId, driverId: u.driverid || u.driverId,
            lastLogin: u.lastlogin || u.lastLogin, lastSeen: u.lastseen || u.lastSeen,
            position: u.position, photo: u.photo, isOnlineVisible: u.isonlinevisible ?? true,
            isFirstLogin: u.isfirstlogin ?? (u.isFirstLogin ?? true), status: u.status || 'Ativo'
          }));
          db._saveLocal(KEYS.USERS, normalized);
          return normalized;
        }
      } catch (e) { }
    }
    return localData;
  },

  saveUser: async (user: User) => {
    const lowerUsername = user.username.toLowerCase();
    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: any) => u.id === user.id || u.username.toLowerCase() === lowerUsername);
    if (idx >= 0) { current[idx] = { ...current[idx], ...user, username: lowerUsername }; } else { current.push({ ...user, username: lowerUsername }); }
    db._saveLocal(KEYS.USERS, current);
    if (supabase) {
      await supabase.from('users').upsert({
        id: user.id, username: lowerUsername, password: user.password, name: user.displayName.toUpperCase(),
        role: user.role, staffid: user.staffId, driverid: user.driverId, lastlogin: user.lastLogin,
        position: user.position?.toUpperCase(), status: user.status || 'Ativo', isfirstlogin: user.isFirstLogin ?? true, photo: user.photo
      });
    }
  },

  getDrivers: async (): Promise<Driver[]> => {
    const localData = db._getLocal(KEYS.DRIVERS);
    if (supabase) {
      try {
        const drivers = await driverRepository.getAll(supabase);
        db._saveLocal(KEYS.DRIVERS, drivers);
        return drivers;
      } catch (e) { }
    }
    return localData;
  },

  saveDriver: async (driver: Driver) => {
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) { current[idx] = driver; } else { current.push(driver); }
    db._saveLocal(KEYS.DRIVERS, current);
    if (supabase) await driverRepository.save(supabase, driver);
  },

  deleteDriver: async (id: string) => {
    const currentDrivers = db._getLocal(KEYS.DRIVERS);
    db._saveLocal(KEYS.DRIVERS, currentDrivers.filter((d: any) => d.id !== id));
    if (supabase) await driverRepository.delete(supabase, id);
    const users = await db.getUsers();
    const user = users.find(u => u.driverId === id);
    if (user) {
      db._saveLocal(KEYS.USERS, users.filter(u => u.id !== user.id));
      if (supabase) await supabase.from('users').delete().eq('id', user.id);
    }
    return true;
  },

  getCustomers: async (): Promise<Customer[]> => {
    const localData = db._getLocal(KEYS.CUSTOMERS);
    if (supabase) {
      const { data } = await supabase.from('customers').select('*');
      if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; }
    }
    return localData;
  },

  saveCustomer: async (customer: Customer) => {
    const current = db._getLocal(KEYS.CUSTOMERS);
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) { current[idx] = customer; } else { current.push(customer); }
    db._saveLocal(KEYS.CUSTOMERS, current);
    if (supabase) await supabase.from('customers').upsert(customer);
  },

  deleteCustomer: async (id: string) => {
    const current = db._getLocal(KEYS.CUSTOMERS);
    db._saveLocal(KEYS.CUSTOMERS, current.filter((c: any) => c.id !== id));
    if (supabase) await supabase.from('customers').delete().eq('id', id);
    return true;
  },

  getPorts: async (): Promise<Port[]> => {
    const localData = db._getLocal(KEYS.PORTS);
    if (supabase) {
      const { data } = await supabase.from('ports').select('*');
      if (data) { db._saveLocal(KEYS.PORTS, data); return data; }
    }
    return localData;
  },

  savePort: async (port: Port) => {
    const current = db._getLocal(KEYS.PORTS);
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) { current[idx] = port; } else { current.push(port); }
    db._saveLocal(KEYS.PORTS, current);
    if (supabase) await supabase.from('ports').upsert(port);
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    const localData = db._getLocal(KEYS.PRE_STACKING);
    if (supabase) {
      const { data } = await supabase.from('pre_stacking').select('*');
      if (data) { db._saveLocal(KEYS.PRE_STACKING, data); return data; }
    }
    return localData;
  },

  savePreStacking: async (ps: PreStacking) => {
    const current = db._getLocal(KEYS.PRE_STACKING);
    const idx = current.findIndex((p: any) => p.id === ps.id);
    if (idx >= 0) { current[idx] = ps; } else { current.push(ps); }
    db._saveLocal(KEYS.PRE_STACKING, current);
    if (supabase) await supabase.from('pre_stacking').upsert(ps);
  },

  getStaff: async (): Promise<Staff[]> => {
    const localData = db._getLocal(KEYS.STAFF);
    if (supabase) {
      try {
        const { data, error } = await supabase.from('staff').select('*');
        if (!error && data) {
          const normalized = data.map((s: any) => ({
            id: s.id, photo: s.photo, name: s.name, position: s.position, username: s.username, role: s.role,
            registrationDate: s.registration_date || s.registrationDate, lastLogin: s.last_login || s.lastLogin,
            emailCorp: s.email_corp || s.emailCorp, phoneCorp: s.phone_corp || s.phoneCorp,
            status: s.status || 'Ativo', statusSince: s.status_since || s.statusSince
          }));
          db._saveLocal(KEYS.STAFF, normalized);
          return normalized;
        }
      } catch (e) { }
    }
    return localData;
  },

  saveStaff: async (staff: Staff, password?: string) => {
    const currentStaff = db._getLocal(KEYS.STAFF);
    const sIdx = currentStaff.findIndex((s: any) => s.id === staff.id);
    if (sIdx >= 0) { currentStaff[sIdx] = staff; } else { currentStaff.push(staff); }
    db._saveLocal(KEYS.STAFF, currentStaff);
    if (supabase) {
      await supabase.from('staff').upsert({
        id: staff.id, photo: staff.photo || null, name: staff.name.toUpperCase(), position: staff.position.toUpperCase(),
        username: staff.username.toLowerCase(), role: staff.role, registration_date: staff.registrationDate,
        // Fix: Use camelCase property names from the Staff interface
        last_login: staff.lastLogin || null, email_corp: staff.emailCorp || null, 
        phone_corp: staff.phoneCorp || null, status: staff.status || 'Ativo', status_since: staff.statusSince || new Date().toISOString()
      });
    }
    const users = await db.getUsers();
    const existingUser = users.find(u => u.staffId === staff.id);
    const userData: User = {
      id: existingUser?.id || `u-${staff.id}`, username: staff.username.toLowerCase(), displayName: staff.name.toUpperCase(),
      role: staff.role, staffId: staff.id, lastLogin: staff.lastLogin || staff.registrationDate,
      position: staff.position.toUpperCase(), photo: staff.photo, status: staff.status as 'Ativo' | 'Inativo',
      isFirstLogin: existingUser ? existingUser.isFirstLogin : true, password: existingUser?.password
    };
    if (password) { userData.password = password; userData.isFirstLogin = true; }
    await db.saveUser(userData);
  },

  deleteStaff: async (id: string) => {
    const currentStaff = db._getLocal(KEYS.STAFF);
    db._saveLocal(KEYS.STAFF, currentStaff.filter((s: any) => s.id !== id));
    if (supabase) await supabase.from('staff').delete().eq('id', id);
    const users = await db.getUsers();
    const user = users.find(u => u.staffId === id);
    if (user) {
      db._saveLocal(KEYS.USERS, users.filter((u: any) => u.id !== user.id));
      if (supabase) await supabase.from('users').delete().eq('id', user.id);
    }
    return true;
  },

  exportBackup: async () => {
    const backup = { drivers: await db.getDrivers(), customers: await db.getCustomers(), ports: await db.getPorts(), preStacking: await db.getPreStacking(), staff: await db.getStaff(), users: await db.getUsers(), trips: await db.getTrips() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
  },

  importBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (content.drivers) db._saveLocal(KEYS.DRIVERS, content.drivers);
          if (content.customers) db._saveLocal(KEYS.CUSTOMERS, content.customers);
          if (content.ports) db._saveLocal(KEYS.PORTS, content.ports);
          if (content.preStacking) db._saveLocal(KEYS.PRE_STACKING, content.preStacking);
          if (content.staff) db._saveLocal(KEYS.STAFF, content.staff);
          if (content.users) db._saveLocal(KEYS.USERS, content.users);
          if (content.trips) db._saveLocal(KEYS.TRIPS, content.trips);
          resolve(true);
        } catch (err) { resolve(false); }
      };
      reader.readAsText(file);
    });
  }
};
