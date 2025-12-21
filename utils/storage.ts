
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User } from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

// Inicializa o cliente apenas se houver credenciais
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

  _saveLocal: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // SESSÃO: Usa sessionStorage para que ao fechar a guia a sessão expire
  setSession: (user: User | null) => {
    if (user) sessionStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    else sessionStorage.removeItem(KEYS.SESSION);
  },
  getSession: (): User | null => {
    const s = sessionStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },

  // USUÁRIOS
  getUsers: async (): Promise<User[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data && data.length > 0) {
          db._saveLocal(KEYS.USERS, data);
          return data;
        }
      } catch (e) { console.warn("Supabase getUsers failed, using local."); }
    }
    return localData;
  },

  saveUser: async (user: User) => {
    // 1. Garante salvamento local primeiro
    const current = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);

    // 2. Tenta sincronizar com a nuvem em segundo plano
    if (supabase) {
      try {
        await supabase.from('users').upsert(user);
      } catch (e) { console.error("Erro ao sincronizar User com Supabase."); }
    }
  },

  // STAFF (EQUIPE)
  getStaff: async (): Promise<Staff[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    if (supabase) {
      try {
        const { data, error } = await supabase.from('staff').select('*');
        if (!error && data && data.length > 0) {
          db._saveLocal(KEYS.STAFF, data);
          return data;
        }
      } catch (e) { console.warn("Supabase getStaff failed."); }
    }
    return localData;
  },

  saveStaff: async (staff: Staff, passwordOverride?: string) => {
    // 1. Salvar Staff Localmente
    const currentStaff = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    const sIdx = currentStaff.findIndex((s: any) => s.id === staff.id);
    if (sIdx >= 0) currentStaff[sIdx] = staff; else currentStaff.push(staff);
    db._saveLocal(KEYS.STAFF, currentStaff);

    // 2. Garantir Usuário de Acesso Localmente
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
      // Senha padrão 12345678 se for novo
      password: passwordOverride || existingUser?.password || '12345678',
      position: staff.position
    };
    
    await db.saveUser(userData);

    // 3. Nuvem
    if (supabase) {
      try {
        await supabase.from('staff').upsert(staff);
      } catch (e) { console.error("Erro ao sincronizar Staff com Supabase."); }
    }
  },

  deleteStaff: async (id: string) => {
    const currentStaff = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    db._saveLocal(KEYS.STAFF, currentStaff.filter((s: any) => s.id !== id));
    
    const currentUsers = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    db._saveLocal(KEYS.USERS, currentUsers.filter((u: any) => u.staffId !== id));

    if (supabase) {
      try {
        await supabase.from('staff').delete().eq('id', id);
        await supabase.from('users').delete().eq('staffId', id);
      } catch (e) { console.error("Erro ao deletar Staff do Supabase."); }
    }
    return true;
  },

  // MOTORISTAS
  getDrivers: async (): Promise<Driver[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('drivers').select('*');
        if (data && data.length > 0) {
          db._saveLocal(KEYS.DRIVERS, data);
          return data;
        }
      } catch (e) { console.warn("Supabase getDrivers failed."); }
    }
    return localData;
  },

  saveDriver: async (driver: Driver) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    
    if (supabase) {
      try {
        await supabase.from('drivers').upsert(driver);
      } catch (e) { console.error("Erro ao sincronizar Driver com Supabase."); }
    }
  },

  deleteDriver: async (id: string) => {
    const currentDrivers = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    db._saveLocal(KEYS.DRIVERS, currentDrivers.filter((d: any) => d.id !== id));
    if (supabase) {
      try {
        await supabase.from('drivers').delete().eq('id', id);
        await supabase.from('users').delete().eq('driverId', id);
      } catch (e) { console.error("Erro ao deletar Driver do Supabase."); }
    }
  },

  // CLIENTES
  getCustomers: async (): Promise<Customer[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('customers').select('*');
        if (data && data.length > 0) { db._saveLocal(KEYS.CUSTOMERS, data); return data; }
      } catch (e) { console.warn("Supabase getCustomers failed."); }
    }
    return localData;
  },

  saveCustomer: async (customer: Customer) => {
    const current = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    if (supabase) {
      try {
        await supabase.from('customers').upsert(customer);
      } catch (e) { console.error("Erro ao sincronizar Customer com Supabase."); }
    }
  },

  // PORTOS
  getPorts: async (): Promise<Port[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('ports').select('*');
        if (data && data.length > 0) { db._saveLocal(KEYS.PORTS, data); return data; }
      } catch (e) { console.warn("Supabase getPorts failed."); }
    }
    return localData;
  },

  savePort: async (port: Port) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    db._saveLocal(KEYS.PORTS, current);
    if (supabase) {
      try {
        await supabase.from('ports').upsert(port);
      } catch (e) { console.error("Erro ao sincronizar Port com Supabase."); }
    }
  },

  // PRÉ-STACKING
  getPreStacking: async (): Promise<PreStacking[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('pre_stacking').select('*');
        if (data && data.length > 0) { db._saveLocal(KEYS.PRESTACKING, data); return data; }
      } catch (e) { console.warn("Supabase getPreStacking failed."); }
    }
    return localData;
  },

  savePreStacking: async (item: PreStacking) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
    const idx = current.findIndex((p: any) => p.id === item.id);
    if (idx >= 0) current[idx] = item; else current.push(item);
    db._saveLocal(KEYS.PRESTACKING, current);
    if (supabase) {
      try {
        await supabase.from('pre_stacking').upsert(item);
      } catch (e) { console.error("Erro ao sincronizar PreStacking com Supabase."); }
    }
  },

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

  importBackup: async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (data.drivers) db._saveLocal(KEYS.DRIVERS, data.drivers);
          if (data.customers) db._saveLocal(KEYS.CUSTOMERS, data.customers);
          if (data.ports) db._saveLocal(KEYS.PORTS, data.ports);
          if (data.preStacking) db._saveLocal(KEYS.PRESTACKING, data.preStacking);
          if (data.staff) db._saveLocal(KEYS.STAFF, data.staff);
          if (data.users) db._saveLocal(KEYS.USERS, data.users);
          resolve(true);
        } catch (error) {
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }
};
