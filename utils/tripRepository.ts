
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip } from '../types';

export const tripRepository = {
  mapToDb: (trip: Trip) => {
    // Garantir que as datas sejam ISO strings válidas para timestamptz
    const validDate = trip.dateTime ? new Date(trip.dateTime).toISOString() : new Date().toISOString();
    const validStatusDate = trip.statusTime ? new Date(trip.statusTime).toISOString() : validDate;
    
    return {
      id: trip.id,
      os: trip.os?.toUpperCase() || '',
      booking: trip.booking?.toUpperCase() || '',
      ship: trip.ship?.toUpperCase() || '',
      date_time: validDate, // Nome da coluna conforme imagem fornecida
      status_time: validStatusDate,
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

    // Normalização de data para evitar saltos de fuso horário local
    const parseDate = (val: any) => {
      if (!val) return new Date().toISOString();
      const date = new Date(val);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    };

    return {
      id: d.id,
      os: d.os || 'SEM OS',
      booking: d.booking || '',
      ship: d.ship || '',
      // Mapeia colunas do banco (snake_case) para o app (camelCase)
      dateTime: parseDate(d.date_time || d.dateTime),
      statusTime: parseDate(d.status_time || d.statusTime || d.date_time),
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
      console.error("Erro ao carregar viagens via TripRepo:", e);
      return [];
    }
  },

  async save(supabase: SupabaseClient, trip: Trip) {
    try {
      const payload = this.mapToDb(trip);
      const { error } = await supabase.from('trips').upsert(payload);
      if (error) {
        console.error("Erro no salvamento Supabase:", error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error("Erro fatal no salvamento:", e);
      return false;
    }
  }
};
