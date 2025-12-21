
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
      if (data) return data;
    }
    const local = localStorage.getItem(KEYS.USERS);
    return local ? JSON.parse(local) : [];
  },

  saveUser: async (user: User) => {
    const userToSave = { 
      ...user, 
      id: String(user.id), 
      username: String(user.username),
      password: user.password ? String(user.password) : undefined
    };
    
    if (supabase) await supabase.from('users').upsert(userToSave);
    
    const current = await db.getUsers();
    const idx = current.findIndex(u => String(u.id) === userToSave.id);
    if (idx >= 0) current[idx] = userToSave; else current.push(userToSave);
    localStorage.setItem(KEYS.USERS, JSON.stringify(current));
  },

  deleteUser: async (id: string) => {
    const strId = String(id);
    if (supabase) await supabase.from('users').delete().eq('id', strId);
    const current = await db.getUsers();
    localStorage.setItem(KEYS.USERS, JSON.stringify(current.filter(u => String(u.id) !== strId)));
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) {
      const { data } = await supabase.from('staff').select('*');
      if (data) return data;
    }
    const local = localStorage.getItem(KEYS.STAFF);
    return local ? JSON.parse(local) : [];
  },

  saveStaff: async (staff: Staff) => {
    const staffToSave = { ...staff, id: String(staff.id), username: String(staff.username) };
    if (supabase) await supabase.from('staff').upsert(staffToSave);
    const current = await db.getStaff();
    const idx = current.findIndex(s => String(s.id) === staffToSave.id);
    if (idx >= 0) current[idx] = staffToSave; else current.push(staffToSave);
    localStorage.setItem(KEYS.STAFF, JSON.stringify(current));
  },

  deleteStaff: async (id: string) => {
    const strId = String(id);
    if (supabase) await supabase.from('staff').delete().eq('id', strId);
    const current = await db.getStaff();
    localStorage.setItem(KEYS.STAFF, JSON.stringify(current.filter(s => String(s.id) !== strId)));
    await db.deleteUser(`u-${strId}`);
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) {
      const { data } = await supabase.from('drivers').select('*');
      if (data) return data;
    }
    const local = localStorage.getItem(KEYS.DRIVERS);
    return local ? JSON.parse(local) : [];
  },

  saveDriver: async (driver: Driver) => {
    const driverToSave = { ...driver, id: String(driver.id), cpf: String(driver.cpf).replace(/\D/g, '') };
    if (supabase) await supabase.from('drivers').upsert(driverToSave);
    const current = await db.getDrivers();
    const idx = current.findIndex(d => String(d.id) === driverToSave.id);
    if (idx >= 0) current[idx] = driverToSave; else current.push(driverToSave);
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current));
  },

  deleteDriver: async (id: string) => {
    const strId = String(id);
    if (supabase) await supabase.from('drivers').delete().eq('id', strId);
    const current = await db.getDrivers();
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current.filter(d => String(d.id) !== strId)));
    await db.deleteUser(`u-${strId}`);
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
    const customerToSave = { ...customer, id: String(customer.id) };
    if (supabase) await supabase.from('customers').upsert(customerToSave);
    const current = await db.getCustomers();
    const idx = current.findIndex(c => String(c.id) === customerToSave.id);
    if (idx >= 0) current[idx] = customerToSave; else current.push(customerToSave);
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
    const portToSave = { ...port, id: String(port.id) };
    if (supabase) await supabase.from('ports').upsert(portToSave);
    const current = await db.getPorts();
    const idx = current.findIndex(p => String(p.id) === portToSave.id);
    if (idx >= 0) current[idx] = portToSave; else current.push(portToSave);
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
    const itemToSave = { ...item, id: String(item.id) };
    if (supabase) await supabase.from('pre_stacking').upsert(itemToSave);
    const current = await db.getPreStacking();
    const idx = current.findIndex(p => String(p.id) === itemToSave.id);
    if (idx >= 0) current[idx] = itemToSave; else current.push(itemToSave);
    localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(current));
  },

  exportBackup: async () => {
    const data = {
      drivers: await db.getDrivers(),
      customers: await db.getCustomers(),
      ports: await db.getPorts(),
      preStacking: await db.getPreStacking(),
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
      if (data.preStacking) localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(data.preStacking));
      if (data.staff) localStorage.setItem(KEYS.STAFF, JSON.stringify(data.staff));
      if (data.users) localStorage.setItem(KEYS.USERS, JSON.stringify(data.users));
      return true;
    } catch (e) {
      console.error("Erro na importação:", e);
      return false;
    }
  }
};
