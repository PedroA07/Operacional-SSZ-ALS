
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
  _saveLocal: (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn(`Quota de armazenamento local excedida para ${key}`);
    }
  },

  _getLocal: (key: string) => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Verifica se a conexão com o Supabase está realmente ativa e funcional
   */
  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('count', { count: 'exact', head: true }).limit(1);
      return !error;
    } catch {
      return false;
    }
  },

  isCloudActive: () => !!supabase,

  // --- USUÁRIOS ---
  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          const mapped = data.map(u => ({
            id: u.id,
            username: u.username,
            password: u.password,
            displayName: u.display_name || u.username,
            role: u.role,
            lastLogin: u.lastlogin || new Date().toISOString(),
            photo: u.photo,
            position: u.position,
            staffId: u.staff_id,
            driverId: u.driver_id,
            status: u.status,
            isFirstLogin: u.isfirstlogin === true,
            lastSeen: u.last_seen,
            isOnlineVisible: u.is_online_visible ?? true
          }));
          db._saveLocal(KEYS.USERS, mapped);
          return mapped;
        }
      } catch (e) { console.error("Cloud error, using local fallback"); }
    }
    return db._getLocal(KEYS.USERS);
  },

  saveUser: async (user: User) => {
    const payload = {
      id: user.id,
      username: user.username,
      password: user.password,
      display_name: user.displayName,
      role: user.role,
      lastlogin: user.lastLogin,
      photo: user.photo,
      position: user.position,
      staff_id: user.staffId,
      driver_id: user.driverId,
      status: user.status,
      isfirstlogin: user.isFirstLogin === true,
      last_seen: user.lastSeen,
      is_online_visible: user.isOnlineVisible ?? true
    };

    if (supabase) {
      try {
        await supabase.from('users').upsert(payload);
      } catch (e) { console.error("Falha ao salvar usuário na nuvem"); }
    }

    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);
    return true;
  },

  // --- MOTORISTAS ---
  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      try {
        const drivers = await driverRepository.getAll(supabase);
        db._saveLocal(KEYS.DRIVERS, drivers);
        return drivers;
      } catch (e) { console.error("Driver cloud lookup failed"); }
    }
    return db._getLocal(KEYS.DRIVERS);
  },

  saveDriver: async (driver: Driver) => {
    if (supabase) {
      try {
        await driverRepository.save(supabase, driver);
      } catch (e) { console.error("Falha ao salvar motorista na nuvem"); }
    }
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: Driver) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    return true;
  },

  deleteDriver: async (id: string) => {
    if (supabase) {
      try {
        await driverRepository.delete(supabase, id);
      } catch (e) { console.error("Falha ao excluir motorista na nuvem"); }
    }
    const current = db._getLocal(KEYS.DRIVERS).filter((d: Driver) => d.id !== id);
    db._saveLocal(KEYS.DRIVERS, current);
    return true;
  },

  // --- VIAGENS (TRIPS) ---
  getTrips: async (): Promise<Trip[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('trips').select('*').order('dateTime', { ascending: false });
        if (!error && data) {
          db._saveLocal(KEYS.TRIPS, data);
          return data;
        }
      } catch (e) { console.error("Trips cloud lookup failed"); }
    }
    return db._getLocal(KEYS.TRIPS);
  },

  saveTrip: async (trip: Trip) => {
    if (supabase) {
      try {
        const { error } = await supabase.from('trips').upsert(trip);
        if (error) throw error;
      } catch (e) {
        console.error("Erro ao salvar viagem na nuvem:", e);
      }
    }
    // Sempre salva localmente para garantir consistência offline
    const current = db._getLocal(KEYS.TRIPS);
    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    db._saveLocal(KEYS.TRIPS, current);
    return true;
  },

  deleteTrip: async (id: string) => {
    if (supabase) {
      try {
        await supabase.from('trips').delete().eq('id', id);
      } catch (e) { console.error("Falha ao excluir viagem na nuvem"); }
    }
    const current = db._getLocal(KEYS.TRIPS).filter((t: Trip) => t.id !== id);
    db._saveLocal(KEYS.TRIPS, current);
    return true;
  },

  // --- CLIENTES ---
  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('name');
        if (!error && data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; }
      } catch (e) {}
    }
    return db._getLocal(KEYS.CUSTOMERS);
  },

  saveCustomer: async (customer: Customer) => {
    if (supabase) {
      try { await supabase.from('customers').upsert(customer); } catch (e) {}
    }
    const current = db._getLocal(KEYS.CUSTOMERS);
    const idx = current.findIndex((c: Customer) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    return true;
  },

  deleteCustomer: async (id: string) => {
    if (supabase) { try { await supabase.from('customers').delete().eq('id', id); } catch (e) {} }
    const current = db._getLocal(KEYS.CUSTOMERS).filter((c: Customer) => c.id !== id);
    db._saveLocal(KEYS.CUSTOMERS, current);
    return true;
  },

  // --- PORTOS ---
  getPorts: async (): Promise<Port[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('ports').select('*').order('name');
        if (!error && data) { db._saveLocal(KEYS.PORTS, data); return data; }
      } catch (e) {}
    }
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

  // --- STAFF ---
  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('staff').select('*').order('name');
        if (!error && data) {
          const mapped = data.map(s => ({
            id: s.id,
            name: s.name,
            username: s.username,
            role: s.role,
            position: s.position,
            registrationDate: s.registrationdate || s.registrationDate,
            status: s.status,
            statusSince: s.statussince || s.statusSince,
            photo: s.photo,
            emailCorp: s.emailcorp || s.emailCorp,
            phoneCorp: s.phonecorp || s.phoneCorp
          }));
          db._saveLocal(KEYS.STAFF, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return db._getLocal(KEYS.STAFF);
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (supabase) {
      try {
        const payload = {
          id: staff.id,
          name: staff.name,
          username: staff.username,
          role: staff.role,
          position: staff.position,
          registrationdate: staff.registrationDate,
          status: staff.status,
          statussince: staff.statusSince,
          photo: staff.photo,
          emailcorp: staff.emailCorp,
          phonecorp: staff.phoneCorp
        };
        await supabase.from('staff').upsert(payload);
      } catch (e) {}
    }
    
    const current = db._getLocal(KEYS.STAFF);
    const idx = current.findIndex((s: Staff) => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    db._saveLocal(KEYS.STAFF, current);

    // Sincroniza o usuário de acesso
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
    if (password) { userToSave.password = password; userToSave.isFirstLogin = false; }
    else if (!existingUser) { userToSave.password = '12345678'; }
    else { userToSave.password = existingUser.password; }
    await db.saveUser(userToSave);
    return true;
  },

  deleteStaff: async (id: string) => {
    if (supabase) { try { await supabase.from('staff').delete().eq('id', id); } catch (e) {} }
    const current = db._getLocal(KEYS.STAFF).filter((s: Staff) => s.id !== id);
    db._saveLocal(KEYS.STAFF, current);
    return true;
  },

  // --- CATEGORIAS ---
  getCategories: async (): Promise<Category[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('categories').select('*');
        if (!error && data) { db._saveLocal(KEYS.CATEGORIES, data); return data; }
      } catch (e) {}
    }
    return db._getLocal(KEYS.CATEGORIES);
  },

  saveCategory: async (category: Partial<Category>) => {
    const newCat = { ...category, id: category.id || `cat-${Date.now()}` } as Category;
    if (supabase) {
      try { await supabase.from('categories').upsert(newCat); } catch (e) {}
    }
    const current = db._getLocal(KEYS.CATEGORIES);
    const idx = current.findIndex((c: Category) => c.id === newCat.id);
    if (idx >= 0) current[idx] = newCat; else current.push(newCat);
    db._saveLocal(KEYS.CATEGORIES, current);
    return true;
  },

  // --- PRE-STACKING ---
  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('pre_stacking').select('*').order('name');
        if (!error && data) { db._saveLocal(KEYS.PRE_STACKING, data); return data; }
      } catch (e) {}
    }
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
    const current = db._getLocal(KEYS.PRE_STACKING).filter((ps: any) => ps.id !== id);
    db._saveLocal(KEYS.PRE_STACKING, current);
    return true;
  },

  // --- PREFERÊNCIAS E BACKUP ---
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
      for (const key of Object.values(KEYS)) if (backup[key]) localStorage.setItem(key, backup[key]);
      return true;
    } catch { return false; }
  },

  updatePresence: async (userId: string, isVisible: boolean) => {
    const now = new Date().toISOString();
    if (supabase) {
      try {
        await supabase.from('users').update({ last_seen: now, is_online_visible: isVisible }).eq('id', userId);
      } catch (e) {}
    }
  }
};
