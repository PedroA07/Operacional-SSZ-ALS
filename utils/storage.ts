
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category } from '../types';
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
  CATEGORIES: 'als_categories',
  PREFERENCES: 'als_ui_preferences'
};

/**
 * Mapper rigoroso para o Supabase.
 * Usa 'lastlogin' e 'isfirstlogin' exatamente como aparecem na estrutura do PostgreSQL.
 */
const userMapper = {
  mapToDb: (u: User) => ({
    id: u.id,
    username: u.username,
    password: u.password,
    display_name: u.displayName,
    role: u.role,
    lastlogin: u.lastLogin,
    photo: u.photo,
    position: u.position,
    staff_id: u.staffId,
    driver_id: u.driverId,
    status: u.status,
    isfirstlogin: u.isFirstLogin === true,
    last_seen: u.lastSeen,
    is_online_visible: u.isOnlineVisible ?? true
  }),
  mapFromDb: (u: any): User => {
    // Tenta ler de várias combinações possíveis para garantir compatibilidade
    const finalLoginDate = u.lastlogin || u.last_login || u.lastLogin || new Date().toISOString();
    const isFirst = u.isfirstlogin ?? u.is_first_login ?? u.isFirstLogin ?? false;

    return {
      id: u.id,
      username: u.username,
      password: u.password,
      displayName: u.display_name || u.displayname || u.displayName || u.username,
      role: u.role,
      lastLogin: finalLoginDate,
      photo: u.photo,
      position: u.position,
      staffId: u.staff_id || u.staffid || u.staffId,
      driverId: u.driver_id || u.driverid || u.driverId,
      status: u.status,
      isFirstLogin: isFirst === true || isFirst === 'true',
      lastSeen: u.last_seen || u.lastseen || u.lastSeen,
      isOnlineVisible: u.is_online_visible ?? u.isonlinevisible ?? u.isOnlineVisible ?? true
    };
  }
};

