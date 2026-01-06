
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip } from '../types';

export const tripRepository = {
  mapToDb: (trip: Trip) => ({
    id: trip.id,
    os: trip.os,
    booking: trip.booking,
    ship: trip.ship,
    date_time: trip.dateTime,
    status_time: trip.statusTime || null,
    is_late: trip.isLate,
    type: trip.type,
    container_type: trip.containerType || null,
    category: trip.category,
    sub_category: trip.subCategory || null,
    container: trip.container,
    tara: trip.tara || null,
    seal: trip.seal || null,
    cva: trip.cva || null,
    customer: trip.customer,
    destination: trip.destination || null,
    driver: trip.driver,
    status: trip.status,
    status_history: trip.statusHistory || [],
    advance_payment: trip.advancePayment,
    balance_payment: trip.balancePayment,
    os_doc: trip.osDoc || null,
    agendamento_doc: trip.agendamentoDoc || null,
    completo_doc: trip.completoDoc || null,
    // Fix: Corrected property name from freight_contract_doc to freightContractDoc to match the Trip interface
    freight_contract_doc: trip.freightContractDoc || null,
    cte_doc: trip.cteDoc || null,
    cva_doc: trip.cvaDoc || null,
    oc_form_data: trip.ocFormData || null,
    pre_stacking_form_data: trip.preStackingFormData || null,
    scheduling: trip.scheduling || null,
    driver_docs: trip.driver_docs || []
  }),

  mapFromDb: (d: any): Trip => {
    // Helper para parsear JSON de forma segura caso venha como string
    const safeParse = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return fallback; }
      }
      return val;
    };

    return {
      id: d.id,
      os: d.os,
      booking: d.booking,
      ship: d.ship,
      dateTime: d.date_time || d.dateTime,
      statusTime: d.status_time || d.statusTime,
      isLate: d.is_late ?? d.isLate ?? false,
      type: d.type,
      containerType: d.container_type || d.containerType,
      category: d.category,
      subCategory: d.sub_category || d.subCategory,
      container: d.container,
      tara: d.tara,
      seal: d.seal,
      cva: d.cva,
      customer: safeParse(d.customer, {}),
      destination: safeParse(d.destination, null),
      driver: safeParse(d.driver, {}),
      status: d.status,
      statusHistory: safeParse(d.status_history || d.statusHistory, []),
      advancePayment: safeParse(d.advance_payment || d.advancePayment, { status: 'BLOQUEADO' }),
      balancePayment: safeParse(d.balance_payment || d.balancePayment, { status: 'AGUARDANDO_DOCS' }),
      osDoc: d.os_doc || d.osDoc,
      agendamentoDoc: d.agendamento_doc || d.agendamentoDoc,
      completoDoc: d.completo_doc || d.completoDoc,
      freightContractDoc: d.freight_contract_doc || d.freightContractDoc,
      cteDoc: d.cte_doc || d.cteDoc,
      cvaDoc: d.cva_doc || d.cvaDoc,
      ocFormData: safeParse(d.oc_form_data || d.ocFormData, null),
      preStackingFormData: safeParse(d.pre_stacking_form_data || d.preStackingFormData, null),
      scheduling: safeParse(d.scheduling, undefined),
      driver_docs: safeParse(d.driver_docs, [])
    };
  },

  async getAll(supabase: SupabaseClient): Promise<Trip[]> {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('date_time', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => this.mapFromDb(d));
  },

  async save(supabase: SupabaseClient, trip: Trip) {
    const payload = this.mapToDb(trip);
    const { error } = await supabase.from('trips').upsert(payload);
    if (error) {
      console.error("Erro ao salvar no Supabase (trips):", error);
      throw error;
    }
    return true;
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
