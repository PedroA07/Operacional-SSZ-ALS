
import { createClient } from '@supabase/supabase-js';
import { Driver, Customer, Port, PreStacking, Staff, User, Trip, Category, Notification, NotificationType } from '../types';
import { driverRepository } from './driverRepository';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

export const KEYS = {
  DRIVERS: 'als_drivers',
  CUSTOMERS: 'als_customers',
  PORTS: 'als_ports',
  PRE_STACKING: 'als_pre_stacking',
  STAFF: 'als_staff',
  USERS: 'als_users',
  TRIPS: 'als_trips',
  CATEGORIES: 'als_categories',
  PREFERENCES: 'als_ui_preferences',
  NOTIFICATIONS: 'als_notifications'
};

export const db = {
  _saveLocal: (key: string, data: any) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.warn(`Quota local excedida`); }
  },
  _getLocal: (key: string) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  },
  
  getNotifications: async (): Promise<Notification[]> => {
    if (supabase) {
      try {
        const { data } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50);
        if (data) {
          const mapped = data.map(n => ({
            id: n.id,
            title: n.title,
            description: n.description,
            type: n.type as any,
            authorName: n.author_name,
            authorId: n.author_id,
            timestamp: n.timestamp,
            summary: n.summary
          }));
          db._saveLocal(KEYS.NOTIFICATIONS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return db._getLocal(KEYS.NOTIFICATIONS);
  },

  addNotification: async (
    user: User, 
    type: NotificationType, 
    title: string, 
    description: string, 
    summary?: Notification['summary']
  ) => {
    const authorName = user.displayName || user.username || 'Sistema';
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title,
      description,
      type,
      authorName: authorName,
      authorId: user.id || 'system',
      timestamp: new Date().toISOString(),
      summary
    };

    if (supabase) {
      try {
        await supabase.from('notifications').insert({
          title: newNotif.title,
          description: newNotif.description,
          type: newNotif.type,
          author_name: authorName,
          author_id: user.id,
          summary: newNotif.summary
        });
      } catch (e) {
        console.error("Erro ao salvar notificação no banco:", e);
      }
    }

    const current = db._getLocal(KEYS.NOTIFICATIONS);
    db._saveLocal(KEYS.NOTIFICATIONS, [newNotif, ...current].slice(0, 50));
    window.dispatchEvent(new CustomEvent('als_new_notification_event', { detail: newNotif }));
  },

  getUsers: async (): Promise<User[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          const mapped = data.map(u => ({
            id: u.id, username: u.username, password: u.password,
            displayName: u.display_name || u.username, role: u.role,
            lastLogin: u.lastlogin || new Date().toISOString(), photo: u.photo,
            position: u.position, staffId: u.staff_id, driverId: u.driver_id,
            status: u.status, isFirstLogin: u.isfirstlogin === true,
            lastSeen: u.last_seen, isOnlineVisible: u.is_online_visible ?? true,
            notificationPrefs: u.notification_prefs || { newTrip: true, statusUpdate: true, paymentLiberated: true, systemChanges: true, newRegistrations: true }
          }));
          db._saveLocal(KEYS.USERS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return db._getLocal(KEYS.USERS);
  },

  saveUser: async (user: User) => {
    const payload = {
      id: user.id, username: user.username, password: user.password,
      display_name: user.displayName, role: user.role, lastlogin: user.lastLogin,
      photo: user.photo, position: user.position, staff_id: user.staffId,
      driver_id: user.driverId, status: user.status, isfirstlogin: user.isFirstLogin === true,
      last_seen: user.lastSeen, is_online_visible: user.isOnlineVisible ?? true,
      notification_prefs: user.notificationPrefs
    };
    if (supabase) { try { await supabase.from('users').upsert(payload); } catch (e) {} }
    const current = db._getLocal(KEYS.USERS);
    const idx = current.findIndex((u: any) => u.id === user.id);
    if (idx >= 0) current[idx] = user; else current.push(user);
    db._saveLocal(KEYS.USERS, current);
    return true;
  },

  getTrips: async (): Promise<Trip[]> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('trips').select('*').order('date_time', { ascending: false });
        if (!error && data) {
          const mapped = data.map(mapDbToTrip);
          db._saveLocal(KEYS.TRIPS, mapped);
          return mapped;
        }
      } catch (e) {}
    }
    return db._getLocal(KEYS.TRIPS);
  },

  saveTrip: async (trip: Trip, actingUser?: User) => {
    const oldTrip = db._getLocal(KEYS.TRIPS).find((t: any) => t.id === trip.id);

    if (supabase) {
      try {
        await supabase.from('trips').upsert(mapTripToDb(trip));
      } catch (e) {}
    }
    
    const current = db._getLocal(KEYS.TRIPS);
    const idx = current.findIndex((t: Trip) => t.id === trip.id);
    if (idx >= 0) current[idx] = trip; else current.push(trip);
    db._saveLocal(KEYS.TRIPS, current);

    if (actingUser) {
      const summary = { os: trip.os, motorista: trip.driver.name, placa: trip.driver.plateHorse };
      
      // Notificação de Status
      if (oldTrip && oldTrip.status !== trip.status) {
        await db.addNotification(actingUser, 'STATUS_UPDATED', `Status Alterado: ${trip.os}`, `Viagem movida para "${trip.status}"`, summary);
      }
      
      // Notificação de Anexos (Dossiê)
      if (oldTrip) {
        if (!oldTrip.osDoc && trip.osDoc) await db.addNotification(actingUser, 'SYSTEM', `OS Anexada: ${trip.os}`, `O arquivo PDF da Ordem de Serviço foi vinculado.`, summary);
        if (!oldTrip.agendamentoDoc && trip.agendamentoDoc) await db.addNotification(actingUser, 'SYSTEM', `Agendamento Vinculado: ${trip.os}`, `O comprovante de agendamento foi anexado.`, summary);
        if (!oldTrip.completoDoc && trip.completoDoc) await db.addNotification(actingUser, 'SYSTEM', `Dossiê Finalizado: ${trip.os}`, `O documento completo da viagem foi anexado para faturamento.`, summary);
      } else {
        // Nova Viagem Criada Manualmente
        await db.addNotification(actingUser, 'TRIP_CREATED', `Nova OS no Painel: ${trip.os}`, `Uma nova programação foi registrada manualmente.`, summary);
      }
    }
    return true;
  },

  saveDriver: async (driver: Driver, actingUser?: User) => {
    const isNew = !db._getLocal(KEYS.DRIVERS).some((d: any) => d.id === driver.id);
    if (supabase) { await driverRepository.save(supabase, driver); }
    const current = db._getLocal(KEYS.DRIVERS);
    const idx = current.findIndex((d: any) => d.id === driver.id);
    if (idx >= 0) current[idx] = driver; else current.push(driver);
    db._saveLocal(KEYS.DRIVERS, current);
    
    if (actingUser) {
      await db.addNotification(actingUser, 'SYSTEM', isNew ? 'Novo Motorista' : 'Cadastro Atualizado', `O motorista ${driver.name} foi ${isNew ? 'cadastrado' : 'atualizado'} no sistema.`, { motorista: driver.name, placa: driver.plateHorse });
    }
    return true;
  },

  saveCustomer: async (customer: Customer, actingUser?: User) => {
    const isNew = !db._getLocal(KEYS.CUSTOMERS).some((c: any) => c.id === customer.id);
    if (supabase) { 
      const payload = { ...customer, legal_name: customer.legalName };
      delete (payload as any).legalName;
      await supabase.from('customers').upsert(payload);
    }
    const current = db._getLocal(KEYS.CUSTOMERS);
    const idx = current.findIndex((c: any) => c.id === customer.id);
    if (idx >= 0) current[idx] = customer; else current.push(customer);
    db._saveLocal(KEYS.CUSTOMERS, current);
    
    if (actingUser) {
      await db.addNotification(actingUser, 'SYSTEM', isNew ? 'Novo Cliente' : 'Cliente Atualizado', `A empresa ${customer.legalName || customer.name} teve seus dados salvos.`, { cliente: customer.name });
    }
    return true;
  },

  savePort: async (port: Port, actingUser?: User) => {
    if (supabase) { 
      const payload = { ...port, legal_name: port.legalName };
      delete (payload as any).legalName;
      await supabase.from('ports').upsert(payload);
    }
    const current = db._getLocal(KEYS.PORTS);
    const idx = current.findIndex((p: any) => p.id === port.id);
    if (idx >= 0) current[idx] = port; else current.push(port);
    db._saveLocal(KEYS.PORTS, current);
    if (actingUser) await db.addNotification(actingUser, 'SYSTEM', 'Porto/Local Salvo', `Localidade ${port.name} atualizada.`, { cliente: port.name });
    return true;
  },

  savePreStacking: async (ps: PreStacking, actingUser?: User) => {
    if (supabase) { 
      const payload = { ...ps, legal_name: ps.legalName };
      delete (payload as any).legalName;
      await supabase.from('pre_stacking').upsert(payload);
    }
    const current = db._getLocal(KEYS.PRE_STACKING);
    const idx = current.findIndex((p: any) => p.id === ps.id);
    if (idx >= 0) current[idx] = ps; else current.push(ps);
    db._saveLocal(KEYS.PRE_STACKING, current);
    if (actingUser) await db.addNotification(actingUser, 'SYSTEM', 'Unidade Pré-Stacking', `Terminal ${ps.name} atualizado.`, { cliente: ps.name });
    return true;
  },

  deleteTrip: async (id: string, actingUser?: User) => {
    const trip = db._getLocal(KEYS.TRIPS).find((t: any) => t.id === id);
    if (supabase) { await supabase.from('trips').delete().eq('id', id); }
    db._saveLocal(KEYS.TRIPS, db._getLocal(KEYS.TRIPS).filter((t: any) => t.id !== id));
    if (actingUser && trip) {
      await db.addNotification(actingUser, 'DELETED', `OS Removida: ${trip.os}`, `A programação da OS ${trip.os} foi excluída permanentemente.`, { os: trip.os });
    }
    return true;
  },

  getDrivers: async (): Promise<Driver[]> => {
    if (supabase) { try { const d = await driverRepository.getAll(supabase); db._saveLocal(KEYS.DRIVERS, d); return d; } catch (e) {} }
    return db._getLocal(KEYS.DRIVERS);
  },

  deleteDriver: async (id: string) => {
    if (supabase) { try { await driverRepository.delete(supabase, id); } catch (e) {} }
    db._saveLocal(KEYS.DRIVERS, db._getLocal(KEYS.DRIVERS).filter((d: any) => d.id !== id));
    return true;
  },

  getCustomers: async (): Promise<Customer[]> => {
    if (supabase) { try { const { data } = await supabase.from('customers').select('*'); if (data) { db._saveLocal(KEYS.CUSTOMERS, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.CUSTOMERS);
  },

  deleteCustomer: async (id: string) => {
    if (supabase) { await supabase.from('customers').delete().eq('id', id); }
    db._saveLocal(KEYS.CUSTOMERS, db._getLocal(KEYS.CUSTOMERS).filter((c: any) => c.id !== id));
    return true;
  },

  getPorts: async (): Promise<Port[]> => {
    if (supabase) { try { const { data } = await supabase.from('ports').select('*'); if (data) { const mapped = data.map(d => ({ ...d, legalName: d.legal_name })) as Port[]; db._saveLocal(KEYS.PORTS, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.PORTS);
  },

  deletePort: async (id: string) => {
    if (supabase) { await supabase.from('ports').delete().eq('id', id); }
    db._saveLocal(KEYS.PORTS, db._getLocal(KEYS.PORTS).filter((p: any) => p.id !== id));
    return true;
  },

  getStaff: async (): Promise<Staff[]> => {
    if (supabase) { try { const { data } = await supabase.from('staff').select('*'); if (data) { const mapped = data.map(s => ({ ...s, registrationDate: s.registration_date, statusSince: s.status_since, emailCorp: s.emailcorp, phoneCorp: s.phonecorp })); db._saveLocal(KEYS.STAFF, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.STAFF);
  },

  saveStaff: async (staff: Staff, password?: string) => {
    if (supabase) { 
      const payload = { ...staff, registration_date: staff.registrationDate, status_since: staff.statusSince, emailcorp: staff.emailCorp, phonecorp: staff.phoneCorp };
      await supabase.from('staff').upsert(payload); 
    }
    const current = db._getLocal(KEYS.STAFF);
    const idx = current.findIndex((s: any) => s.id === staff.id);
    if (idx >= 0) current[idx] = staff; else current.push(staff);
    db._saveLocal(KEYS.STAFF, current);
    return true;
  },

  deleteStaff: async (id: string) => {
    if (supabase) { await supabase.from('staff').delete().eq('id', id); }
    db._saveLocal(KEYS.STAFF, db._getLocal(KEYS.STAFF).filter((s: any) => s.id !== id));
    return true;
  },

  getCategories: async (): Promise<Category[]> => {
    if (supabase) { try { const { data } = await supabase.from('categories').select('*'); if (data) { db._saveLocal(KEYS.CATEGORIES, data); return data; } } catch (e) {} }
    return db._getLocal(KEYS.CATEGORIES);
  },

  saveCategory: async (category: Partial<Category>, actingUser?: User) => {
    if (supabase) { await supabase.from('categories').upsert(category); }
    const current = db._getLocal(KEYS.CATEGORIES);
    const idx = current.findIndex((c: any) => c.id === category.id);
    if (idx >= 0) current[idx] = category as any; else current.push(category as any);
    db._saveLocal(KEYS.CATEGORIES, current);
    if (actingUser) { await db.addNotification(actingUser, 'SYSTEM', `Nova Categoria`, `Categoria "${category.name}" adicionada ao sistema.`); }
    return true;
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (supabase) { try { const { data } = await supabase.from('pre_stacking').select('*'); if (data) { const mapped = data.map(d => ({ ...d, legalName: d.legal_name })); db._saveLocal(KEYS.PRE_STACKING, mapped); return mapped; } } catch (e) {} }
    return db._getLocal(KEYS.PRE_STACKING);
  },

  deletePreStacking: async (id: string) => {
    if (supabase) { await supabase.from('pre_stacking').delete().eq('id', id); }
    db._saveLocal(KEYS.PRE_STACKING, db._getLocal(KEYS.PRE_STACKING).filter((p: any) => p.id !== id));
    return true;
  },

  getPreferences: (userId: string) => {
    const allPrefs = JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || '{}');
    return allPrefs[userId] || { visibleColumns: {} };
  },
  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const allPrefs = JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || '{}');
    if (!allPrefs[userId]) allPrefs[userId] = { visibleColumns: {} };
    allPrefs[userId].visibleColumns[componentId] = columns;
    localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(allPrefs));
  },
  exportBackup: async () => {
    const backup: any = {};
    for (const key of Object.values(KEYS)) backup[key] = localStorage.getItem(key);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ALS_BACKUP_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
  },
  importBackup: async (file: File) => {
    try {
      const text = await file.text(); const backup = JSON.parse(text);
      for (const [key, value] of Object.entries(backup)) { if (value) localStorage.setItem(key, value as string); }
      return true;
    } catch (e) { return false; }
  },
  updatePresence: async (userId: string, isVisible: boolean) => {
    if (supabase) { try { await supabase.from('users').update({ last_seen: new Date().toISOString(), is_online_visible: isVisible }).eq('id', userId); } catch (e) {} }
  },
  checkConnection: async (): Promise<boolean> => {
    if (!supabase) return false;
    try { const { error } = await supabase.from('users').select('count', { count: 'exact', head: true }).limit(1); return !error; } catch { return false; }
  }
};

const mapTripToDb = (trip: Trip) => ({
  id: trip.id, os: trip.os, booking: trip.booking, ship: trip.ship, date_time: trip.dateTime, is_late: trip.isLate,
  type: trip.type, container_type: trip.containerType || null, cva: trip.cva, container: trip.container, tara: trip.tara, seal: trip.seal,
  category: trip.category, sub_category: trip.subCategory, status: trip.status, customer: trip.customer, destination: trip.destination,
  driver: trip.driver, status_history: trip.statusHistory, advance_payment: trip.advancePayment, balance_payment: trip.balancePayment,
  os_doc: trip.osDoc || null, agendamento_doc: trip.agendamentoDoc || null, completo_doc: trip.completoDoc || null, cte_doc: trip.cteDoc || null,
  cva_doc: trip.cvaDoc || null, oc_form_data: trip.ocFormData, pre_stacking_form_data: trip.preStackingFormData || null, scheduling: trip.scheduling || null
});

const mapDbToTrip = (d: any): Trip => ({
  id: d.id, os: d.os, booking: d.booking, ship: d.ship, dateTime: d.date_time || d.dateTime, isLate: d.is_late ?? d.isLate ?? false,
  type: d.type, containerType: d.container_type || d.containerType, cva: d.cva, container: d.container, tara: d.tara, seal: d.seal,
  category: d.category, subCategory: d.sub_category || d.subCategory, status: d.status, customer: d.customer, destination: d.destination,
  driver: d.driver, statusHistory: d.status_history || d.statusHistory || [], advancePayment: d.advance_payment || d.advancePayment || { status: 'BLOQUEADO' },
  balancePayment: d.balance_payment || d.balancePayment || { status: 'AGUARDANDO_DOCS' }, osDoc: d.os_doc || d.osDoc,
  agendamentoDoc: d.agendamento_doc || d.agendamentoDoc, completoDoc: d.completo_doc || d.completoDoc, cteDoc: d.cte_doc || d.cteDoc,
  cvaDoc: d.cva_doc || d.cvaDoc, ocFormData: d.oc_form_data || d.ocFormData, preStackingFormData: d.pre_stacking_form_data || d.preStackingFormData,
  scheduling: d.scheduling || undefined
});
