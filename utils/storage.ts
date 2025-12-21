
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User } from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

const KEYS = {
  DRIVERS: 'als_db_drivers',
  CUSTOMERS: 'als_db_customers',
  PORTS: 'als_db_ports',
  PRESTACKING: 'als_db_prestacking',
  STAFF: 'als_db_staff',
  USERS: 'als_db_users',
  SESSION: 'als_session'
};

export const db = {
  isCloudActive: () => !!supabase,

  // SESSION
  setSession: (user: User | null) => {
    if (user) localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    else localStorage.removeItem(KEYS.SESSION);
  },
  getSession: (): User | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },

  // USERS
  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      const { data } = await supabase.from('users').select('*');
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },
  saveUser: async (user: User) => {
    if (supabase) await supabase.from('users').upsert(user);
    const current = await db.getUsers();
    const idx = current.findIndex(u => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(current));
  },
  deleteUser: async (id: string) => {
    if (supabase) await supabase.from('users').delete().eq('id', id);
    const current = await db.getUsers();
    localStorage.setItem(KEYS.USERS, JSON.stringify(current.filter(u => u.id !== id)));
  },

  // STAFF
  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      const { data } = await supabase.from('staff').select('*');
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
  },
  saveStaff: async (staff: Staff) => {
    if (supabase) await supabase.from('staff').upsert(staff);
    const current = await db.getStaff();
    const idx = current.findIndex(s => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    localStorage.setItem(KEYS.STAFF, JSON.stringify(current));
  },
  deleteStaff: async (id: string) => {
    if (supabase) await supabase.from('staff').delete().eq('id', id);
    const current = await db.getStaff();
    localStorage.setItem(KEYS.STAFF, JSON.stringify(current.filter(s => s.id !== id)));
    // Também apaga o usuário de acesso vinculado
    await db.deleteUser(`u-${id}`);
  },

  // DRIVERS
  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      const { data } = await supabase.from('drivers').select('*');
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
  },
  saveDriver: async (driver: Driver) => {
    if (supabase) await supabase.from('drivers').upsert(driver);
    const current = await db.getDrivers();
    const idx = current.findIndex(d => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current));
  },
  deleteDriver: async (id: string) => {
    if (supabase) await supabase.from('drivers').delete().eq('id', id);
    const current = await db.getDrivers();
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current.filter(d => d.id !== id)));
    await db.deleteUser(`u-${id}`);
  },

  // RESTO DOS MÉTODOS (Customers, Ports, PreStacking, etc...)
  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      const { data } = await supabase.from('customers').select('*');
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
  },
  saveCustomer: async (customer: Customer) => {
    if (supabase) await supabase.from('customers').upsert(customer);
    const current = await db.getCustomers();
    const idx = current.findIndex(c => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(current));
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) {
      const { data } = await supabase.from('ports').select('*');
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
  },
  savePort: async (port: Port) => {
    if (supabase) await supabase.from('ports').upsert(port);
    const current = await db.getPorts();
    const idx = current.findIndex(p => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    localStorage.setItem(KEYS.PORTS, JSON.stringify(current));
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) {
      const { data } = await supabase.from('pre_stacking').select('*');
      if (data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
  },
  savePreStacking: async (item: PreStacking) => {
    if (supabase) await supabase.from('pre_stacking').upsert(item);
    const current = await db.getPreStacking();
    const idx = current.findIndex(p => p.id === item.id);
    if (idx >= 0) current[idx] = item; else current.push(item);
    localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(current));
  },

  importBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.drivers) for (const d of data.drivers) await db.saveDriver(d);
          if (data.customers) for (const c of data.customers) await db.saveCustomer(c);
          if (data.ports) for (const p of data.ports) await db.savePort(p);
          if (data.preStacking) for (const ps of data.preStacking) await db.savePreStacking(ps);
          if (data.staff) for (const s of data.staff) await db.saveStaff(s);
          if (data.users) for (const u of data.users) await db.saveUser(u);
          resolve(true);
        } catch (err) {
          resolve(false);
        }
      };
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
      users: await db.getUsers(),
      backupDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ALS_BACKUP_${new Date().getTime()}.json`;
    link.click();
  }
};
