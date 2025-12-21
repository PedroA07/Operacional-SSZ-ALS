
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User } from '../types';

// Tenta pegar as chaves do ambiente VITE
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

  // FUNÇÃO AUXILIAR PARA GARANTIR PERSISTÊNCIA LOCAL IMEDIATA
  _saveLocal: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (!error && data) {
        db._saveLocal(KEYS.USERS, data);
        return data;
      }
    }
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },

  saveUser: async (user: User) => {
    // 1. Local
    const current = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);

    // 2. Cloud
    if (supabase) {
      await supabase.from('users').upsert(user);
    }
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('staff').select('*');
      if (!error && data) {
        db._saveLocal(KEYS.STAFF, data);
        return data;
      }
    }
    return JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
  },

  saveStaff: async (staff: Staff) => {
    // 1. Atualiza Local Staff
    const currentStaff = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    const sIdx = currentStaff.findIndex((s: any) => s.id === staff.id);
    if (sIdx >= 0) currentStaff[sIdx] = staff; else currentStaff.push(staff);
    db._saveLocal(KEYS.STAFF, currentStaff);

    // 2. Cria/Atualiza Usuário vinculado
    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const existingUser = users.find((u: any) => u.staffId === staff.id);
    
    const userData: User = {
      id: existingUser?.id || `u-${staff.id}`,
      username: staff.username,
      displayName: staff.name,
      role: staff.role as any,
      staffId: staff.id,
      lastLogin: existingUser?.lastLogin || new Date().toISOString(),
      isFirstLogin: existingUser ? existingUser.isFirstLogin : true,
      password: existingUser?.password || '12345678',
      position: staff.position
    };
    
    await db.saveUser(userData);

    // 3. Sincroniza Cloud
    if (supabase) {
      await supabase.from('staff').upsert(staff);
    }
  },

  deleteStaff: async (id: string) => {
    // 1. Delete Local (Staff)
    const currentStaff = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    db._saveLocal(KEYS.STAFF, currentStaff.filter((s: any) => s.id !== id));
    
    // 2. Delete Local (Usuário vinculado)
    const currentUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    db._saveLocal(KEYS.USERS, currentUsers.filter((u: any) => u.staffId !== id));

    // 3. Delete Cloud
    if (supabase) {
      await supabase.from('staff').delete().eq('id', id);
      await supabase.from('users').delete().eq('staffId', id);
    }
    return true;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      const { data } = await supabase.from('drivers').select('*');
      if (data) {
        db._saveLocal(KEYS.DRIVERS, data);
        return data;
      }
    }
    return JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
  },

  saveDriver: async (driver: Driver) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    if (supabase) await supabase.from('drivers').upsert(driver);
  },

  deleteDriver: async (id: string) => {
    const currentDrivers = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    db._saveLocal(KEYS.DRIVERS, currentDrivers.filter((d: any) => d.id !== id));
    
    const currentUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    db._saveLocal(KEYS.USERS, currentUsers.filter((u: any) => u.driverId !== id));

    if (supabase) {
      await supabase.from('drivers').delete().eq('id', id);
      await supabase.from('users').delete().eq('driverId', id);
    }
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      const { data } = await supabase.from('customers').select('*');
      if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; }
    }
    return JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
  },

  saveCustomer: async (customer: Customer) => {
    const current = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    if (supabase) await supabase.from('customers').upsert(customer);
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) {
      const { data } = await supabase.from('ports').select('*');
      if (data) { db._saveLocal(KEYS.PORTS, data); return data; }
    }
    return JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
  },

  savePort: async (port: Port) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    db._saveLocal(KEYS.PORTS, current);
    if (supabase) await supabase.from('ports').upsert(port);
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) {
      const { data } = await supabase.from('pre_stacking').select('*');
      if (data) { db._saveLocal(KEYS.PRESTACKING, data); return data; }
    }
    return JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
  },

  savePreStacking: async (item: PreStacking) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
    const idx = current.findIndex((p: any) => p.id === item.id);
    if (idx >= 0) current[idx] = item; else current.push(item);
    db._saveLocal(KEYS.PRESTACKING, current);
    if (supabase) await supabase.from('pre_stacking').upsert(item);
  },

  // Fix: Adding missing exportBackup method used in SystemTab.tsx
  exportBackup: async () => {
    const data = {
      drivers: JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]'),
      customers: JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]'),
      ports: JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]'),
      preStacking: JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]'),
      staff: JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]'),
      users: JSON.parse(localStorage.getItem(KEYS.USERS) || '[]'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `als-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // Fix: Adding missing importBackup method used in SystemTab.tsx
  importBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.drivers) {
            db._saveLocal(KEYS.DRIVERS, data.drivers);
            if (supabase) await supabase.from('drivers').upsert(data.drivers);
          }
          if (data.customers) {
            db._saveLocal(KEYS.CUSTOMERS, data.customers);
            if (supabase) await supabase.from('customers').upsert(data.customers);
          }
          if (data.ports) {
            db._saveLocal(KEYS.PORTS, data.ports);
            if (supabase) await supabase.from('ports').upsert(data.ports);
          }
          if (data.preStacking) {
            db._saveLocal(KEYS.PRESTACKING, data.preStacking);
            if (supabase) await supabase.from('pre_stacking').upsert(data.preStacking);
          }
          if (data.staff) {
            db._saveLocal(KEYS.STAFF, data.staff);
            if (supabase) await supabase.from('staff').upsert(data.staff);
          }
          if (data.users) {
            db._saveLocal(KEYS.USERS, data.users);
            if (supabase) await supabase.from('users').upsert(data.users);
          }
          resolve(true);
        } catch (error) {
          console.error(error);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }
};
