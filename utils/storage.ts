
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

  _saveLocal: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  setSession: (user: User | null) => {
    if (user) sessionStorage.setItem(KEYS.SESSION, JSON.stringify(user));
    else sessionStorage.removeItem(KEYS.SESSION);
  },
  getSession: (): User | null => {
    const s = sessionStorage.getItem(KEYS.SESSION);
    return s ? JSON.parse(s) : null;
  },

  getUsers: async (): Promise<User[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          const normalized = data.map((u: any) => ({
            ...u,
            displayName: u.name || u.displayName,
            lastLogin: u.lastlogin || u.lastLogin,
            staffId: u.staffid || u.staffId,
            emailCorp: u.emailcorp || u.emailCorp,
            phoneCorp: u.phonecorp || u.phoneCorp
          }));
          db._saveLocal(KEYS.USERS, normalized);
          return normalized;
        }
      } catch (e) { console.warn("Supabase getUsers offline."); }
    }
    return localData;
  },

  saveUser: async (user: User) => {
    const current = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = current.findIndex((u: any) => u.id === user.id || u.username === user.username.toLowerCase());
    
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...user };
    } else {
      updated = [...current, user];
    }
    db._saveLocal(KEYS.USERS, updated);

    if (supabase) {
      try {
        const payload = {
          id: user.id,
          username: user.username.toLowerCase(), // SEMPRE MINÚSCULO
          password: user.password,
          name: user.displayName.toUpperCase(), 
          role: user.role,
          staffid: user.staffId,
          lastlogin: user.lastLogin,
          position: user.position?.toUpperCase(),
          status: user.status || 'Ativo',
          phonecorp: user.phoneCorp,
          emailcorp: user.emailCorp?.toLowerCase()
        };
        
        const { error } = await supabase.from('users').upsert(payload);
        if (error) throw error;
      } catch (e: any) { 
        console.error("Erro Supabase User:", e.message); 
        throw e; 
      }
    }
  },

  getStaff: async (): Promise<Staff[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    if (supabase) {
      try {
        const { data, error } = await supabase.from('staff').select('*');
        if (!error && data) {
          const normalized = data.map((s: any) => ({
            ...s,
            registrationDate: s.registrationdate || s.registrationDate,
            statusSince: s.statussince || s.statusSince,
            emailCorp: s.emailcorp || s.emailCorp,
            phoneCorp: s.phonecorp || s.phoneCorp
          }));
          db._saveLocal(KEYS.STAFF, normalized);
          return normalized;
        }
      } catch (e) { console.warn("Supabase getStaff offline."); }
    }
    return localData;
  },

  saveStaff: async (staff: Staff, passwordOverride?: string) => {
    const currentStaff = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    const sIdx = currentStaff.findIndex((s: any) => s.id === staff.id);
    let updatedStaff;
    if (sIdx >= 0) {
      updatedStaff = [...currentStaff];
      updatedStaff[sIdx] = staff;
    } else {
      updatedStaff = [...currentStaff, staff];
    }
    db._saveLocal(KEYS.STAFF, updatedStaff);

    const users = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const existingUser = users.find((u: any) => u.staffId === staff.id);
    
    const userData: User = {
      id: existingUser?.id || `u-${staff.id}`,
      username: staff.username.toLowerCase(),
      displayName: staff.name,
      role: staff.role as any,
      staffId: staff.id,
      lastLogin: existingUser?.lastLogin || new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isFirstLogin: existingUser ? existingUser.isFirstLogin : true,
      password: passwordOverride || existingUser?.password || '12345678',
      position: staff.position,
      emailCorp: staff.emailCorp,
      phoneCorp: staff.phoneCorp,
      status: staff.status,
      statusSince: staff.statusSince
    };
    
    await db.saveUser(userData);

    if (supabase) {
      try {
        const staffPayload = {
          id: staff.id,
          photo: staff.photo,
          name: staff.name.toUpperCase(),
          position: staff.position.toUpperCase(),
          username: staff.username.toLowerCase(),
          role: staff.role,
          registrationdate: staff.registrationDate,
          emailcorp: staff.emailCorp?.toLowerCase(),
          phonecorp: staff.phoneCorp,
          status: staff.status,
          statussince: staff.statusSince
        };
        const { error } = await supabase.from('staff').upsert(staffPayload);
        if (error) throw error;
      } catch (e: any) { 
        console.error("Erro Supabase Staff:", e.message); 
        throw e;
      }
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
        // Deleta o usuário vinculado pelo staffid
        await supabase.from('users').delete().eq('staffid', id);
      } catch (e) { console.error("Cloud Sync Error (Delete Staff)"); }
    }
    return true;
  },

  getDrivers: async (): Promise<Driver[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('drivers').select('*');
        if (data) {
          db._saveLocal(KEYS.DRIVERS, data);
          return data;
        }
      } catch (e) { console.warn("Supabase getDrivers offline."); }
    }
    return localData;
  },

  saveDriver: async (driver: Driver) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    const idx = current.findIndex((d: any) => d.id === driver.id);
    let updated;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = driver;
    } else {
      updated = [...current, driver];
    }
    db._saveLocal(KEYS.DRIVERS, updated);
    if (supabase) await supabase.from('drivers').upsert(driver);
  },

  deleteDriver: async (id: string) => {
    const currentDrivers = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    db._saveLocal(KEYS.DRIVERS, currentDrivers.filter((d: any) => d.id !== id));
    if (supabase) {
      await supabase.from('drivers').delete().eq('id', id);
    }
  },

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

  getPreStacking: async (): Promise<PreStacking[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
    if (supabase) {
      try {
        const { data } = await supabase.from('pre_stacking').select('*');
        if (data) { db._saveLocal(KEYS.PRESTACKING, data); return data; }
      } catch (e) { console.warn("Supabase getPreStacking offline."); }
    }
    return localData;
  },

  savePreStacking: async (item: PreStacking) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
    const idx = current.findIndex((p: any) => p.id === item.id);
    let updated;
    if (idx >= 0) { updated = [...current]; updated[idx] = item; } else { updated = [...current, item]; }
    db._saveLocal(KEYS.PRESTACKING, updated);
    if (supabase) await supabase.from('pre_stacking').upsert(item);
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
