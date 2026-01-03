
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

const mapTripToDb = (trip: Trip) => ({
  id: trip.id,
  os: trip.os,
  booking: trip.booking,
  ship: trip.ship,
  date_time: trip.dateTime,
  is_late: trip.isLate,
  type: trip.type,
  container_type: trip.containerType || null,
  cva: trip.cva,
  genset: (trip as any).genset || null,
  container: trip.container,
  tara: trip.tara,
  seal: trip.seal,
  category: trip.category,
  sub_category: trip.subCategory,
  status: trip.status,
  customer: trip.customer,
  destination: trip.destination,
  driver: trip.driver,
  status_history: trip.statusHistory,
  advance_payment: trip.advancePayment,
  balance_payment: trip.balancePayment,
  documents: trip.documents,
  oc_form_data: trip.ocFormData,
  pre_stacking_form_data: trip.preStackingFormData || null
});

const mapDbToTrip = (d: any): Trip => ({
  id: d.id,
  os: d.os,
  booking: d.booking,
  ship: d.ship,
  dateTime: d.date_time || d.dateTime,
  isLate: d.is_late ?? d.isLate ?? false,
  type: d.type,
  containerType: d.container_type || d.containerType,
  cva: d.cva,
  container: d.container,
  tara: d.tara,
  seal: d.seal,
  category: d.category,
  subCategory: d.sub_category || d.subCategory,
  status: d.status,
  customer: d.customer,
  destination: d.destination,
  driver: d.driver,
  statusHistory: d.status_history || d.statusHistory || [],
  advancePayment: d.advance_payment || d.advancePayment || { status: 'BLOQUEADO' },
  balancePayment: d.balance_payment || d.balancePayment || { status: 'AGUARDANDO_DOCS' },
  documents: d.documents || [],
  ocFormData: d.oc_form_data || d.ocFormData,
  preStackingFormData: d.pre_stacking_form_data || d.preStackingFormData
});

