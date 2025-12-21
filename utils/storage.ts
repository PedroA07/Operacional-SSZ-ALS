
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking } from '../types';

/**
 * Accessing environment variables via process.env as per the execution context's configuration.
 */
// Fix: Property 'env' does not exist on type 'ImportMeta'. Using process.env instead.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
// Fix: Property 'env' does not exist on type 'ImportMeta'. Using process.env instead.
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

if (!supabase) {
  console.warn("MODO LOCAL: Para ativar a Nuvem, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel.");
}

const KEYS = {
  DRIVERS: 'als_db_drivers',
  CUSTOMERS: 'als_db_customers',
  PORTS: 'als_db_ports',
  PRESTACKING: 'als_db_prestacking'
};

export const db = {
  isCloudActive: () => !!supabase,

  getDrivers: async (): Promise<Driver[]> => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('drivers').select('*');
        if (!error && data) return data;
      }
    } catch (e) {
      console.error("Erro Supabase:", e);
    }
    return JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
  },

  saveDriver: async (driver: Driver) => {
    try {
      if (supabase) {
        await supabase.from('drivers').upsert(driver);
      }
    } catch (e) {
      console.error("Erro Supabase:", e);
    }
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    const index = current.findIndex((d: any) => d.id === driver.id);
    if (index >= 0) current[index] = driver;
    else current.push(driver);
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current));
  },

  deleteDriver: async (id: string) => {
    if (supabase) await supabase.from('drivers').delete().eq('id', id);
    const current = JSON.parse(localStorage.getItem(KEYS.DRIVERS) || '[]');
    localStorage.setItem(KEYS.DRIVERS, JSON.stringify(current.filter((d: any) => d.id !== id)));
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('customers').select('*');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
  },
  saveCustomer: async (customer: Customer) => {
    if (supabase) await supabase.from('customers').upsert(customer);
    const current = JSON.parse(localStorage.getItem(KEYS.CUSTOMERS) || '[]');
    const index = current.findIndex((c: any) => c.id === customer.id);
    if (index >= 0) current[index] = customer;
    else current.push(customer);
    localStorage.setItem(KEYS.CUSTOMERS, JSON.stringify(current));
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('ports').select('*');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
  },
  savePort: async (port: Port) => {
    if (supabase) await supabase.from('ports').upsert(port);
    const current = JSON.parse(localStorage.getItem(KEYS.PORTS) || '[]');
    const index = current.findIndex((p: any) => p.id === port.id);
    if (index >= 0) current[index] = port;
    else current.push(port);
    localStorage.setItem(KEYS.PORTS, JSON.stringify(current));
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) {
      const { data, error } = await supabase.from('pre_stacking').select('*');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
  },
  savePreStacking: async (item: PreStacking) => {
    if (supabase) await supabase.from('pre_stacking').upsert(item);
    const current = JSON.parse(localStorage.getItem(KEYS.PRESTACKING) || '[]');
    const index = current.findIndex((p: any) => p.id === item.id);
    if (index >= 0) current[index] = item;
    else current.push(item);
    localStorage.setItem(KEYS.PRESTACKING, JSON.stringify(current));
  },

  exportBackup: async () => {
    const data = {
      drivers: await db.getDrivers(),
      customers: await db.getCustomers(),
      ports: await db.getPorts(),
      preStacking: await db.getPreStacking(),
      backupDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ALS_BACKUP_${new Date().getTime()}.json`;
    link.click();
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
          resolve(true);
        } catch (err) {
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }
};
