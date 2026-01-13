
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
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return fallback; } }
      return val; 
    };

    return {
      id: d.id,
      os: d.os || 'SEM OS',
      booking: d.booking || '',
      ship: d.ship || '',
      dateTime: d.date_time,
      statusTime: d.status_time || d.date_time,
      isLate: d.is_late ?? false,
      type: d.type || 'EXPORTAÇÃO',
      containerType: d.container_type || '40HC',
      category: d.category || 'Geral',
      subCategory: d.sub_category || '',
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
      osDoc: d.os_doc,
      agendamentoDoc: d.agendamento_doc,
      completoDoc: d.completo_doc,
      freightContractDoc: d.freight_contract_doc,
      cteDoc: d.cte_doc,
      cvaDoc: d.cva_doc,
      nfDoc: d.nf_doc,
      nfKey: d.nf_key,
      ocFormData: safeParse(d.oc_form_data, null),
      preStackingFormData: safeParse(d.pre_stacking_form_data, null),
      scheduling: safeParse(d.scheduling, undefined),
      driver_docs: safeParse(d.driver_docs, []) 
    };
  },

  async getAll(supabase: SupabaseClient): Promise<Trip[]> {
    // BUSCA OTIMIZADA: Agora usa o índice de data e limita a 100 registros
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .order('date_time', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data || []).map(d => this.mapFromDb(d));
  },

  async save(supabase: SupabaseClient, trip: Trip) {
    const { error } = await supabase.from('trips').upsert(this.mapToDb(trip));
    return !error;
  }
};
