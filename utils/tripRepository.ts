import { SupabaseClient } from '@supabase/supabase-js';
import { Trip } from '../types';

export const tripRepository = {
  mapToDb: (trip: Trip) => ({
    id: trip.id,
    os: trip.os?.toUpperCase() || '',
    booking: trip.booking?.toUpperCase() || '',
    ship: trip.ship?.toUpperCase() || '',
    date_time: trip.dateTime, 
    status_time: trip.statusTime || trip.dateTime,
    is_late: trip.isLate || false,
    type: trip.type || 'EXPORTAÇÃO',
    container_type: trip.containerType || null,
    category: trip.category || 'Geral',
    sub_category: trip.subCategory || null,
    container: trip.container?.toUpperCase() || '',
    tara: trip.tara || null,
    seal: trip.seal?.toUpperCase() || null,
    cva: trip.cva?.toUpperCase() || null,
    customer: trip.customer, 
    destination: trip.destination || null, 
    driver: trip.driver, 
    status: trip.status || 'Pendente',
    status_history: trip.statusHistory || [], 
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
      if (typeof val === 'string') { 
        try { return JSON.parse(val); } catch { return fallback; } 
      }
      return val; 
    };

    // Mapeamento flexível para aceitar camelCase ou snake_case do banco
    return {
      id: d.id,
      os: d.os || d.OS || 'SEM OS',
      booking: d.booking || d.Booking || '',
      ship: d.ship || d.Ship || '',
      dateTime: d.date_time || d.dateTime || d.date || new Date().toISOString(),
      statusTime: d.status_time || d.statusTime || d.date_time || d.dateTime,
      isLate: d.is_late ?? d.isLate ?? false,
      type: d.type || d.Type || 'EXPORTAÇÃO',
      containerType: d.container_type || d.containerType || '40HC',
      category: d.category || d.Category || 'Geral',
      subCategory: d.sub_category || d.subCategory || '',
      container: d.container || d.Container || '',
      tara: d.tara || d.Tara || '',
      seal: d.seal || d.Seal || '',
      cva: d.cva || d.CVA || '',
      customer: safeParse(d.customer || d.Customer, { name: '---' }),
      destination: safeParse(d.destination || d.Destination, null),
      driver: safeParse(d.driver || d.Driver, { name: '---' }),
      status: d.status || d.Status || 'Pendente',
      statusHistory: safeParse(d.status_history || d.statusHistory, []),
      advancePayment: safeParse(d.advance_payment || d.advancePayment, { status: 'BLOQUEADO' }),
      balancePayment: safeParse(d.balance_payment || d.balancePayment, { status: 'AGUARDANDO_DOCS' }),
      osDoc: d.os_doc || d.osDoc,
      agendamentoDoc: d.agendamento_doc || d.agendamentoDoc,
      completoDoc: d.completo_doc || d.completoDoc,
      freightContractDoc: d.freight_contract_doc || d.freightContractDoc,
      cteDoc: d.cte_doc || d.cteDoc,
      cvaDoc: d.cva_doc || d.cvaDoc,
      nfDoc: d.nf_doc || d.nfDoc,
      nfKey: d.nf_key || d.nfKey,
      ocFormData: safeParse(d.oc_form_data || d.ocFormData, null),
      preStackingFormData: safeParse(d.pre_stacking_form_data || d.preStackingFormData, null),
      scheduling: safeParse(d.scheduling || d.Scheduling, undefined),
      driver_docs: safeParse(d.driver_docs || d.driverDocs, []) 
    };
  },

  // Added save method to fix error in storage.ts
  async save(supabase: SupabaseClient, trip: Trip) {
    const payload = this.mapToDb(trip);
    const { error } = await supabase.from('trips').upsert(payload);
    if (error) throw error;
    return true;
  },

  async getAll(supabase: SupabaseClient): Promise<Trip[]> {
    // Aumentado o limite para garantir que dados antigos também apareçam
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('date_time', { ascending: false })
      .limit(500);

    if (error) {
      console.error("Erro Supabase Trips:", error);
      throw error;
    }
    return (data || []).map(d => this.mapFromDb(d));
  }
};