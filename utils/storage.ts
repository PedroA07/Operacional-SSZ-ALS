import { createClient } from '@supabase/supabase-js';
import {
  User, Driver, Customer, Port, PreStacking, Staff, Trip, Category,
  Notification, AvantidaRecord, AvantidaPriceRule, SealBatch, SealRecord, StaySession,
  StayRecord, NotificationType, NotificationOrigin, PresenceStatus,
  LoginCredential, EmailTemplate, CustomStatus, Automation, HandoverPost, HandoverComment, DutySwapRequest
} from '../types';
import { driverRepository } from './driverRepository';
import { staffRepository } from './staffRepository';
import { tripRepository } from './tripRepository';

import { getEnv } from './env';

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('VITE_SUPABASE_ANON_KEY');

export const supabase = (SUPABASE_URL && SUPABASE_KEY) 
  ? createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;

export const db = {
  checkConnection: async () => {
    if (!supabase) return false;
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      return !error;
    } catch { return false; }
  },

  getUsers: async (): Promise<User[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    return (data || []).map(u => ({
      id: u.id,
      username: u.username || '',
      password: u.password,
      displayName: u.display_name || u.displayname || u.username || 'Usuário',
      role: u.role,
      lastLogin: u.lastlogin || u.lastLogin,
      photo: u.photo,
      position: u.position,
      driverId: u.driver_id || u.driverid,
      staffId: u.staff_id || u.staffid,
      status: u.status,
      isFirstLogin: u.isfirstlogin,
      lastSeen: u.last_seen || u.lastseen,
      presence_status: u.presence_status,
      thirdPartyConfig: u.config,
      notificationPrefs: u.notification_prefs || undefined,
    }));
  },

  saveUser: async (user: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      // trim() remove espaços acidentais no início e fim antes de salvar
      username: user.username?.trim(),
      password: user.password,
      display_name: user.displayName?.trim(),
      role: user.role,
      lastlogin: user.lastLogin,
      photo: user.photo,
      position: user.position?.trim(),
      driver_id: user.driverId,
      staff_id: user.staffId,
      status: user.status,
      isfirstlogin: user.isFirstLogin,
      last_seen: user.lastSeen,
      presence_status: user.presence_status,
      config: user.thirdPartyConfig,
      notification_prefs: user.notificationPrefs || null,
    });
    if (error) console.error('[saveUser] Erro:', error.message);
    return !error;
  },

  deleteUser: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('users').delete().eq('id', id);
    return !error;
  },

  changePassword: async (userId: string, newPassword: string) => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('users')
      .update({ password: newPassword, isfirstlogin: false })
      .eq('id', userId);
    return !error;
  },

  updatePresence: async (userId: string, status: PresenceStatus) => {
    if (!supabase) return false;
    const { error } = await supabase
      .from('users')
      .update({ presence_status: status, last_seen: new Date().toISOString() })
      .eq('id', userId);
    return !error;
  },

  getDrivers: () => driverRepository.getAll(supabase!),
  saveDriver: (d: Driver, user?: User) => driverRepository.save(supabase!, d),
  deleteDriver: (id: string) => driverRepository.delete(supabase!, id),

  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return (data || []).map(c => ({
      ...c,
      legalName: c.legal_name || c.legalName,
      zipCode: c.zip_code || c.zipCode,
      registrationDate: c.registration_date || c.registrationdate || c.registrationDate
    }));
  },

  saveCustomer: async (c: Partial<Customer>, user?: User) => {
    if (!supabase) {
      console.error("Supabase não inicializado. Verifique as variáveis de ambiente.");
      return false;
    }
    
    const payload: any = {
      id: c.id,
      name: c.name,
      address: c.address,
      neighborhood: c.neighborhood,
      city: c.city,
      state: c.state,
      cnpj: c.cnpj,
      operations: c.operations,
      legal_name: c.legalName,
      zip_code: c.zipCode,
      registrationDate: c.registrationDate
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    // Log removed
    const { error } = await supabase.from('customers').upsert(payload);
    if (error) {
      console.error("ERRO DETALHADO CLIENTE:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    return true;
  },

  deleteCustomer: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('customers').delete().eq('id', id);
    return !error;
  },

  getPorts: async (): Promise<Port[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('ports').select('*').order('name');
    if (error) throw error;
    
    if (data && data.length > 0) {
      // Schema discovery log removed
    }

    return (data || []).map(p => ({
      ...p,
      legalName: p.legal_name || p.legalName,
      zipCode: p.zip_code || p.zipCode,
      registrationDate: p.registration_date || p.registrationdate || p.registrationDate
    }));
  },

  savePort: async (p: Partial<Port>, user?: User) => {
    if (!supabase) {
      console.error("Supabase não inicializado.");
      return false;
    }
    
    const payload: any = {
      id: p.id,
      name: p.name,
      address: p.address,
      neighborhood: p.neighborhood,
      city: p.city,
      state: p.state,
      cnpj: p.cnpj,
      legal_name: p.legalName,
      zip_code: p.zipCode,
      registrationDate: p.registrationDate
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
    
    // Log removed
    const { error } = await supabase.from('ports').upsert(payload);
    if (error) {
      console.error("ERRO DETALHADO PORTO:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    return true;
  },

  deletePort: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('ports').delete().eq('id', id);
    return !error;
  },

  getPreStacking: async (): Promise<PreStacking[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('pre_stacking').select('*').order('name');
    if (error) throw error;

    if (data && data.length > 0) {
      // Schema discovery log removed
    }

    return (data || []).map(p => ({
      ...p,
      legalName: p.legal_name || p.legalName,
      zipCode: p.zip_code || p.zipCode,
      registrationDate: p.registration_date || p.registrationdate || p.registrationDate
    }));
  },

  savePreStacking: async (p: Partial<PreStacking>, user?: User) => {
    if (!supabase) {
      console.error("Supabase não inicializado.");
      return false;
    }
    
    const payload: any = {
      id: p.id,
      name: p.name,
      cnpj: p.cnpj,
      address: p.address,
      neighborhood: p.neighborhood,
      city: p.city,
      state: p.state,
      legal_name: p.legalName,
      zip_code: p.zipCode,
      registrationDate: p.registrationDate
    };

    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    // Log removed
    const { error } = await supabase.from('pre_stacking').upsert(payload);
    if (error) {
      console.error("ERRO DETALHADO UNIDADE:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    return true;
  },

  deletePreStacking: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('pre_stacking').delete().eq('id', id);
    return !error;
  },

  getStaff: () => staffRepository.getAll(supabase!),
  saveStaff: (s: Staff, password?: string) => staffRepository.save(supabase!, s, password),
  deleteStaff: (id: string) => staffRepository.delete(supabase!, id),

  getTrips: () => tripRepository.getAll(supabase!),
  saveTrip: (t: Trip, user?: User) => tripRepository.save(supabase!, t, user),
  deleteTrip: async (id: string, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trips').delete().eq('id', id);
    return !error;
  },

  subscribeToTrips: (callback: (trips: Trip[]) => void) => {
    if (!supabase) return () => {};
    
    const channel = supabase
      .channel('trips-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, async () => {
        const trips = await tripRepository.getAll(supabase!);
        callback(trips);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  },

  getCategories: async (): Promise<Category[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      parentId: c.parent_id,
      color: c.color,
      createdAt: c.created_at
    }));
  },

  saveCategory: async (c: Partial<Category>, user?: User) => {
    if (!supabase) return false;
    
    // Tentativa inicial com a coluna color
    const { error } = await supabase.from('categories').upsert({
      id: c.id,
      name: c.name,
      parent_id: c.parentId,
      color: c.color,
      created_at: new Date().toISOString()
    });

    if (error) {
      // Se o erro for de coluna inexistente (PGRST204), tenta salvar sem a cor
      if (error.code === 'PGRST204' || error.message.includes('color')) {
        console.warn('Coluna "color" não encontrada na tabela "categories". Tentando salvar sem cor...');
        const { error: retryError } = await supabase.from('categories').upsert({
          id: c.id,
          name: c.name,
          parent_id: c.parentId,
          created_at: new Date().toISOString()
        });
        
        if (retryError) {
          console.error('Error saving category (retry):', retryError);
          return false;
        }
        return true;
      }
      
      console.error('Error saving category:', error);
      return false;
    }
    return true;
  },

  getContainerTypes: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('container_types').select('*').order('name');
    if (error) return [];
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      createdAt: c.created_at
    }));
  },

  saveContainerType: async (c: any) => {
    if (!supabase) return false;
    const { error } = await supabase.from('container_types').upsert({
      id: c.id,
      name: c.name,
      created_at: c.createdAt || new Date().toISOString()
    });
    return !error;
  },

  deleteContainerType: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('container_types').delete().eq('id', id);
    return !error;
  },

  getColetaTiposViagem: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('coleta_tipos_viagem').select('*').order('name');
    if (error) return [];
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      createdAt: c.created_at
    }));
  },

  saveColetaTipoViagem: async (c: any) => {
    if (!supabase) return false;
    const payload: any = {
      name: c.name,
      color: c.color,
      created_at: c.createdAt || new Date().toISOString()
    };
    
    let error;
    if (c.id) {
      const { error: updateError } = await supabase.from('coleta_tipos_viagem').update(payload).eq('id', c.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('coleta_tipos_viagem').insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("ERRO DETALHADO COLETA TIPO VIAGEM:", error);
      return false;
    }
    return true;
  },

  deleteColetaTipoViagem: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('coleta_tipos_viagem').delete().eq('id', id);
    return !error;
  },

  getOperationTypes: async (): Promise<any[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('operation_types').select('*').order('name');
    if (error) return [];
    return (data || []).map(c => ({
      id: c.id,
      name: c.name,
      color: c.color,
      createdAt: c.created_at
    }));
  },

  saveOperationType: async (c: any) => {
    if (!supabase) return false;
    const payload: any = {
      name: c.name,
      color: c.color,
      created_at: c.createdAt || new Date().toISOString()
    };
    
    let error;
    if (c.id) {
      const { error: updateError } = await supabase.from('operation_types').update(payload).eq('id', c.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('operation_types').insert(payload);
      error = insertError;
    }

    if (error) {
      console.error("ERRO DETALHADO TIPO OPERACAO:", error);
      return false;
    }
    return true;
  },

  deleteOperationType: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('operation_types').delete().eq('id', id);
    return !error;
  },

  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .gte('timestamp', cutoff)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map(n => ({
      id: String(n.id),
      title: n.title,
      description: n.message || n.description,
      type: n.type,
      origin: n.origin,
      authorName: n.user_name || n.authorName,
      authorId: n.user_id || n.authorId,
      timestamp: n.timestamp,
      summary: n.summary || { os: n.os_ref }
    }));
  },

  addNotification: async (user: User, type: NotificationType, title: string, description: string, summary?: any) => {
    if (!supabase) return false;
    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      user_name: user.displayName,
      type, title,
      message: description,
      origin: (user.role === 'driver' || user.role === 'motoboy') ? 'MOTORISTA' : 'OPERACIONAL',
      timestamp: new Date().toISOString(),
      summary: summary,
      os_ref: summary?.os
    });
    return !error;
  },

  saveFormHistory: async (formType: string, formData: any, label: string, user: any) => {
    if (!supabase) return false;
    const { error } = await supabase.from('form_history').insert({
      form_type: formType,
      form_data: formData,
      label,
      user_name: user?.displayName || 'Sistema',
      user_id: user?.id || null,
    });
    if (error) console.error('[saveFormHistory] Erro ao salvar histórico:', error.message, error);
    return !error;
  },

  getFormHistory: async (formType: string, limit = 8) => {
    if (!supabase) return [];
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('form_history')
      .select('*')
      .eq('form_type', formType)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('[getFormHistory] Erro ao buscar histórico:', error.message, error);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      formType: r.form_type,
      formData: r.form_data,
      label: r.label || '',
      userName: r.user_name || '',
      userId: r.user_id || '',
      createdAt: r.created_at,
    }));
  },

  // Remove registros com mais de 90 dias de form_history e notifications.
  // Chamado silenciosamente na inicialização da sessão.
  purgeOldHistory: async () => {
    if (!supabase) return;
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('form_history').delete().lt('created_at', cutoff);
    await supabase.from('notifications').delete().lt('timestamp', cutoff);
  },

  getAvantidaRecords: async (): Promise<AvantidaRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('avantida_records').select('*').order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(a => ({
      id: a.id,
      date: a.date,
      containerNumber: a.container_number,
      exportRef: a.export_ref,
      requestedPrice: Number(a.requested_price || 0),
      customerRef: a.customer_ref,
      tripSettlement: a.trip_settlement,
      verified: a.verified,
      driverId: a.driver_id,
      createdAt: a.created_at,
      shippingLine: a.shipping_line || '',
      importLocation: a.import_location || '',
      reuseDate: a.reuse_date || '',
      status: a.status || 'EM ANÁLISE'
    }));
  },

  saveAvantidaRecord: async (record: Partial<AvantidaRecord>) => {
    if (!supabase) return false;
    
    const payload: any = {
      date: record.date || new Date().toISOString().split('T')[0],
      container_number: record.containerNumber,
      export_ref: record.exportRef || null,
      requested_price: record.requestedPrice || 0,
      customer_ref: record.customerRef || null,
      trip_settlement: record.tripSettlement || null,
      verified: record.verified || false,
      driver_id: record.driverId || null,
      shipping_line: record.shippingLine || null,
      import_location: record.importLocation || null,
      reuse_date: (record.reuseDate && String(record.reuseDate).trim() !== "") ? record.reuseDate : null,
      status: record.status || 'EM ANÁLISE'
    };

    if (record.id && !record.id.startsWith('new-')) {
      payload.id = record.id;
    }

    const { error } = await supabase.from('avantida_records').upsert(payload);
    return !error;
  },

  deleteAvantidaRecord: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('avantida_records').delete().eq('id', id);
    return !error;
  },

  getAvantidaPrices: async (): Promise<AvantidaPriceRule[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('avantida_prices').select('*').order('shipping_line');
    if (error) return [];
    return (data || []).map(p => ({
      id: p.id,
      shippingLine: p.shipping_line,
      price: Number(p.price || 0),
      updatedAt: p.updated_at
    }));
  },

  saveAvantidaPrice: async (rule: Partial<AvantidaPriceRule>) => {
    if (!supabase) return false;
    const payload = {
      id: rule.id || `prc-${Date.now()}`,
      shipping_line: rule.shippingLine?.toUpperCase(),
      price: Number(rule.price || 0),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('avantida_prices').upsert(payload);
    return !error;
  },

  deleteAvantidaPrice: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('avantida_prices').delete().eq('id', id);
    return !error;
  },

  getLogins: async (): Promise<LoginCredential[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('logins').select('*').order('sitename');
    if (error) throw error;
    return (data || []).map(l => ({
      id: l.id,
      siteName: l.sitename,
      url: l.url,
      username: l.username,
      password: l.password,
      additionalFields: l.additionalfields || [],
      createdAt: l.createdat
    }));
  },

  saveLogin: async (l: LoginCredential) => {
    if (!supabase) return false;
    
    const payload: any = {
      sitename: l.siteName,
      url: l.url,
      username: l.username,
      password: l.password,
      additionalfields: l.additionalFields || [],
      createdat: l.createdAt || new Date().toISOString()
    };

    if (l.id && !l.id.startsWith('new-')) {
      payload.id = l.id;
    }

    const { error } = await supabase.from('logins').upsert(payload);
    return !error;
  },

  deleteLogin: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('logins').delete().eq('id', id);
    return !error;
  },

  getSealBatches: async (): Promise<SealBatch[]> => {
    if (!supabase) return [];
    // Busca todos os lotes ordenados pelo mais recente
    const { data, error } = await supabase.from('seal_batches').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error("Erro getSealBatches:", error);
      return [];
    }
    return (data || []).map(b => ({
      id: b.id,
      carrier: b.carrier,
      startNumber: b.start_number,
      endNumber: b.end_number,
      createdAt: b.created_at
    }));
  },

  getSealRecords: async (batchId: string): Promise<SealRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('seal_records').select('*').eq('batch_id', batchId).order('seal_number');
    if (error) throw error;
    return (data || []).map(r => ({
      id: String(r.id),
      batchId: r.batch_id,
      sealNumber: r.seal_number,
      containerNumber: r.container_number,
      booking: r.booking,
      reuseDate: r.reuse_date || '',
      driverName: r.driver_name
    }));
  },

  saveSealBatch: async (batch: SealBatch, records: Partial<SealRecord>[]) => {
    if (!supabase) return { success: false, message: 'Supabase não configurado.' };
    
    // SEMPRE gera um ID único para novos lotes para evitar sobrescrita acidental
    const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // 1. Grava o cabeçalho do lote (UPSERT garantindo ID novo)
    const { error: batchErr } = await supabase.from('seal_batches').insert({
      id: batchId,
      carrier: batch.carrier,
      start_number: batch.startNumber,
      end_number: batch.endNumber,
      created_at: new Date().toISOString()
    });
    
    if (batchErr) {
      console.error("Erro seal_batches:", batchErr);
      return { success: false, message: batchErr.message };
    }

    // 2. Prepara e grava os lacres individuais vinculados ao NOVO batchId
    const recordsToInsert = records.map(r => ({
      batch_id: batchId,
      seal_number: r.sealNumber,
      container_number: r.containerNumber || null,
      booking: r.booking || null,
      reuse_date: (r.reuseDate && String(r.reuseDate).trim() !== "") ? r.reuseDate : null,
      driver_name: r.driverName || null
    }));

    const { error: recErr } = await supabase.from('seal_records').insert(recordsToInsert);
    if (recErr) {
      console.error("Erro seal_records:", recErr);
      // Rollback se falhar a inserção dos itens
      await supabase.from('seal_batches').delete().eq('id', batchId);
      return { success: false, message: recErr.message };
    }

    return { success: true };
  },

  updateSealRecord: async (record: SealRecord) => {
    if (!supabase) return false;
    const { error } = await supabase.from('seal_records').update({
      container_number: record.containerNumber || null,
      booking: record.booking || null,
      reuse_date: (record.reuseDate && String(record.reuseDate).trim() !== "") ? record.reuseDate : null,
      driver_name: record.driverName || null
    }).eq('id', record.id);
    return !error;
  },

  deleteSealBatch: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('seal_batches').delete().eq('id', id);
    return !error;
  },

  getStaySessions: async (): Promise<StaySession[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('stay_sessions').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((s: any) => ({
      id: s.id,
      category: s.category,
      startDate: s.start_date,
      endDate: s.end_date,
      createdAt: s.created_at,
      createdBy: s.created_by,
      gracePeriodHours: s.grace_period_hours,
      roundUpMinutes: s.round_up_minutes,
      costPerHour: s.cost_per_hour,
      customColumns: s.custom_columns,
      useCustomColumns: s.use_custom_columns
    }));
  },

  getStayRecords: async (sessionId: string): Promise<StayRecord[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('stay_records')
      .select('*')
      .eq('session_id', sessionId)
      .order('os');
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      type: r.type,
      os: r.os,
      location: r.location,
      driverName: r.driver_name,
      ship: r.ship,
      container: r.container,
      scheduledStart: r.scheduled_start,
      arrivalTime: r.arrival_time,
      departureTime: r.departure_time,
      exceededHours: r.exceeded_hours,
      observations: r.observations,
      customValues: r.custom_values
    }));
  },

  saveStaySession: async (s: StaySession) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_sessions').upsert({
      id: s.id,
      category: s.category,
      start_date: s.startDate,
      end_date: s.endDate,
      created_at: s.createdAt,
      created_by: s.createdBy,
      grace_period_hours: s.gracePeriodHours,
      round_up_minutes: s.roundUpMinutes,
      cost_per_hour: s.costPerHour,
      custom_columns: s.customColumns,
      use_custom_columns: s.useCustomColumns
    });
    return !error;
  },

  saveStayRecords: async (records: StayRecord[]) => {
    if (!supabase) return false;
    const payload = records.map(r => ({
      id: r.id,
      session_id: r.sessionId,
      type: r.type,
      os: r.os,
      location: r.location,
      driver_name: r.driverName,
      ship: r.ship,
      container: r.container,
      scheduled_start: (!r.scheduledStart || r.scheduledStart === '---') ? null : r.scheduledStart,
      arrival_time: (!r.arrivalTime || r.arrivalTime === '---') ? null : r.arrivalTime,
      departure_time: (!r.departureTime || r.departureTime === '---') ? null : r.departureTime,
      exceeded_hours: r.exceededHours,
      observations: r.observations,
      custom_values: r.customValues || {}
    }));
    const { error } = await supabase.from('stay_records').upsert(payload);
    if (error) console.error("Error saving stay records:", error);
    return !error;
  },

  deleteStaySession: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_sessions').delete().eq('id', id);
    return !error;
  },

  deleteStayRecord: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('stay_records').delete().eq('id', id);
    return !error;
  },

  getEmailTemplates: async (): Promise<EmailTemplate[]> => {
    if (!supabase) return [];
    const { data } = await supabase.from('email_templates').select('*').order('name');
    return (data || []).map(t => ({
      id: t.id,
      name: t.name,
      to: t.to,
      cc: t.cc,
      subject: t.subject,
      body: t.body,
      config: t.config,
      createdAt: t.created_at,
      updatedAt: t.updated_at
    }));
  },

  saveEmailTemplate: async (template: EmailTemplate, user?: User) => {
    if (!supabase) return false;
    const { error } = await supabase.from('email_templates').upsert({
      id: template.id,
      name: template.name,
      to: template.to,
      cc: template.cc,
      subject: template.subject,
      body: template.body,
      config: template.config,
      created_at: template.createdAt,
      updated_at: template.updatedAt
    });
    if (!error && user) {
      await db.addNotification(
        user,
        template.createdAt === template.updatedAt ? 'EMAIL_TEMPLATE_CREATED' : 'EMAIL_TEMPLATE_UPDATED',
        `Modelo de E-mail: ${template.name}`,
        `O modelo de e-mail "${template.name}" foi salvo por ${user.displayName}.`
      );
    }
    return !error;
  },

  deleteEmailTemplate: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('email_templates').delete().eq('id', id);
    return !error;
  },

  getCustomStatuses: async (): Promise<CustomStatus[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('trip_statuses').select('*').order('order_index');
    if (error) {
      console.error('Erro ao buscar status:', error);
      return [];
    }
    return (data || []).map(s => ({
      id: s.id,
      name: s.name,
      customerId: s.customer_id,
      modality: s.modality,
      destinationId: s.destination_id,
      orderIndex: s.order_index,
      color: s.color,
      isFinal: s.is_final,
      operationalOnly: s.operational_only || false,
    }));
  },

  saveCustomStatus: async (status: CustomStatus) => {
    if (!supabase) return { success: false, error: 'Supabase não inicializado' };
    const { error } = await supabase.from('trip_statuses').upsert({
      id: status.id,
      name: status.name,
      customer_id: status.customerId || null,
      modality: status.modality || null,
      destination_id: status.destinationId || null,
      order_index: status.orderIndex,
      color: status.color || null,
      is_final: status.isFinal || false,
      operational_only: status.operationalOnly || false,
    });
    if (error) {
      console.error('Erro ao salvar status customizado:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  deleteCustomStatus: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('trip_statuses').delete().eq('id', id);
    return !error;
  },

  getAutomations: async (): Promise<Automation[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('automations').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao buscar automações:', error);
      return [];
    }
    return (data || []).map(a => ({
      id: a.id,
      status: a.status,
      emailTemplateId: a.email_template_id,
      whatsappGroupId: a.whatsapp_group_id,
      isActive: a.is_active,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));
  },

  saveAutomation: async (automation: Partial<Automation>) => {
    if (!supabase) return { success: false, error: 'Supabase não inicializado' };
    
    const payload: any = {
      status: automation.status,
      email_template_id: automation.emailTemplateId || null,
      whatsapp_group_id: automation.whatsappGroupId || null,
      is_active: automation.isActive !== undefined ? automation.isActive : true,
      updated_at: new Date().toISOString()
    };

    if (automation.id && !automation.id.startsWith('new-')) {
      payload.id = automation.id;
    } else {
      payload.created_at = new Date().toISOString();
    }

    const { error } = await supabase.from('automations').upsert(payload);
    if (error) {
      console.error('Erro ao salvar automação:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  deleteAutomation: async (id: string) => {
    if (!supabase) return false;
    const { error } = await supabase.from('automations').delete().eq('id', id);
    return !error;
  },

  exportBackup: async () => {
    if (!supabase) return;
    const tables = ['users', 'drivers', 'customers', 'ports', 'pre_stacking', 'staff', 'trips', 'categories', 'notifications', 'avantida_records', 'avantida_prices', 'logins', 'seal_batches', 'seal_records', 'stay_sessions', 'stay_records', 'email_templates', 'trip_statuses', 'automations'];
    const backup: any = {};
    for (const table of tables) {
      const { data } = await supabase.from(table).select('*');
      backup[table] = data;
    }
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `als_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importBackup: async (file: File) => {
    if (!supabase) return false;
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      for (const table in backup) {
        if (backup[table] && Array.isArray(backup[table])) {
          await supabase.from(table).upsert(backup[table]);
        }
      }
      return true;
    } catch { return false; }
  },

  getPreferences: (userId: string) => {
    try {
      const prefs = localStorage.getItem(`als_prefs_${userId}`);
      return prefs ? JSON.parse(prefs) : { visibleColumns: {} };
    } catch { return { visibleColumns: {} }; }
  },

  savePreference: (userId: string, componentId: string, columns: string[]) => {
    const prefs = db.getPreferences(userId);
    if (!prefs.visibleColumns) prefs.visibleColumns = {};
    prefs.visibleColumns[componentId] = columns;
    localStorage.setItem(`als_prefs_${userId}`, JSON.stringify(prefs));
  },

  // Passagem de Serviço
  getHandoverPosts: async (): Promise<HandoverPost[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('handover_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) { console.error('[getHandoverPosts]', error.message); return []; }
    return (data || []).map(p => ({
      id: String(p.id),
      content: p.content || '',
      authorId: p.author_id || '',
      authorName: p.author_name || '',
      authorPhoto: p.author_photo,
      authorRole: p.author_role,
      mentions: p.mentions || [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  },

  saveHandoverPost: async (post: Omit<HandoverPost, 'id' | 'createdAt'>): Promise<string | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('handover_posts').insert({
      content: post.content,
      author_id: post.authorId,
      author_name: post.authorName,
      author_photo: post.authorPhoto,
      author_role: post.authorRole,
      mentions: post.mentions,
    }).select('id').single();
    if (error) { console.error('[saveHandoverPost]', error.message); return null; }
    return String(data?.id);
  },

  deleteHandoverPost: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_posts').delete().eq('id', id);
    if (error) { console.error('[deleteHandoverPost]', error.message); return false; }
    return true;
  },

  updateHandoverPost: async (id: string, content: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_posts')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('[updateHandoverPost]', error.message); return false; }
    return true;
  },

  getHandoverComments: async (postId: string): Promise<HandoverComment[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('handover_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (error) { console.error('[getHandoverComments]', error.message); return []; }
    return (data || []).map(c => ({
      id: String(c.id),
      postId: c.post_id,
      content: c.content || '',
      authorId: c.author_id || '',
      authorName: c.author_name || '',
      authorPhoto: c.author_photo,
      authorRole: c.author_role,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
  },

  saveHandoverComment: async (comment: Omit<HandoverComment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase.from('handover_comments').insert({
      post_id: comment.postId,
      content: comment.content,
      author_id: comment.authorId,
      author_name: comment.authorName,
      author_photo: comment.authorPhoto,
      author_role: comment.authorRole,
    }).select('id').single();
    if (error) { console.error('[saveHandoverComment]', error.message); return null; }
    return String(data?.id);
  },

  updateHandoverComment: async (id: string, content: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { console.error('[updateHandoverComment]', error.message); return false; }
    return true;
  },

  deleteHandoverComment: async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('handover_comments').delete().eq('id', id);
    if (error) { console.error('[deleteHandoverComment]', error.message); return false; }
    return true;
  },

  getHandoverEditWindow: async (): Promise<number> => {
    if (!supabase) return 30;
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'handover_edit_window')
      .maybeSingle();
    if (error) { console.error('[getHandoverEditWindow]', error.message); return 30; }
    if (data?.value === null || data?.value === undefined) return 30;
    return Number(data.value);
  },

  saveHandoverEditWindow: async (minutes: number): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('system_settings').upsert(
      { key: 'handover_edit_window', value: minutes, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) console.error('[saveHandoverEditWindow]', error.message);
  },

  // ── Escala de Plantão ──────────────────────────────────────────────────────

  getDutyRoster: async (): Promise<string[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'duty_roster')
      .maybeSingle();
    if (error) { console.error('[getDutyRoster]', error.message); return []; }
    return (data?.value as string[]) || [];
  },

  saveDutyRoster: async (roster: string[]): Promise<boolean> => {
    if (!supabase) return false;
    const { error } = await supabase.from('system_settings').upsert(
      { key: 'duty_roster', value: roster, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
    if (error) { console.error('[saveDutyRoster]', error.message); return false; }
    return true;
  },

  sendSwapRequest: async (
    fromStaffId: string, fromStaffName: string,
    toStaffId: string, toStaffName: string,
    message?: string
  ): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase.from('duty_swap_requests').insert({
      from_staff_id: fromStaffId,
      from_staff_name: fromStaffName,
      to_staff_id: toStaffId,
      to_staff_name: toStaffName,
      message: message || null,
      status: 'pending',
    });
    if (error) console.error('[sendSwapRequest]', error.message);
  },

  respondSwapRequest: async (id: string, status: 'accepted' | 'rejected', newRoster?: string[]): Promise<void> => {
    if (!supabase) return;
    await supabase.from('duty_swap_requests').update({ status }).eq('id', id);
    if (status === 'accepted' && newRoster) {
      await supabase.from('system_settings').upsert(
        { key: 'duty_roster', value: newRoster, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    }
  },

  getSwapRequests: async (staffId: string): Promise<DutySwapRequest[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('duty_swap_requests')
      .select('*')
      .or(`from_staff_id.eq.${staffId},to_staff_id.eq.${staffId}`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) { console.error('[getSwapRequests]', error.message); return []; }
    return (data || []).map(r => ({
      id: String(r.id),
      fromStaffId: r.from_staff_id,
      fromStaffName: r.from_staff_name,
      toStaffId: r.to_staff_id,
      toStaffName: r.to_staff_name,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    }));
  },
};