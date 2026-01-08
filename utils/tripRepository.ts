
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip } from '../types';

export const tripRepository = {
  mapToDb: (trip: Trip) => {
    return {
      id: trip.id,
      os: trip.os,
      booking: trip.booking,
      ship: trip.ship,
      data_time: trip.dateTime, // Mapeado conforme print do banco
      status_time: trip.statusTime || trip.statusHistory?.[0]?.dateTime || new Date().toISOString(),
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
      freight_contract_doc: trip.freightContractDoc || null,
      cte_doc: trip.cteDoc || null,
      cva_doc: trip.cvaDoc || null,
      nf_doc: trip.nfDoc || null,
      nf_key: trip.nfKey || null,
      oc_form_data: trip.ocFormData || null,
      pre_stacking_form_data: trip.preStackingFormData || null,
      scheduling: trip.scheduling || null,
      driver_docs: trip.driver_docs || []
    };
  },

  mapFromDb: (d: any): Trip => {
    const safeParse = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return fallback; }
      }
      return val; 
    };

    return {
      id: d.id,
      os: d.os,
      booking: d.booking,
      ship: d.ship,
      dateTime: d.data_time || d.dateTime, // Prioriza data_time do banco
      statusTime: d.status_time || d.statusTime,
      isLate: d.is_late ?? false,
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
      nfDoc: d.nf_doc || d.nfDoc,
      nfKey: d.nf_key || d.nfKey,
      ocFormData: safeParse(d.oc_form_data || d.ocFormData, null),
      preStackingFormData: safeParse(d.pre_stacking_form_data || d.preStackingFormData, null),
      scheduling: safeParse(d.scheduling, undefined),
      driver_docs: safeParse(d.driver_docs, []) 
    };
  },

  async getAll(supabase: SupabaseClient): Promise<Trip[]> {
    const { data, error } = await supabase.from('trips').select('*').order('data_time', { ascending: false });
    if (error) throw error;
    return (data || []).map(d => this.mapFromDb(d));
  },

  async save(supabase: SupabaseClient, trip: Trip) {
    const payload = this.mapToDb(trip);
    const { error } = await supabase.from('trips').upsert(payload);
    if (error) throw error;
    return true;
  }
};
