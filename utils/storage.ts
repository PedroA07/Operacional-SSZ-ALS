
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType, NotificationOrigin, PresenceStatus } from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';
import { offlineManager } from './offlineManager';
import { fileStorage } from './fileStorage';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: true }
    }) 
  : null;

export const db = {
  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch { return false; }
  },

  /**
   * FUNÇÃO CRÍTICA: Varre o cache local e empurra tudo para o banco de dados.
   * Modificado para usar as funções de salvamento do db (que tratam R2) em vez do repo direto.
   */
  pushLocalDataToCloud: async (onProgress?: (msg: string) => void) => {
    if (!supabase) throw new Error("Banco de dados não configurado.");
    
    let totalSynced = 0;
    const categories = ['drivers', 'trips', 'customers', 'ports', 'pre_stacking', 'staff', 'categories'];

    for (const cat of categories) {
      const localItems = offlineManager.getRegistry<any>(cat);
      if (localItems.length > 0) {
        if (onProgress) onProgress(`Sincronizando ${cat}: ${localItems.length} itens...`);
        
        for (const item of localItems) {
          try {
            let success = false;
            // Chama os métodos de salvamento do db para garantir que Base64 -> R2 aconteça
            if (cat === 'drivers') success = await db.saveDriver(item);
            else if (cat === 'trips') success = await db.saveTrip(item);
            else if (cat === 'customers') success = await db.saveCustomer(item);
            else if (cat === 'ports') success = await db.savePort(item);
            else if (cat === 'pre_stacking') success = await db.savePreStacking(item);
            else if (cat === 'staff') success = await db.saveStaff(item);
            else if (cat === 'categories') success = await db.saveCategory(item);

            if (success) totalSynced++;
          } catch (e) {
            console.error(`Erro ao sincronizar item ${item.id} de ${cat}:`, e);
          }
        }
      }
    }
    return totalSynced;
  },

  // --- USUÁRIOS ---
  getUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*');
    if (error) return [];
    return (data || []).map(u => ({
      id: u.id, username: u.username, password: u.password,
      displayName: u.display_name || u.username,
      role: u.role, lastLogin: u.last_login,
      photo: u.photo, position: u.position, driverId: u.driver_id,
      staffId: u.staff_id, status: u.status,
      isFirstLogin: u.is_first_login,
      lastSeen: u.last_seen, presence_status: u.presence_status
    }));
  },

  saveUser: async (user: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').upsert({
      id: user.id, username: user.username, password: user.password,
      display_name: user.displayName, role: user.role, last_login: user.lastLogin,
      status: user.status || 'Ativo', driver_id: user.driverId, staff_id: user.staffId,
      position: user.position, is_first_login: user.isFirstLogin,
      presence_status: user.presence_status || 'offline',
      photo: user.photo
    });
    return !error;
  },

  // --- MOTORISTAS ---
  getDrivers: async (): Promise<Driver[]> => {
    if (!supabase) return offlineManager.getRegistry<Driver>('drivers');
    try {
      const remote = await driverRepository.getAll(supabase);
      offlineManager.setRegistry('drivers', remote);
      return remote;
    } catch {
      return offlineManager.getRegistry<Driver>('drivers');
    }
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    // PROTEÇÃO R2: Se a foto for Base64, sobe para o R2 antes de qualquer coisa
    if (driver.photo && driver.photo.startsWith('data:')) {
      try {
        driver.photo = await fileStorage.uploadDriverProfile(driver.photo, driver.name);
      } catch (e) {
        console.error("Falha ao subir foto do motorista para R2:", e);
      }
    }
    
    // PROTEÇÃO R2: Se tiver CNH em Base64
    if (driver.cnhPdfUrl && driver.cnhPdfUrl.startsWith('data:')) {
      try {
        driver.cnhPdfUrl = await fileStorage.uploadDriverCNH(driver.cnhPdfUrl, driver.name);
      } catch (e) {
        console.error("Falha ao subir CNH do motorista para R2:", e);
      }
    }

    // Salva no cache local (sempre atualizado com URLs do R2 se o upload acima deu certo)
    const localRegistry = offlineManager.getRegistry<Driver>('drivers');
    const updatedRegistry = [driver, ...localRegistry.filter(d => d.id !== driver.id)];
    offlineManager.setRegistry('drivers', updatedRegistry);

    if (!supabase) return true;
    try {
      const success = await driverRepository.save(supabase, driver);
      if (success && actingUser) {
        await db.addNotification(actingUser, 'DRIVER_UPDATED', 'Motorista Atualizado', `O cadastro de ${driver.name} foi sincronizado.`, { motorista: driver.name });
      }
      return success;
    } catch {
      return true; // Mantém no cache local para tentativa futura
    }
  },

  deleteDriver: async (id: string) => {
    const local = offlineManager.getRegistry<Driver>('drivers');
    offlineManager.setRegistry('drivers', local.filter(d => d.id !== id));
    if (!supabase) return true;
    return await driverRepository.delete(supabase, id);
  },

  getDriverByCPF: async (cpf: string): Promise<Driver | null> => {
    const local = offlineManager.getRegistry<Driver>('drivers').find(d => d.cpf === cpf);
    if (local) return local;
    if (!supabase) return null;
    const { data, error } = await supabase.from('drivers').select('*').eq('cpf', cpf).maybeSingle();
    if (error || !data) return null;
    return driverRepository.mapFromDb(data);
  },

  // --- VIAGENS ---
  getTrips: async (): Promise<Trip[]> => {
    if (!supabase) return offlineManager.getRegistry<Trip>('trips');
    try {
      const remote = await tripRepository.getAll(supabase);
      offlineManager.setRegistry('trips', remote);
      return remote;
    } catch {
      return offlineManager.getRegistry<Trip>('trips');
    }
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    const local = offlineManager.getRegistry<Trip>('trips');
    offlineManager.setRegistry('trips', [trip, ...local.filter(t => t.id !== trip.id)]);
    if (!supabase) return true;
    return await tripRepository.save(supabase, trip);
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    const local = offlineManager.getRegistry<Trip>('trips');
    offlineManager.setRegistry('trips', local.filter(t => t.id !== id));
    if (!supabase) return true;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    return !error;
  },

  // --- CLIENTES ---
  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) return offlineManager.getRegistry<Customer>('customers');
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) return offlineManager.getRegistry<Customer>('customers');
    const remote = (data || []).map(c => ({ ...c, legalName: c.legal_name, zipCode: c.zip_code })) as Customer[];
    offlineManager.setRegistry('customers', remote);
    return remote;
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    const local = offlineManager.getRegistry<Customer>('customers');
    offlineManager.setRegistry('customers', [customer, ...local.filter(c => c.id !== customer.id)]);
    if (!supabase) return true;
    const { error } = await supabase.from('customers').upsert({
      id: customer.id, name: customer.name, legal_name: customer.legalName,
      cnpj: customer.cnpj, address: customer.address, neighborhood: customer.neighborhood,
      zip_code: customer.zipCode, city: customer.city, state: customer.state,
      operations: customer.operations || []
    });
    return !error;
  },

  deleteCustomer: async (id: string) => {
    const local = offlineManager.getRegistry<Customer>('customers');
    offlineManager.setRegistry('customers', local.filter(c => c.id !== id));
    if (!supabase) return true;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    return !error;
  },

  // --- COLABORADORES ---
  getStaff: async (): Promise<Staff[]> => {
    if (!supabase) return offlineManager.getRegistry<Staff>('staff');
    try {
      const remote = await staffRepository.getAll(supabase);
      offlineManager.setRegistry('staff', remote);
      return remote;
    } catch {
      return offlineManager.getRegistry<Staff>('staff');
    }
  },

  saveStaff: async (staff: Staff, password?: string) => {
    // PROTEÇÃO R2: Foto do staff
    if (staff.photo && staff.photo.startsWith('data:')) {
      try {
        staff.photo = await fileStorage.uploadStaffPhoto(staff.photo, staff.name);
      } catch (e) {
        console.error("Falha ao subir foto do staff para R2:", e);
      }
    }

    const local = offlineManager.getRegistry<Staff>('staff');
    offlineManager.setRegistry('staff', [staff, ...local.filter(s => s.id !== staff.id)]);
    if (!supabase) return true;
    const success = await staffRepository.save(supabase, staff);
    if (success && password) {
      await supabase.from('users').upsert({
        id: `u-stf-${staff.id}`,
        username: staff.username.toLowerCase(),
        password: password,
        display_name: staff.name,
        role: staff.role,
        staff_id: staff.id,
        status: staff.status,
        position: staff.position,
        photo: staff.photo
      });
    }
    return success;
  },

  deleteStaff: async (id: string) => {
    const local = offlineManager.getRegistry<Staff>('staff');
    offlineManager.setRegistry('staff', local.filter(s => s.id !== id));
    if (!supabase) return true;
    await supabase.from('users').delete().eq('staff_id', id);
    return await staffRepository.delete(supabase, id);
  },

  // --- PORTS ---
  getPorts: async (): Promise<Port[]> => {
    if (!supabase) return offlineManager.getRegistry<Port>('ports');
    const { data, error } = await supabase.from('ports').select('*').order('name');
    if (error) return offlineManager.getRegistry<Port>('ports');
    const remote = (data || []).map(p => ({ ...p, legalName: p.legal_name, zipCode: p.zip_code })) as Port[];
    offlineManager.setRegistry('ports', remote);
    return remote;
  },

  savePort: async (port: Port, actingUser?: User) => {
    const local = offlineManager.getRegistry<Port>('ports');
    offlineManager.setRegistry('ports', [port, ...local.filter(p => p.id !== port.id)]);
    if (!supabase) return true;
    const { error } = await supabase.from('ports').upsert({
      id: port.id, name: port.name, legal_name: port.legalName,
      cnpj: port.cnpj, address: port.address, neighborhood: port.neighborhood,
      zip_code: port.zipCode, city: port.city, state: port.state
    });
    return !error;
  },

  deletePort: async (id: string) => {
    const local = offlineManager.getRegistry<Port>('ports');
    offlineManager.setRegistry('ports', local.filter(p => p.id !== id));
    if (!supabase) return true;
    const { error } = await supabase.from('ports').delete().eq('id', id);
    return !error;
  },

  // --- PRE-STACKING ---
  getPreStacking: async (): Promise<PreStacking[]> => {
    if (!supabase) return offlineManager.getRegistry<PreStacking>('pre_stacking');
    const { data, error } = await supabase.from('pre_stacking').select('*').order('name');
    if (error) return offlineManager.getRegistry<PreStacking>('pre_stacking');
    const remote = (data || []).map(ps => ({ ...ps, legalName: ps.legal_name, zipCode: ps.zip_code })) as PreStacking[];
    offlineManager.setRegistry('pre_stacking', remote);
    return remote;
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    const local = offlineManager.getRegistry<PreStacking>('pre_stacking');
    offlineManager.setRegistry('pre_stacking', [ps, ...local.filter(p => p.id !== ps.id)]);
    if (!supabase) return true;
    const { error } = await supabase.from('pre_stacking').upsert({
      id: ps.id, name: ps.name, legal_name: ps.legalName,
      cnpj: ps.cnpj, address: ps.address, neighborhood: ps.neighborhood,
      zip_code: ps.zipCode, city: ps.city, state: ps.state
    });
    return !error;
  },

  deletePreStacking: async (id: string) => {
    const local = offlineManager.getRegistry<PreStacking>('pre_stacking');
    offlineManager.setRegistry('pre_stacking', local.filter(p => p.id !== id));
    if (!supabase) return true;
    const { error } = await supabase.from('pre_stacking').delete().eq('id', id);
    return !error;
  },

  // --- CATEGORIES ---
  getCategories: async (): Promise<Category[]> => {
    if (!supabase) return offlineManager.getRegistry<Category>('categories');
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) return offlineManager.getRegistry<Category>('categories');
    const remote = (data || []).map(c => ({ id: c.id, name: c.name, parentId: c.parent_id })) as Category[];
    offlineManager.setRegistry('categories', remote);
    return remote;
  },

  saveCategory: async (category: Category, actingUser?: User) => {
    const local = offlineManager.getRegistry<Category>('categories');
    offlineManager.setRegistry('categories', [category, ...local.filter(c => c.id !== category.id)]);
    if (!supabase) return true;
    const { error } = await supabase.from('categories').upsert({
      id: category.id, name: category.name, parent_id: category.parentId
    });
    return !error;
  },

  // --- NOTIFICAÇÕES ---
  addNotification: async (user: User, type: NotificationType, title: string, message: string, summary?: any) => {
    if (!supabase) return;
    await supabase.from('notifications').insert({
      user_id: user.id, user_name: user.displayName,
      type, message, summary,
      origin: (user.role === 'driver' || user.role === 'motoboy') ? 'MOTORISTA' : 'OPERACIONAL',
      timestamp: new Date().toISOString()
    });
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50);
    if (error) return [];
    return (data || []).map(n => ({
      id: String(n.id), title: n.type.replace(/_/g, ' '),
      description: n.message, type: n.type, origin: n.origin,
      authorName: n.user_name, authorId: n.user_id,
      timestamp: n.timestamp, summary: n.summary
    }));
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (!supabase) return;
    await supabase.from('users').update({ presence_status: status, last_seen: new Date().toISOString() }).eq('id', userId);
  },

  exportBackup: async () => {
    const [drivers, customers, ports, prestacking, staff, trips, categories] = await Promise.all([
      db.getDrivers(), db.getCustomers(), db.getPorts(), db.getPreStacking(), db.getStaff(), db.getTrips(), db.getCategories()
    ]);
    const data = { drivers, customers, ports, prestacking, staff, trips, categories, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ALS_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!supabase) return false;
      if (data.drivers) for (const d of data.drivers) await db.saveDriver(d);
      if (data.customers) for (const c of data.customers) await db.saveCustomer(c);
      if (data.ports) for (const p of data.ports) await db.savePort(p);
      if (data.prestacking) for (const ps of data.prestacking) await db.savePreStacking(ps);
      if (data.staff) for (const s of data.staff) await db.saveStaff(s);
      if (data.trips) for (const t of data.trips) await db.saveTrip(t);
      if (data.categories) for (const c of data.categories) await db.saveCategory(c);
      return true;
    } catch { return false; }
  },

  getPreferences: (userId: string) => {
    const prefs = localStorage.getItem(`als_prefs_${userId}`);
    return prefs ? JSON.parse(prefs) : { visibleColumns: {} };
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const prefs = db.getPreferences(userId);
    prefs.visibleColumns[componentId] = columns;
    localStorage.setItem(`als_prefs_${userId}`, JSON.stringify(prefs));
  },

  purgeLocalCache: () => {
    offlineManager.clearAllCache();
    window.location.reload();
  }
};
