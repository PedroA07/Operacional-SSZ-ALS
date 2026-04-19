
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip, DriverCapturedDoc, User } from '../types';
import { fileStorage } from './fileStorage';

export const tripRepository = {
  mapToDb: (trip: Trip) => ({
    id: trip.id,
    os: trip.os?.toUpperCase() || '',
    booking: trip.booking?.toUpperCase() || '',
    ship: trip.ship?.toUpperCase() || '',
    bu: trip.bu?.toUpperCase() || null,
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
    agencia: trip.agencia?.toUpperCase() || null,
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
    driver_docs: trip.driver_docs || [],
    is_priority: trip.isPriority || false,
    sent_nf: trip.sentNF || false,
    is_scheduled: trip.isScheduled || false,
    scheduled_location_id: trip.scheduledLocationId || null,
    scheduled_date_time: trip.scheduledDateTime || null,
    has_advance: trip.hasAdvance || false,
    coleta_tipo_viagem: trip.coletaTipoViagem || null,
    coleta_email_sent: trip.coletaEmailSent || false,
    coleta_doc_generated: trip.coletaDocGenerated || false,
    coleta_emissao_solicitada: trip.coletaEmissaoSolicitada || false,
    is_removed_from_coleta: trip.isRemovedFromColeta || false,
    is_removed_from_org: trip.isRemovedFromOrg || false,
    is_completed: trip.isCompleted || false
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
      bu: d.bu || 'SSZ',
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
      agencia: d.agencia || '',
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
      driver_docs: normalizedDriverDocs,
      isPriority: d.is_priority ?? false,
      isCompleted: d.is_completed ?? false,
      sentNF: d.sent_nf ?? false,
      isScheduled: d.is_scheduled ?? false,
      scheduledLocationId: d.scheduled_location_id || null,
      scheduledDateTime: d.scheduled_date_time || null,
      hasAdvance: d.has_advance ?? false,
      coletaTipoViagem: d.coleta_tipo_viagem || undefined,
      coletaEmailSent: d.coleta_email_sent ?? false,
      coletaDocGenerated: d.coleta_doc_generated ?? false,
      coletaEmissaoSolicitada: d.coleta_emissao_solicitada ?? false,
      isRemovedFromColeta: d.is_removed_from_coleta ?? false,
      isRemovedFromOrg: d.is_removed_from_org ?? false,
    };
  },

  async getAll(supabase: SupabaseClient): Promise<Trip[]> {
    // O Supabase PostgREST limita 1000 linhas por request por padrão.
    // Para garantir que todas as viagens sejam carregadas, buscamos em lotes
    // de 1000 usando range(), repetindo até não restar mais registros.
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('date_time', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
      }

      // Se o lote veio com menos registros que o tamanho máximo, chegamos ao fim
      hasMore = (data?.length ?? 0) === PAGE_SIZE;
      from += PAGE_SIZE;
    }

    return allData.map(d => this.mapFromDb(d));
  },

  async save(supabase: SupabaseClient, trip: Trip, actingUser?: User) {
    // Busca status antigo para detectar mudança
    let oldStatus: string | null = null;
    if (trip.id && !trip.id.startsWith('new-')) {
      try {
        const { data } = await supabase.from('trips').select('status').eq('id', trip.id).single();
        if (data) oldStatus = data.status;
      } catch (e) {}
    }

    const payload = this.mapToDb(trip);
    
    // Tentativa inicial de salvar com todos os campos
    const { error } = await supabase.from('trips').upsert(payload);
    
    if (error) {
      // Se o erro for de coluna inexistente (PGRST204) e envolver 'agencia'
      if (error.code === 'PGRST204' || error.message.includes('agencia')) {
        console.warn('Coluna "agencia" não encontrada na tabela "trips". Tentando salvar sem este campo...');
        
        const retryPayload = { ...payload };
        delete (retryPayload as any).agencia;
        
        const { error: retryError } = await supabase.from('trips').upsert(retryPayload);
        
        if (retryError) {
          console.error("ERRO AO SALVAR TRIP (RETRY):", retryError);
          throw retryError;
        }
      } else {
        console.error("ERRO DETALHADO AO SALVAR TRIP:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          payload: payload
        });
        throw error;
      }
    }

    // Dispara automação se o status mudou ou se é uma nova viagem
    if (oldStatus !== trip.status) {
      try {
        // Import dinâmico para evitar dependências circulares
        const { automationService } = await import('../services/automationService');
        await automationService.triggerAutomation(trip, trip.status);
      } catch (autoError) {
        console.error("Erro ao disparar automação no repositório:", autoError);
      }
    }

    // Sincronização automática do cofre de lacres
    try {
      const tripSeal = trip.seal || trip.ocFormData?.seal || trip.preStackingFormData?.seal;
      if (tripSeal && tripSeal.trim() !== '') {
        const { data: sealRecords } = await supabase
          .from('seal_records')
          .select('*')
          .eq('seal_number', tripSeal.trim());

        if (sealRecords && sealRecords.length > 0) {
          const record = sealRecords[0];
          let hasChanges = false;
          const updates: any = {};

          if (!record.container_number && trip.container) {
            updates.container_number = trip.container.toUpperCase();
            hasChanges = true;
          }

          const tripBooking = trip.booking || trip.ocFormData?.booking || trip.preStackingFormData?.booking;
          if (!record.booking && tripBooking) {
            updates.booking = tripBooking.toUpperCase();
            hasChanges = true;
          }

          if (!record.driver_name && trip.driver?.name) {
            updates.driver_name = trip.driver.name.toUpperCase();
            hasChanges = true;
          }

          if (!record.reuse_date && trip.dateTime) {
            updates.reuse_date = trip.dateTime.split('T')[0];
            hasChanges = true;
          }

          if (hasChanges) {
            await supabase.from('seal_records').update(updates).eq('id', record.id);
          }
        }
      }
    } catch (e) {
      console.error("Erro na sincronização automática de lacres:", e);
    }

    return true;
  }
};
