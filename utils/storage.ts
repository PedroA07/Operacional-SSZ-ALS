
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User } from '../types';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export const KEYS = {
  DRIVERS: 'als_drivers',
  CUSTOMERS: 'als_customers',
  PORTS: 'als_ports',
  PRE_STACKING: 'als_pre_stacking',
  STAFF: 'als_staff',
  USERS: 'als_users'
};

export const db = {
  _saveLocal: (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  isCloudActive: () => !!supabase,

  subscribe: (table: string, callback: (payload?: any) => void): RealtimeChannel | null => {
    if (!supabase) return null;
    return supabase
      .channel(`table_db_changes_${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: table }, (payload) => {
        callback(payload);
      })
      .subscribe();
  },

  updateHeartbeat: async (userId: string) => {
    if (!supabase || document.visibilityState !== 'visible') return;
    try {
      await supabase.from('users').update({ lastseen: new Date().toISOString() }).eq('id', userId);
    } catch (e) { /* silent */ }
  },

  getUsers: async (): Promise<User[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          const normalized = data.map((u: any) => ({
            id: u.id,
            username: u.username,
            password: u.password,
            displayName: u.name || u.displayName,
            role: u.role,
            staffId: u.staffid || u.staffId,
            lastLogin: u.lastlogin || u.lastLogin,
            lastSeen: u.lastseen || u.lastSeen,
            position: u.position,
            photo: u.photo,
            isFirstLogin: u.isfirstlogin !== undefined ? u.isfirstlogin : (u.isFirstLogin ?? true),
            status: u.status || 'Ativo'
          }));
          db._saveLocal(KEYS.USERS, normalized);
          return normalized;
        }
      } catch (e) { console.warn("Supabase getUsers offline."); }
    }
    return localData;
  },

  saveUser: async (user: User) => {
    const lowerUsername = user.username.toLowerCase();
    const current = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
    const idx = current.findIndex((u: any) => u.id === user.id || u.username.toLowerCase() === lowerUsername);
    
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...user, username: lowerUsername };
    } else {
      current.push({ ...user, username: lowerUsername });
    }
    db._saveLocal(KEYS.USERS, current);

    if (supabase) {
      try {
        const payload = {
          id: user.id,
          username: lowerUsername,
          password: user.password,
          name: user.displayName.toUpperCase(), 
          role: user.role,
          staffid: user.staffId,
          lastlogin: user.lastLogin,
          position: user.position?.toUpperCase(),
          status: user.status || 'Ativo',
          isfirstlogin: user.isFirstLogin ?? true,
          photo: user.photo
        };
        const { error } = await supabase.from('users').upsert(payload);
        if (error) throw error;
      } catch (e: any) { console.error("Erro Supabase User:", e.message); }
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

  saveStaff: async (staff: Staff, password?: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    const idx = current.findIndex((s: any) => s.id === staff.id);
    let isNew = idx < 0;

    if (!isNew) { current[idx] = staff; } else { current.push(staff); }
    db._saveLocal(KEYS.STAFF, current);

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
        await supabase.from('staff').upsert(staffPayload);
      } catch (e) { console.error("Erro Supabase Staff:", e); }
    }

    const users = await db.getUsers();
    const existingUser = users.find(u => u.staffId === staff.id);
    
    const userData: User = {
      id: existingUser?.id || `u-${staff.id}`,
      username: staff.username.toLowerCase(),
      displayName: staff.name,
      role: staff.role,
      staffId: staff.id,
      lastLogin: existingUser?.lastLogin || new Date().toISOString(),
      position: staff.position,
      photo: staff.photo,
      status: staff.status,
      isFirstLogin: isNew ? true : (existingUser?.isFirstLogin ?? true),
      password: password || existingUser?.password || '12345678'
    };
    
    await db.saveUser(userData);
  },

  getDrivers: async (): Promise<Driver[]> => {
    const localData = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    if (supabase) {
      try {
        const { data, error } = await supabase.from('drivers').select('*');
        if (!error && data) {
          const normalized = data.map((d: any) => ({
            id: d.id,
            photo: d.photo,
            name: d.name,
            cpf: d.cpf,
            rg: d.rg,
            cnh: d.cnh,
            phone: d.phone,
            email: d.email,
            plateHorse: d.plate_horse || d.plateHorse,
            yearHorse: d.year_horse || d.yearHorse,
            plateTrailer: d.plate_trailer || d.plateTrailer,
            yearTrailer: d.year_trailer || d.yearTrailer,
            driverType: d.driver_type || d.driverType,
            status: d.status,
            statusLastChangeDate: d.status_last_change_date || d.statusLastChangeDate,
            beneficiaryName: d.beneficiary_name || d.beneficiaryName,
            beneficiaryPhone: d.beneficiary_phone || d.beneficiaryPhone,
            beneficiaryEmail: d.beneficiary_email || d.beneficiaryEmail,
            beneficiaryCnpj: d.beneficiary_cnpj || d.beneficiaryCnpj,
            paymentPreference: d.payment_preference || d.paymentPreference,
            whatsappGroupName: d.whatsapp_group_name || d.whatsappGroupName,
            whatsappGroupLink: d.whatsapp_group_link || d.whatsappGroupLink,
            registrationDate: d.registration_date || d.registrationDate,
            operations: d.operations || [],
            tripsCount: d.trips_count || 0,
            generatedPassword: d.generated_password || d.generatedPassword
          }));
          db._saveLocal(KEYS.DRIVERS, normalized);
          return normalized;
        }
      } catch (e) { console.warn("Supabase getDrivers offline."); }
    }
    return localData;
  },

  saveDriver: async (driver: Driver) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) { current[idx] = driver; } else { current.push(driver); }
    db._saveLocal(KEYS.DRIVERS, current);

    if (supabase) {
      try {
        const payload = {
          id: driver.id,
          photo: driver.photo || null,
          name: driver.name?.toUpperCase(),
          cpf: driver.cpf,
          rg: driver.rg || null,
          cnh: driver.cnh || null,
          phone: driver.phone,
          email: driver.email?.toLowerCase() || null,
          plate_horse: driver.plateHorse,
          year_horse: driver.yearHorse,
          plate_trailer: driver.plateTrailer,
          year_trailer: driver.yearTrailer,
          driver_type: driver.driverType,
          status: driver.status,
          status_last_change_date: driver.statusLastChangeDate,
          beneficiary_name: driver.beneficiaryName?.toUpperCase() || null,
          beneficiary_phone: driver.beneficiaryPhone || null,
          beneficiary_email: driver.beneficiaryEmail?.toLowerCase() || null,
          beneficiary_cnpj: driver.beneficiaryCnpj || null,
          payment_preference: driver.paymentPreference || 'PIX',
          whatsapp_group_name: driver.whatsappGroupName?.toUpperCase() || null,
          whatsapp_group_link: driver.whatsappGroupLink || null,
          registration_date: driver.registrationDate,
          operations: driver.operations || [],
          trips_count: driver.tripsCount || 0,
          generated_password: driver.generatedPassword || null
        };
        const { error } = await supabase.from('drivers').upsert(payload);
        if (error) throw error;
      } catch (e: any) { 
        console.error("Erro Supabase Driver:", e.message);
        throw e;
      }
    }
  },

  deleteDriver: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    db._saveLocal(KEYS.DRIVERS, current.filter((d: any) => d.id !== id));
    if (supabase) await supabase.from('drivers').delete().eq('id', id);
    return true;
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
    if (idx >= 0) { current[idx] = customer; } else { current.push(customer); }
    db._saveLocal(KEYS.CUSTOMERS, current);
    if (supabase) await supabase.from('customers').upsert(customer);
  },

  deleteCustomer: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    db._saveLocal(KEYS.CUSTOMERS, current.filter((c: any) => c.id !== id));
    if (supabase) await supabase.from('customers').delete().eq('id', id);
    return true;
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
    if (idx >= 0) { current[idx] = port; } else { current.push(port); }
    db._saveLocal(KEYS.PORTS, current);
    if (supabase) await supabase.from('ports').upsert(port);
  },

  deletePort: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    db._saveLocal(KEYS.PORTS, current.filter((p: any) => p.id !== id));
    if (supabase) await supabase.from('ports').delete().eq('id', id);
    return true;
  },

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
    if (idx >= 0) { current[idx] = ps; } else { current.push(ps); }
    db._saveLocal(KEYS.PRE_STACKING, current);
    if (supabase) await supabase.from('pre_stacking').upsert(ps);
  },

  deletePreStacking: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.PRE_STACKING) || '[]');
    db._saveLocal(KEYS.PRE_STACKING, current.filter((p: any) => p.id !== id));
    if (supabase) await supabase.from('pre_stacking').delete().eq('id', id);
    return true;
  },

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
          if (content.drivers) db._saveLocal(KEYS.DRIVERS, content.drivers);
          if (content.customers) db._saveLocal(KEYS.CUSTOMERS, content.customers);
          if (content.ports) db._saveLocal(KEYS.PORTS, content.ports);
          if (content.preStacking) db._saveLocal(KEYS.PRE_STACKING, content.preStacking);
          if (content.staff) db._saveLocal(KEYS.STAFF, content.staff);
          if (content.users) db._saveLocal(KEYS.USERS, content.users);
          resolve(true);
        } catch (err) { resolve(false); }
      };
      reader.readAsText(file);
    });
  },

  deleteStaff: async (id: string) => {
    const current = JSON.parse(localStorage.getItem(KEYS.STAFF) || '[]');
    db._saveLocal(KEYS.STAFF, current.filter((s: any) => s.id !== id));
    if (supabase) await supabase.from('staff').delete().eq('id', id);
    
    const users = await db.getUsers();
    const user = users.find(u => u.staffId === id);
    if (user) {
      const remainingUsers = users.filter(u => u.id !== user.id);
      db._saveLocal(KEYS.USERS, remainingUsers);
      if (supabase) await supabase.from('users').delete().eq('id', user.id);
    }
    return true;
  }
};
