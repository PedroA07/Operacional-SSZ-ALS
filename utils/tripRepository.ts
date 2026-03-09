
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip, DriverCapturedDoc, User } from '../types';
import { fileStorage } from './fileStorage';

export const tripRepository = {
  mapToDb: (trip: Trip) => ({
    id: trip.id,
    os: trip.os?.toUpperCase() || '',
    booking: trip.booking?.toUpperCase() || '',
    ship: trip.ship?.toUpperCase() || '',
    aut_coleta: trip.autColeta?.toUpperCase() || null,
    embarcador: trip.embarcador?.toUpperCase() || null,
    date_time: trip.dateTime, 
    status_time: trip.statusTime || trip.dateTime,
    is_late: trip.isLate || false,
    type: trip.type || 'EXPORTAÇÃO',
    container_type: trip.containerType || null,
    category: trip.category || '', 
    container: trip.container?.toUpperCase() || '',
    tara: trip.tara || null,
    seal: trip.seal?.toUpperCase() || null,
    cva: trip.cva?.toUpperCase() || null,
    customer: trip.customer, 
    destination: trip.destination || null, 
    driver: trip.driver, 
    status: trip.status || 'Pendente',
    status_history: trip.statusHistory || [], 
    advance_payment: trip.advancePayment || { status: 'BLOQUEADO' },
    balance_payment: trip.balancePayment || { status: 'AGUARDANDO_DOCS' },
    os_doc: trip.osDoc || null,
    agendamento_doc: trip.agendamentoDoc || null,
    completo_doc: trip.completoDoc || null,
    freight_contract_doc: trip.freightContractDoc || null,
    cte_doc: trip.cteDoc || null,
    cva_doc: trip.cvaDoc || null,
    nf_doc: trip.nfDoc || null,
    nf_key: trip.nfKey || null,
    oc_form_data: trip.ocFormData || null,
    pre_stacking_form_data: trip.preStackingFormData || null,
    scheduling: trip.scheduling || null,
    driver_docs: trip.driver_docs || []
  }),

  mapFromDb: (d: any): Trip => {
    const safeParse = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
      return val; 
    };

    const normalizeDoc = (doc: any) => {
      if (!doc || !doc.url) return doc;
      return { ...doc, url: fileStorage.getPublicUrl(doc.url) };
    };

    const rawDriverDocs = safeParse(d.driver_docs, []);
    const normalizedDriverDocs = Array.isArray(rawDriverDocs) 
      ? rawDriverDocs.map((doc: DriverCapturedDoc) => ({
          ...doc,
          url: fileStorage.getPublicUrl(doc.url)
        }))
      : [];

    return {
      id: d.id,
      os: d.os || 'SEM OS',
      booking: d.booking || '',
      ship: d.ship || '',
      autColeta: d.aut_coleta || '',
      embarcador: d.embarcador || '',
      dateTime: d.date_time,
      statusTime: d.status_time || d.date_time,
      isLate: d.is_late ?? false,
      type: d.type || 'EXPORTAÇÃO',
      containerType: d.container_type || '40HC',
      category: d.category || '', 
      container: d.container || '',
      tara: d.tara || '',
      seal: d.seal || '',
      cva: d.cva || '',
      customer: safeParse(d.customer, { name: '---' }),
      destination: safeParse(d.destination, null),
      driver: safeParse(d.driver, { name: '---' }),
      status: d.status || 'Pendente',
      statusHistory: safeParse(d.status_history, []),
      advancePayment: safeParse(d.advance_payment, { status: 'BLOQUEADO' }),
      balancePayment: safeParse(d.balance_payment, { status: 'AGUARDANDO_DOCS' }),
      osDoc: normalizeDoc(d.os_doc),
      agendamentoDoc: normalizeDoc(d.agendamento_doc),
      completoDoc: normalizeDoc(d.completo_doc),
      freightContractDoc: normalizeDoc(d.freight_contract_doc),
      cteDoc: normalizeDoc(d.cte_doc),
      cvaDoc: normalizeDoc(d.cva_doc),
      nfDoc: normalizeDoc(d.nf_doc),
      nfKey: d.nf_key,
      ocFormData: safeParse(d.oc_form_data, null),
      preStackingFormData: safeParse(d.pre_stacking_form_data, null),
      scheduling: safeParse(d.scheduling, null),
      driver_docs: normalizedDriverDocs
    };
  },

  async getAll(supabase: SupabaseClient): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('date_time', { ascending: false })
      .limit(5000); 

    if (error) throw error;
    return (data || []).map(d => this.mapFromDb(d));
  },

  async save(supabase: SupabaseClient, trip: Trip, actingUser?: User) {
    const payload = this.mapToDb(trip);
    const { error } = await supabase.from('trips').upsert(payload);
    if (error) throw error;
    return true;
  }
};
