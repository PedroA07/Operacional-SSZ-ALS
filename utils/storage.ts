
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User } from '../types';

// Obtain environment variables for Supabase configuration
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

// Initialize Supabase client if credentials are provided
export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Storage keys for local persistence
export const KEYS = {
  DRIVERS: 'als_drivers',
  CUSTOMERS: 'als_customers',
  PORTS: 'als_ports',
  PRE_STACKING: 'als_pre_stacking',
  STAFF: 'als_staff',
  USERS: 'als_users'
};

/**
 * db object provides an abstraction layer for data management, 
 * handling both local storage for offline use and Supabase for cloud sync.
 */
export const db = {
  // Helper to persist data to localStorage
  _saveLocal: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // Checks if the cloud connection is active
  isCloudActive: () => !!supabase,

  // --- User Management ---
  getUsers: async (): Promise<User[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('users').select('*');
        if (data) { db._saveLocal(KEYS.USERS, data); return data; }
      } catch (e) { console.warn("Supabase getUsers offline."); }
    }
    return localData;
  },

  saveUser: async (user: User) => {
    const current = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = current.findIndex((u: any) => u.id === user.id);
    let updated;
    if (idx >= 0) { updated = [...current]; updated[idx] = user; } else { updated = [...current, user]; }
    db._saveLocal(KEYS.USERS, updated);
    if (supabase) await supabase.from('users').upsert(user);
  },

  // --- Driver Management ---
  getDrivers: async (): Promise<Driver[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('drivers').select('*');
        if (data) { db._saveLocal(KEYS.DRIVERS, data); return data; }
      } catch (e) { console.warn("Supabase getDrivers offline."); }
    }
    return localData;
  },

  saveDriver: async (driver: Driver) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    const idx = current.findIndex((d: any) => d.id === driver.id);
    let updated;
    if (idx >= 0) { updated = [...current]; updated[idx] = driver; } else { updated = [...current, driver]; }
    db._saveLocal(KEYS.DRIVERS, updated);
    if (supabase) await supabase.from('drivers').upsert(driver);
  },

  deleteDriver: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    db._saveLocal(KEYS.DRIVERS, current.filter((d: any) => d.id !== id));
    if (supabase) await supabase.from('drivers').delete().eq('id', id);
    return true;
  },

  // --- Customer Management ---
  getCustomers: async (): Promise<Customer[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('customers').select('*');
        if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; }
      } catch (e) { console.warn("Supabase getCustomers offline."); }
    }
    return localData;
  },

  saveCustomer: async (customer: Customer) => {
    const current = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    const idx = current.findIndex((c: any) => c.id === customer.id);
    let updated;
    if (idx >= 0) { updated = [...current]; updated[idx] = customer; } else { updated = [...current, customer]; }
    db._saveLocal(KEYS.CUSTOMERS, updated);
    if (supabase) await supabase.from('customers').upsert(customer);
  },

  deleteCustomer: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    db._saveLocal(KEYS.CUSTOMERS, current.filter((c: any) => c.id !== id));
    if (supabase) await supabase.from('customers').delete().eq('id', id);
    return true;
  },

  // --- Port Management ---
  getPorts: async (): Promise<Port[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('ports').select('*');
        if (data) { db._saveLocal(KEYS.PORTS, data); return data; }
      } catch (e) { console.warn("Supabase getPorts offline."); }
    }
    return localData;
  },

  savePort: async (port: Port) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    const idx = current.findIndex((p: any) => p.id === port.id);
    let updated;
    if (idx >= 0) { updated = [...current]; updated[idx] = port; } else { updated = [...current, port]; }
    db._saveLocal(KEYS.PORTS, updated);
    if (supabase) await supabase.from('ports').upsert(port);
  },

  deletePort: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    db._saveLocal(KEYS.PORTS, current.filter((p: any) => p.id !== id));
    if (supabase) await supabase.from('ports').delete().eq('id', id);
    return true;
  },

  // --- PreStacking Management ---
  getPreStacking: async (): Promise<PreStacking[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.PRE_STACKING) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('pre_stacking').select('*');
        if (data) { db._saveLocal(KEYS.PRE_STACKING, data); return data; }
      } catch (e) { console.warn("Supabase getPreStacking offline."); }
    }
    return localData;
  },

  savePreStacking: async (ps: PreStacking) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PRE_STACKING) || '[]');
    const idx = current.findIndex((p: any) => p.id === ps.id);
    let updated;
    if (idx >= 0) { updated = [...current]; updated[idx] = ps; } else { updated = [...current, ps]; }
    db._saveLocal(KEYS.PRE_STACKING, updated);
    if (supabase) await supabase.from('pre_stacking').upsert(ps);
  },

  deletePreStacking: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PRE_STACKING) || '[]');
    db._saveLocal(KEYS.PRE_STACKING, current.filter((p: any) => p.id !== id));
    if (supabase) await supabase.from('pre_stacking').delete().eq('id', id);
    return true;
  },

  // --- Staff Management ---
  getStaff: async (): Promise<Staff[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('staff').select('*');
        if (data) { db._saveLocal(KEYS.STAFF, data); return data; }
      } catch (e) { console.warn("Supabase getStaff offline."); }
    }
    return localData;
  },

  saveStaff: async (staff: Staff, password?: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    const idx = current.findIndex((s: any) => s.id === staff.id);
    let updated;
    if (idx >= 0) { updated = [...current]; updated[idx] = staff; } else { updated = [...current, staff]; }
    db._saveLocal(KEYS.STAFF, updated);
    if (supabase) await supabase.from('staff').upsert(staff);

    // Sync with User table for authentication
    const users = await db.getUsers();
    const existingUser = users.find(u => u.staffId === staff.id);
    
    const userData: User = {
      id: existingUser?.id || `u-${staff.id}`,
      username: staff.username,
      displayName: staff.name,
      role: staff.role,
      staffId: staff.id,
      lastLogin: existingUser?.lastLogin || new Date().toISOString(),
      position: staff.position,
      photo: staff.photo,
      status: staff.status,
      password: password || existingUser?.password
    };
    
    await db.saveUser(userData);
  },

  deleteStaff: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    db._saveLocal(KEYS.STAFF, current.filter((s: any) => s.id !== id));
    if (supabase) await supabase.from('staff').delete().eq('id', id);
    
    // Also delete associated user record
    const users = await db.getUsers();
    const user = users.find(u => u.staffId === id);
    if (user) {
      const remainingUsers = users.filter(u => u.id !== user.id);
      db._saveLocal(KEYS.USERS, remainingUsers);
      if (supabase) await supabase.from('users').delete().eq('id', user.id);
    }
    return true;
  },

  // --- Backup & Restore ---
  exportBackup: async () => {
    const backup = {
      drivers: await db.getDrivers(),
      customers: await db.getCustomers(),
      ports: await db.getPorts(),
      preStacking: await db.getPreStacking(),
      staff: await db.getStaff(),
      users: await db.getUsers()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = JSON.parse(e.target?.result as string);
          if (content.drivers) {
            db._saveLocal(KEYS.DRIVERS, content.drivers);
            if (supabase) await supabase.from('drivers').upsert(content.drivers);
          }
          if (content.customers) {
            db._saveLocal(KEYS.CUSTOMERS, content.customers);
            if (supabase) await supabase.from('customers').upsert(content.customers);
          }
          if (content.ports) {
            db._saveLocal(KEYS.PORTS, content.ports);
            if (supabase) await supabase.from('ports').upsert(content.ports);
          }
          if (content.preStacking) {
            db._saveLocal(KEYS.PRE_STACKING, content.preStacking);
            if (supabase) await supabase.from('pre_stacking').upsert(content.pre_stacking);
          }
          if (content.staff) {
            db._saveLocal(KEYS.STAFF, content.staff);
            if (supabase) await supabase.from('staff').upsert(content.staff);
          }
          if (content.users) {
            db._saveLocal(KEYS.USERS, content.users);
            if (supabase) await supabase.from('users').upsert(content.users);
          }
          resolve(true);
        } catch (err) {
          console.error("Import failed:", err);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }
};