export const db = {
  _saveLocal: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Quota local excedida`);
    }
  },

  _getLocal: (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  },

  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true }).limit(1);
      return !error;
    } catch { return false; }
  },

  isCloudActive: () => !!supabase,

  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          const mapped = data.map(u => ({
            id: u.id, username: u.username, password: u.password,
            displayName: u.display_name || u.username, role: u.role,
            lastLogin: u.lastlogin || new Date().toISOString(), photo: u.photo,
            position: u.position, staffId: u.staff_id, driverId: u.driver_id,
            status: u.status, isFirstLogin: u.isfirstlogin === true,
            lastSeen: u.last_seen, isOnlineVisible: u.is_online_visible ?? true
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
      id: user.id, username: user.username, password: user.password,
      display_name: user.displayName, role: user.role, lastlogin: user.lastLogin,
      photo: user.photo, position: user.position, staff_id: user.staffId,
      driver_id: user.driverId, status: user.status, isfirstlogin: user.isFirstLogin === true,
      last_seen: user.lastSeen, is_online_visible: user.isOnlineVisible ?? true
    };
    if (supabase) { try { await supabase.from('users').upsert(payload); } catch (e) {} }
    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);
    return true;
  },

  getTrips: async (): Promise<Trip[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('trips').select('*').order('date_time', { ascending: false });
        if (!error && data) {
          const mapped = data.map(mapDbToTrip);
          db._saveLocal(KEYS.TRIPS, mapped);
          return mapped;
        }
      } catch (e) { console.error("Cloud lookup failed"); }
    }
    return db._getLocal(KEYS.TRIPS);
  },

  saveTrip: async (trip: Trip) => {
    if (supabase) {
      try {
        const payload = mapTripToDb(trip);
        const { error } = await supabase.from('trips').upsert(payload);
        if (error) throw error;
      } catch (e) {
        console.error("Erro ao salvar na nuvem:", e);
      }
    }
    const current = db._getLocal(KEYS.TRIPS);
    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    db._saveLocal(KEYS.TRIPS, current);
    return true;
  },

  deleteTrip: async (id: string) => {
    if (supabase) { try { await supabase.from('trips').delete().eq('id', id); } catch (e) {} }
    const current = db._getLocal(KEYS.TRIPS).filter((t: Trip) => t.id !== id);
    db._saveLocal(KEYS.TRIPS, current);
    return true;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) { try { const d = await driverRepository.getAll(supabase); db._saveLocal(KEYS.DRIVERS, d); return d; } catch (e) {} }
    return db._getLocal(KEYS.DRIVERS);
  },
  saveDriver: async (driver: Driver) => {
    if (supabase) { try { await driverRepository.save(supabase, driver); } catch (e) {} }
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    return true;
  },
  deleteDriver: async (id: string) => {
    if (supabase) { try { await driverRepository.delete(supabase, id); } catch (e) {} }
    const current = db._getLocal(KEYS.DRIVERS).filter((d: any) => d.id !== id);
    db._saveLocal(KEYS.DRIVERS, current);
    return true;
  },
  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) { try { const { data } = await supabase.from('customers').select('*'); if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.CUSTOMERS);
  },
  saveCustomer: async (customer: Customer) => {
    if (supabase) { try { await supabase.from('customers').upsert(customer); } catch (e) {} }
    const current = db._getLocal(KEYS.CUSTOMERS);
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    return true;
  },
  deleteCustomer: async (id: string) => {
    if (supabase) { try { await supabase.from('customers').delete().eq('id', id); } catch (e) {} }
    const current = db._getLocal(KEYS.CUSTOMERS).filter((c: any) => c.id !== id);
    db._saveLocal(KEYS.CUSTOMERS, current);
    return true;
  },
  getPorts: async (): Promise<Port[]> => {
    if (supabase) { try { const { data } = await supabase.from('ports').select('*'); if (data) { db._saveLocal(KEYS.PORTS, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.PORTS);
  },
  savePort: async (port: Port) => {
    if (supabase) { try { await supabase.from('ports').upsert(port); } catch (e) {} }
    const current = db._getLocal(KEYS.PORTS);
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    db._saveLocal(KEYS.PORTS, current);
    return true;
  },
  deletePort: async (id: string) => {
    if (supabase) { try { await supabase.from('ports').delete().eq('id', id); } catch (e) {} }
    const current = db._getLocal(KEYS.PORTS).filter((p: any) => p.id !== id);
    db._saveLocal(KEYS.PORTS, current);
    return true;
  },
  getStaff: async (): Promise<Staff[]> => {
    if (supabase) { try { const { data } = await supabase.from('staff').select('*'); if (data) { db._saveLocal(KEYS.STAFF, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.STAFF);
  },
  saveStaff: async (staff: Staff, password?: string) => {
    if (supabase) { try { await supabase.from('staff').upsert(staff); } catch (e) {} }
    const current = db._getLocal(KEYS.STAFF);
    const idx = current.findIndex((s: any) => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    db._saveLocal(KEYS.STAFF, current);
    return true;
  },
  deleteStaff: async (id: string) => {
    if (supabase) { try { await supabase.from('staff').delete().eq('id', id); } catch (e) {} }
    const current = db._getLocal(KEYS.STAFF).filter((s: Staff) => s.id !== id);
    db._saveLocal(KEYS.STAFF, current);
    return true;
  },
  getCategories: async (): Promise<Category[]> => {
    if (supabase) { try { const { data } = await supabase.from('categories').select('*'); if (data) { db._saveLocal(KEYS.CATEGORIES, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.CATEGORIES);
  },
  saveCategory: async (category: Partial<Category>) => {
    if (supabase) { try { await supabase.from('categories').upsert(category); } catch (e) {} }
    const current = db._getLocal(KEYS.CATEGORIES);
    const idx = current.findIndex((c: any) => c.id === category.id);
    if (idx >= 0) current[idx] = category as any; else current.push(category as any);
    db._saveLocal(KEYS.CATEGORIES, current);
    return true;
  },
  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) { try { const { data } = await supabase.from('pre_stacking').select('*'); if (data) { db._saveLocal(KEYS.PRE_STACKING, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.PRE_STACKING);
  },
  savePreStacking: async (ps: PreStacking) => {
    if (supabase) { try { await supabase.from('pre_stacking').upsert(ps); } catch (e) {} }
    const current = db._getLocal(KEYS.PRE_STACKING);
    const idx = current.findIndex((p: any) => p.id === ps.id);
    if (idx >= 0) current[idx] = ps; else current.push(ps);
    db._saveLocal(KEYS.PRE_STACKING, current);
    return true;
  },
  deletePreStacking: async (id: string) => {
    if (supabase) { try { await supabase.from('pre_stacking').delete().eq('id', id); } catch (e) {} }
    const current = db._getLocal(KEYS.PRE_STACKING).filter((p: PreStacking) => p.id !== id);
    db._saveLocal(KEYS.PRE_STACKING, current);
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
      for (const [key, value] of Object.entries(backup)) {
        if (value) localStorage.setItem(key, value as string);
      }
      return true;
    } catch (e) {
      console.error("Erro na importação:", e);
      return false;
    }
  },
  updatePresence: async (userId: string, isVisible: boolean) => {
    if (supabase) { try { await supabase.from('users').update({ last_seen: new Date().toISOString(), is_online_visible: isVisible }).eq('id', userId); } catch (e) {} }
  }
};
