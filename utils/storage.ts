
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
      const { data, error } = await supabase.from('users').select('*');
      if (error) console.error("Erro ao buscar usuários no DB:", error.message);
      if (data) return data;
    }
    const local = localStorage.getItem(KEYS.USERS);
    return local ? JSON.parse(local) : [];
  },

  saveUser: async (user: User) => {
    if (supabase) {
      const { error } = await supabase.from('users').upsert(user);
      if (error) console.error("Erro ao salvar usuário no DB:", error.message);
    }
    const current = await db.getUsers();
    const idx = current.findIndex(u => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(current));
  },

  deleteUser: async (id: string) => {
    if (supabase) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) console.error("Erro ao deletar usuário no DB:", error.message);
    }
    const current = await db.getUsers();
    const filtered = current.filter(u => u.id !== id);
    localStorage.setItem(KEYS.USERS, JSON.stringify(filtered));
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('staff').select('*');
      if (error) console.error("Erro ao buscar staff no DB:", error.message);
      if (data) return data;
    }
    const local = localStorage.getItem(KEYS.STAFF);
    return local ? JSON.parse(local) : [];
  },

  saveStaff: async (staff: Staff) => {
    if (supabase) {
      const { error } = await supabase.from('staff').upsert(staff);
      if (error) console.error("Erro ao salvar staff no DB:", error.message);
    }
    const current = await db.getStaff();
    const idx = current.findIndex(s => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    localStorage.setItem(KEYS.STAFF, JSON.stringify(current));

    // Lógica de Usuário para Colaborador
    const users = await db.getUsers();
    const existingUser = users.find(u => u.staffId === staff.id);
    if (!existingUser) {
      await db.saveUser({
        id: `u-${staff.id}`,
        username: staff.username,
        displayName: staff.name,
        role: staff.role as any,
        staffId: staff.id,
        lastLogin: new Date().toISOString(),
        isFirstLogin: true,
        password: '12345678',
        position: staff.position
      });
    }
  },

  deleteStaff: async (id: string) => {
    // 1. Deletar do Supabase
    if (supabase) {
      const { error: staffErr } = await supabase.from('staff').delete().eq('id', id);
      if (staffErr) console.error("Erro ao deletar staff:", staffErr.message);
      
      const { error: userErr } = await supabase.from('users').delete().eq('staffId', id);
      if (userErr) console.error("Erro ao deletar usuário vinculado:", userErr.message);
    }

    // 2. Deletar do LocalStorage (Staff)
    const currentStaff = await db.getStaff();
    localStorage.setItem(KEYS.STAFF, JSON.stringify(currentStaff.filter(s => s.id !== id)));
    
    // 3. Deletar do LocalStorage (User)
    const currentUsers = await db.getUsers();
    localStorage.setItem(KEYS.USERS, JSON.stringify(currentUsers.filter(u => u.staffId !== id)));
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('drivers').select('*');
      if (error) console.error("Erro ao buscar motoristas no DB:", error.message);
      if (data) return data;
    }
    const local = localStorage.getItem(KEYS.DRIVERS);
    return local ? JSON.parse(local) : [];
  },

  saveDriver: async (driver: Driver) => {
    if (supabase) {
      const { error } = await supabase.from('drivers').upsert(driver);
      if (error) console.error("Erro ao salvar motorista no DB:", error.message);
    }
    const current = await db.getDrivers();
    const idx = current.findIndex(d => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current));
  },

  deleteDriver: async (id: string) => {
    if (supabase) {
      await supabase.from('drivers').delete().eq('id', id);
      await supabase.from('users').delete().eq('driverId', id);
    }
    const currentDrivers = await db.getDrivers();
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(currentDrivers.filter(d => d.id !== id)));
    
    const currentUsers = await db.getUsers();
    localStorage.setItem(KEYS.USERS, JSON.stringify(currentUsers.filter(u => u.driverId !== id)));
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      const { data } = await supabase.from('customers').select('*');
      if (data) return data;
    }
    const local = localStorage.getItem(KEYS.CUSTOMERS);
    return local ? JSON.parse(local) : [];
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
    const local = localStorage.getItem(KEYS.PORTS);
    return local ? JSON.parse(local) : [];
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
    const local = localStorage.getItem(KEYS.PRESTACKING);
    return local ? JSON.parse(local) : [];
  },

  savePreStacking: async (item: PreStacking) => {
    if (supabase) await supabase.from('pre_stacking').upsert(item);
    const current = await db.getPreStacking();
    const idx = current.findIndex(p => p.id === item.id);
    if (idx >= 0) current[idx] = item; else current.push(item);
    localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(current));
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
      console.error("Erro na importação de backup:", e);
      return false;
    }
  }
};
