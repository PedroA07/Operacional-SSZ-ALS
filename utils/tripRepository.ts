
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip } from '../types';

export const tripRepository = {
  mapToDb: (trip: Trip) => {
    return {
      id: trip.id,
      os: trip.os?.toUpperCase() || '',
      booking: trip.booking?.toUpperCase() || '',
      ship: trip.ship?.toUpperCase() || '',
      data_time: trip.dateTime, 
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

    // Função interna para garantir que a string de data seja interpretada corretamente pelo JS
    const normalizeDate = (dateStr: any) => {
      if (!dateStr) return new Date().toISOString();
      if (typeof dateStr !== 'string') return new Date(dateStr).toISOString();
      // Converte "YYYY-MM-DD HH:mm:ss" para "YYYY-MM-DDTHH:mm:ss"
      return dateStr.replace(' ', 'T');
    };

    return {
      id: d.id,
      os: d.os || 'SEM OS',
      booking: d.booking || '',
      ship: d.ship || '',
      dateTime: normalizeDate(d.data_time || d.dateTime),
      statusTime: normalizeDate(d.status_time || d.statusTime || d.data_time),
      isLate: d.is_late ?? false,
      type: d.type || 'EXPORTAÇÃO',
      containerType: d.container_type || d.containerType || '40HC',
      category: d.category || 'Geral',
      subCategory: d.sub_category || d.subCategory || '',
      container: d.container || '',
      tara: d.tara || '',
      seal: d.seal || '',
      cva: d.cva || '',
      customer: safeParse(d.customer, { name: 'Cliente Indefinido' }),
      destination: safeParse(d.destination, null),
      driver: safeParse(d.driver, { name: 'Motorista Indefinido' }),
      status: d.status || 'Pendente',
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
    try {
      const { data, error } = await supabase.from('trips').select('*');
      if (error) throw error;
      return (data || []).map(d => this.mapFromDb(d));
    } catch (e) {
      return [];
    }
  },

  async save(supabase: SupabaseClient, trip: Trip) {
    try {
      const payload = this.mapToDb(trip);
      const { error } = await supabase.from('trips').upsert(payload);
      return !error;
    } catch (e) {
      return false;
    }
  }
};