export const db = {
  _saveLocal: (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data)),
  _getLocal: (key: string) => JSON.parse(localStorage.getItem(key) || '[]'),

  isCloudActive: () => !!supabase,

  updatePresence: async (userId: string, isVisible: boolean) => {
    const now = new Date().toISOString();
    if (supabase) {
      await supabase.from('users').update({ 
        last_seen: now, 
        is_online_visible: isVisible 
      }).eq('id', userId);
    }
    
    const users = db._getLocal(KEYS.USERS);
    const idx = users.findIndex((u: any) => u.id === userId);
    if (idx >= 0) {
      users[idx] = { ...users[idx], last_seen: now, is_online_visible: isVisible };
      db._saveLocal(KEYS.USERS, users);
    }
  },

  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (data) {
        const mapped = data.map(u => userMapper.mapFromDb(u));
        db._saveLocal(KEYS.USERS, data); 
        return mapped;
      }
    }
    return db._getLocal(KEYS.USERS).map((u: any) => userMapper.mapFromDb(u));
  },

  saveUser: async (user: User) => {
    const payload = userMapper.mapToDb(user);
    if (supabase) {
      const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' });
      if (error) console.error("Erro ao sincronizar lastlogin no banco:", error);
    }
    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = payload; else current.push(payload);
    db._saveLocal(KEYS.USERS, current);
    return true;
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      const { data } = await supabase.from('staff').select('*').order('name');
      if (data) { db._saveLocal(KEYS.STAFF, data); return data; }
    }
    return db._getLocal(KEYS.STAFF);
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (supabase) await supabase.from('staff').upsert(staff);
    const current = db._getLocal(KEYS.STAFF);
    const idx = current.findIndex((s: Staff) => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    db._saveLocal(KEYS.STAFF, current);

    const users = await db.getUsers();
    const existingUser = users.find(u => u.staffId === staff.id);
    
    const userToSave: User = {
      id: existingUser?.id || `u-${staff.id}`,
      username: staff.username,
      displayName: staff.name,
      role: staff.role,
      lastLogin: existingUser?.lastLogin || new Date().toISOString(),
      staffId: staff.id,
      position: staff.position,
      status: staff.status,
      photo: staff.photo,
      isFirstLogin: existingUser ? existingUser.isFirstLogin : true
    };
    
    if (password) {
      userToSave.password = password;
      userToSave.isFirstLogin = false;
    } else if (!existingUser) {
      userToSave.password = '12345678';
    } else {
      userToSave.password = existingUser.password;
    }

    await db.saveUser(userToSave);
    return true;
  },

  getTrips: async (): Promise<Trip[]> => {
    if (supabase) {
      const { data } = await supabase.from('trips').select('*').order('dateTime', { ascending: false });
      if (data) { db._saveLocal(KEYS.TRIPS, data); return data; }
    }
    return db._getLocal(KEYS.TRIPS);
  },

  saveTrip: async (trip: Trip) => {
    if (supabase) await supabase.from('trips').upsert(trip);
    const current = db._getLocal(KEYS.TRIPS);
    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    db._saveLocal(KEYS.TRIPS, current);
    return true;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      try {
        const drivers = await driverRepository.getAll(supabase);
        db._saveLocal(KEYS.DRIVERS, drivers);
        return drivers;
      } catch (e) { }
    }
    return db._getLocal(KEYS.DRIVERS);
  },

  saveDriver: async (driver: Driver) => {
    if (supabase) await driverRepository.save(supabase, driver);
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: Driver) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    return true;
  },

  deleteDriver: async (id: string) => {
    if (supabase) await driverRepository.delete(supabase, id);
    const current = db._getLocal(KEYS.DRIVERS).filter((d: Driver) => d.id !== id);
    db._saveLocal(KEYS.DRIVERS, current);
    return true;
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      const { data } = await supabase.from('customers').select('*').order('name');
      if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; }
    }
    return db._getLocal(KEYS.CUSTOMERS);
  },

  saveCustomer: async (customer: Customer) => {
    if (supabase) await supabase.from('customers').upsert(customer);
    const current = db._getLocal(KEYS.CUSTOMERS);
    const idx = current.findIndex((c: Customer) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    return true;
  },

  deleteCustomer: async (id: string) => {
    if (supabase) await supabase.from('customers').delete().eq('id', id);
    const current = db._getLocal(KEYS.CUSTOMERS).filter((c: Customer) => c.id !== id);
    db._saveLocal(KEYS.CUSTOMERS, current);
    return true;
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) {
      const { data } = await supabase.from('ports').select('*').order('name');
      if (data) { db._saveLocal(KEYS.PORTS, data); return data; }
    }
    return db._getLocal(KEYS.PORTS);
  },

  savePort: async (port: Port) => {
    if (supabase) await supabase.from('ports').upsert(port);
    const current = db._getLocal(KEYS.PORTS);
    const idx = current.findIndex((p: Port) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    db._saveLocal(KEYS.PORTS, current);
    return true;
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) {
      const { data } = await supabase.from('pre_stacking').select('*').order('name');
      if (data) { db._saveLocal(KEYS.PRE_STACKING, data); return data; }
    }
    return db._getLocal(KEYS.PRE_STACKING);
  },

  savePreStacking: async (ps: PreStacking) => {
    if (supabase) await supabase.from('pre_stacking').upsert(ps);
    const current = db._getLocal(KEYS.PRE_STACKING);
    const idx = current.findIndex((p: PreStacking) => p.id === ps.id);
    if (idx >= 0) current[idx] = ps; else current.push(ps);
    db._saveLocal(KEYS.PRE_STACKING, current);
    return true;
  },

  getCategories: async (): Promise<Category[]> => {
    if (supabase) {
      const { data } = await supabase.from('categories').select('*');
      if (data) { db._saveLocal(KEYS.CATEGORIES, data); return data; }
    }
    return db._getLocal(KEYS.CATEGORIES);
  },

  saveCategory: async (category: Partial<Category>) => {
    const newCat = { ...category, id: category.id || `cat-${Date.now()}` } as Category;
    if (supabase) await supabase.from('categories').upsert(newCat);
    const current = db._getLocal(KEYS.CATEGORIES);
    const idx = current.findIndex((c: Category) => c.id === newCat.id);
    if (idx >= 0) current[idx] = newCat; else current.push(newCat);
    db._saveLocal(KEYS.CATEGORIES, current);
    return true;
  },

  deleteStaff: async (id: string) => {
    if (supabase) await supabase.from('staff').delete().eq('id', id);
    const current = db._getLocal(KEYS.STAFF).filter((s: Staff) => s.id !== id);
    db._saveLocal(KEYS.STAFF, current);
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
    for (const key of Object.values(KEYS)) {
      backup[key] = localStorage.getItem(key);
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File) => {
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      for (const key of Object.values(KEYS)) {
        if (backup[key]) localStorage.setItem(key, backup[key]);
      }
      return true;
    } catch {
      return false;
    }
  }
};
