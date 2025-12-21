
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

  setSession: (user: User | null) => {
    if (user) localStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    else localStorage.removeItem(KEYS.SESSION);
  },
  getSession: (): User | null => {
    const s = localStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },

  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      const { data } = await supabase.from('users').select('*');
      if (data) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(data));
        return data;
      }
    }
    const local = localStorage.getItem(KEYS.USERS);
    return local ? JSON.parse(local) : [];
  },

  saveUser: async (user: User) => {
    // Atualiza local primeiro para UI rápida
    const current = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(current));

    if (supabase) {
      await supabase.from('users').upsert(user);
    }
  },

  deleteUser: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    localStorage.setItem(KEYS.USERS, JSON.stringify(current.filter((u: any) => u.id !== id)));
    
    if (supabase) {
      await supabase.from('users').delete().eq('id', id);
    }
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      const { data } = await supabase.from('staff').select('*');
      if (data) {
        localStorage.setItem(KEYS.STAFF, JSON.stringify(data));
        return data;
      }
    }
    const local = localStorage.getItem(KEYS.STAFF);
    return local ? JSON.parse(local) : [];
  },

  saveStaff: async (staff: Staff) => {
    // 1. Atualiza Local Staff
    const current = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    const idx = current.findIndex((s: any) => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    localStorage.setItem(KEYS.STAFF, JSON.stringify(current));

    // 2. Garante Usuário Vinculado
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const existingUser = users.find((u: any) => u.staffId === staff.id);
    if (!existingUser) {
      const newUser: User = {
        id: `u-${staff.id}`,
        username: staff.username,
        displayName: staff.name,
        role: staff.role as any,
        staffId: staff.id,
        lastLogin: new Date().toISOString(),
        isFirstLogin: true,
        password: '12345678',
        position: staff.position
      };
      await db.saveUser(newUser);
    }

    // 3. Sincroniza Cloud
    if (supabase) {
      await supabase.from('staff').upsert(staff);
    }
  },

  deleteStaff: async (id: string) => {
    // 1. Local Delete Instantâneo
    const currentStaff = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    localStorage.setItem(KEYS.STAFF, JSON.stringify(currentStaff.filter((s: any) => s.id !== id)));
    
    const currentUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    localStorage.setItem(KEYS.USERS, JSON.stringify(currentUsers.filter((u: any) => u.staffId !== id)));

    // 2. Cloud Delete
    if (supabase) {
      await supabase.from('staff').delete().eq('id', id);
      await supabase.from('users').delete().eq('staffId', id);
    }
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      const { data } = await supabase.from('drivers').select('*');
      if (data) {
        localStorage.setItem(KEYS.DRIVERS, JSON.stringify(data));
        return data;
      }
    }
    const local = localStorage.getItem(KEYS.DRIVERS);
    return local ? JSON.parse(local) : [];
  },

  saveDriver: async (driver: Driver) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current));

    if (supabase) {
      await supabase.from('drivers').upsert(driver);
    }
  },

  deleteDriver: async (id: string) => {
    const currentDrivers = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(currentDrivers.filter((d: any) => d.id !== id)));
    
    const currentUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    localStorage.setItem(KEYS.USERS, JSON.stringify(currentUsers.filter((u: any) => u.driverId !== id)));

    if (supabase) {
      await supabase.from('drivers').delete().eq('id', id);
      await supabase.from('users').delete().eq('driverId', id);
    }
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      const { data } = await supabase.from('customers').select('*');
      if (data) {
        localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(data));
        return data;
      }
    }
    const local = localStorage.getItem(KEYS.CUSTOMERS);
    return local ? JSON.parse(local) : [];
  },

  saveCustomer: async (customer: Customer) => {
    const current = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(current));

    if (supabase) {
      await supabase.from('customers').upsert(customer);
    }
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) {
      const { data } = await supabase.from('ports').select('*');
      if (data) {
        localStorage.setItem(KEYS.PORTS, JSON.stringify(data));
        return data;
      }
    }
    const local = localStorage.getItem(KEYS.PORTS);
    return local ? JSON.parse(local) : [];
  },

  savePort: async (port: Port) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    localStorage.setItem(KEYS.PORTS, JSON.stringify(current));

    if (supabase) {
      await supabase.from('ports').upsert(port);
    }
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) {
      const { data } = await supabase.from('pre_stacking').select('*');
      if (data) {
        localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(data));
        return data;
      }
    }
    const local = localStorage.getItem(KEYS.PRESTACKING);
    return local ? JSON.parse(local) : [];
  },

  savePreStacking: async (item: PreStacking) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
    const idx = current.findIndex((p: any) => p.id === item.id);
    if (idx >= 0) current[idx] = item; else current.push(item);
    localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(current));

    if (supabase) {
      await supabase.from('pre_stacking').upsert(item);
    }
  },

  exportBackup: async () => {
    const data = {
      drivers: await db.getDrivers(),
      customers: await db.getCustomers(),
      ports: await db.getPorts(),
      prestacking: await db.getPreStacking(),
      staff: await db.getStaff(),
      users: await db.getUsers()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File): Promise<boolean> => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.drivers) localStorage.setItem(KEYS.DRIVERS, JSON.stringify(data.drivers));
      if (data.customers) localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(data.customers));
      if (data.ports) localStorage.setItem(KEYS.PORTS, JSON.stringify(data.ports));
      if (data.prestacking) localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(data.prestacking));
      if (data.staff) localStorage.setItem(KEYS.STAFF, JSON.stringify(data.staff));
      if (data.users) localStorage.setItem(KEYS.USERS, JSON.stringify(data.users));
      return true;
    } catch (e) {
      return false;
    }
  }
};
