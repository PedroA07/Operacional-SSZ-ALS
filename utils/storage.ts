

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

export const db = {
  _saveLocal: (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data)),
  _getLocal: (key: string) => JSON.parse(localStorage.getItem(key) || '[]'),

  isCloudActive: () => !!supabase,

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

  /* Added missing methods for presence and entity management */
  updatePresence: async (userId: string, isVisible: boolean) => {
    const users = db._getLocal(KEYS.USERS);
    const idx = users.findIndex((u: User) => u.id === userId);
    if (idx >= 0) {
      users[idx] = { ...users[idx], lastSeen: new Date().toISOString(), isOnlineVisible: isVisible };
      db._saveLocal(KEYS.USERS, users);
      if (supabase) await supabase.from('users').upsert({ id: userId, last_seen: users[idx].lastSeen, is_online_visible: isVisible });
    }
  },

  // CATEGORIES
  getCategories: async (): Promise<Category[]> => {
    const local = db._getLocal(KEYS.CATEGORIES);
    if (supabase) {
      const { data } = await supabase.from('categories').select('*');
      if (data) { db._saveLocal(KEYS.CATEGORIES, data); return data; }
    }
    return local;
  },

  saveCategory: async (cat: Partial<Category>) => {
    const current = db._getLocal(KEYS.CATEGORIES);
    const newCat = { ...cat, id: cat.id || `cat-${Date.now()}` } as Category;
    const idx = current.findIndex((c: any) => c.id === newCat.id);
    if (idx >= 0) current[idx] = newCat; else current.push(newCat);
    db._saveLocal(KEYS.CATEGORIES, current);
    if (supabase) await supabase.from('categories').upsert(newCat);
    return newCat;
  },

  // TRIPS
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
    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    db._saveLocal(KEYS.TRIPS, current);
    if (supabase) await supabase.from('trips').upsert(trip);
    return true;
  },

  // DRIVERS
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

  saveDriver: async (driver: Driver, id?: string) => {
    const current = db._getLocal(KEYS.DRIVERS);
    const drvId = id || driver.id;
    const idx = current.findIndex((d: Driver) => d.id === drvId);
    if (idx >= 0) current[idx] = { ...driver, id: drvId }; else current.push({ ...driver, id: drvId });
    db._saveLocal(KEYS.DRIVERS, current);
    if (supabase) await driverRepository.save(supabase, { ...driver, id: drvId });
    return true;
  },

  deleteDriver: async (id: string) => {
    const current = db._getLocal(KEYS.DRIVERS);
    const filtered = current.filter((d: Driver) => d.id !== id);
    db._saveLocal(KEYS.DRIVERS, filtered);
    if (supabase) await driverRepository.delete(supabase, id);
    return true;
  },

  // CUSTOMERS
  getCustomers: async (): Promise<Customer[]> => {
    const localData = db._getLocal(KEYS.CUSTOMERS);
    if (supabase) {
      const { data } = await supabase.from('customers').select('*');
      if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; }
    }
    return localData;
  },

  saveCustomer: async (customer: Customer, id?: string) => {
    const current = db._getLocal(KEYS.CUSTOMERS);
    const custId = id || customer.id;
    const idx = current.findIndex((c: Customer) => c.id === custId);
    if (idx >= 0) current[idx] = { ...customer, id: custId }; else current.push({ ...customer, id: custId });
    db._saveLocal(KEYS.CUSTOMERS, current);
    if (supabase) await supabase.from('customers').upsert({ ...customer, id: custId });
    return true;
  },

  deleteCustomer: async (id: string) => {
    const current = db._getLocal(KEYS.CUSTOMERS);
    const filtered = current.filter((c: Customer) => c.id !== id);
    db._saveLocal(KEYS.CUSTOMERS, filtered);
    if (supabase) await supabase.from('customers').delete().eq('id', id);
    return true;
  },

  // PORTS
  getPorts: async (): Promise<Port[]> => {
    const localData = db._getLocal(KEYS.PORTS);
    if (supabase) {
      const { data } = await supabase.from('ports').select('*');
      if (data) { db._saveLocal(KEYS.PORTS, data); return data; }
    }
    return localData;
  },

  savePort: async (port: Port, id?: string) => {
    const current = db._getLocal(KEYS.PORTS);
    const portId = id || port.id;
    const idx = current.findIndex((p: Port) => p.id === portId);
    if (idx >= 0) current[idx] = { ...port, id: portId }; else current.push({ ...port, id: portId });
    db._saveLocal(KEYS.PORTS, current);
    if (supabase) await supabase.from('ports').upsert({ ...port, id: portId });
    return true;
  },

  // PRE STACKING
  getPreStacking: async (): Promise<PreStacking[]> => {
    const localData = db._getLocal(KEYS.PRE_STACKING);
    if (supabase) {
      const { data } = await supabase.from('pre_stacking').select('*');
      if (data) { db._saveLocal(KEYS.PRE_STACKING, data); return data; }
    }
    return localData;
  },

  savePreStacking: async (ps: PreStacking, id?: string) => {
    const current = db._getLocal(KEYS.PRE_STACKING);
    const psId = id || ps.id;
    const idx = current.findIndex((p: PreStacking) => p.id === psId);
    if (idx >= 0) current[idx] = { ...ps, id: psId }; else current.push({ ...ps, id: psId });
    db._saveLocal(KEYS.PRE_STACKING, current);
    if (supabase) await supabase.from('pre_stacking').upsert({ ...ps, id: psId });
    return true;
  },

  // STAFF
  getStaff: async (): Promise<Staff[]> => {
    const localData = db._getLocal(KEYS.STAFF);
    if (supabase) {
      const { data } = await supabase.from('staff').select('*');
      if (data) { db._saveLocal(KEYS.STAFF, data); return data; }
    }
    return localData;
  },

  saveStaff: async (staff: Staff, password?: string) => {
    const current = db._getLocal(KEYS.STAFF);
    const idx = current.findIndex((s: Staff) => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    db._saveLocal(KEYS.STAFF, current);
    if (supabase) await supabase.from('staff').upsert(staff);

    // Also update/create linked user
    if (password !== undefined) {
      const users = db._getLocal(KEYS.USERS);
      const userIdx = users.findIndex((u: User) => u.staffId === staff.id);
      const userData: User = {
        id: userIdx >= 0 ? users[userIdx].id : `u-stf-${staff.id}`,
        username: staff.username,
        displayName: staff.name,
        role: staff.role,
        lastLogin: new Date().toISOString(),
        staffId: staff.id,
        password: password,
        photo: staff.photo
      };
      if (userIdx >= 0) users[userIdx] = userData; else users.push(userData);
      db._saveLocal(KEYS.USERS, users);
      if (supabase) await supabase.from('users').upsert(userData);
    }
    return true;
  },

  deleteStaff: async (id: string) => {
    const current = db._getLocal(KEYS.STAFF);
    const filtered = current.filter((s: Staff) => s.id !== id);
    db._saveLocal(KEYS.STAFF, filtered);
    if (supabase) await supabase.from('staff').delete().eq('id', id);

    const users = db._getLocal(KEYS.USERS);
    const filteredUsers = users.filter((u: User) => u.staffId !== id);
    db._saveLocal(KEYS.USERS, filteredUsers);
    if (supabase) await supabase.from('users').delete().eq('staffId', id);
    return true;
  },

  // USERS
  getUsers: async (): Promise<User[]> => {
    const localData = db._getLocal(KEYS.USERS);
    if (supabase) {
      const { data } = await supabase.from('users').select('*');
      if (data) return data;
    }
    return localData;
  },

  saveUser: async (user: User) => {
    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: User) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);
    if (supabase) await supabase.from('users').upsert(user);
    return true;
  },

  // BACKUP
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
