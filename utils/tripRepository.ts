
import { SupabaseClient } from '@supabase/supabase-js';
import { Trip, DriverCapturedDoc, FreightContractDoc, User } from '../types';
import { fileStorage } from './fileStorage';

// Gera UUID v4 compatível com qualquer ambiente (HTTP/HTTPS)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

export const tripRepository = {
  mapToDb: (trip: Trip) => ({
    id: trip.id,
    // trim() remove espaços acidentais no início e fim antes de salvar
    os: trip.os?.trim().toUpperCase() || '',
    booking: trip.booking?.trim().toUpperCase() || '',
    ship: trip.ship?.trim().toUpperCase() || '',
    bu: trip.bu?.trim().toUpperCase() || null,
    aut_coleta: trip.autColeta?.trim().toUpperCase() || null,
    embarcador: trip.embarcador?.trim().toUpperCase() || null,
    date_time: trip.dateTime, 
    status_time: trip.statusTime || trip.dateTime,
    is_late: trip.isLate || false,
    type: trip.type || 'EXPORTAÇÃO',
    container_type: trip.containerType || null,
    category: trip.category || '', 
    container: trip.container?.trim().toUpperCase() || '',
    tara: trip.tara?.trim() || null,
    seal: trip.seal?.trim().toUpperCase() || null,
    cva: trip.cva?.trim().toUpperCase() || null,
    agencia: trip.agencia?.trim().toUpperCase() || null,
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
    freight_contract_docs: trip.freightContractDocs?.length ? trip.freightContractDocs : null,
    cte_doc: trip.cteDoc || null,
    cva_doc: trip.cvaDoc || null,
    nf_doc: trip.nfDoc || null,
    nf_key: trip.nfKey?.trim() || null,
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
    coleta_order_index: trip.coletaOrderIndex ?? null,
    is_completed: trip.isCompleted || false,
    emissao_cte_number: trip.emissaoCteNumber || null,
    emissao_observacoes: trip.emissaoObservacoes || null,
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
      freightContractDocs: Array.isArray(safeParse(d.freight_contract_docs, null))
        ? (safeParse(d.freight_contract_docs, []) as FreightContractDoc[]).map(doc => ({
            ...doc,
            url: fileStorage.getPublicUrl(doc.url),
          }))
        : undefined,
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
      coletaOrderIndex: d.coleta_order_index ?? undefined,
      emissaoCteNumber: d.emissao_cte_number || undefined,
      emissaoObservacoes: d.emissao_observacoes || undefined,
    };
  },

  async getAll(supabase: SupabaseClient): Promise<Trip[]> {
    // Filtra apenas viagens recentes (a partir de 2025-01-01) para evitar
    // timeout por varredura completa da tabela em ambientes sem índice eficiente.
    // Viagens operacionais ativas nunca ficam pendentes por mais de 1 ano.
    const PAGE_SIZE = 1000;
    let allData: any[] = [];
    let from = 0;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .gte('date_time', '2025-01-01T00:00:00.000Z')
        .order('date_time', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      if (data && data.length > 0) {
        allData = allData.concat(data);
      }

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
        const { data } = await supabase.from('trips').select('status').eq('id', trip.id).maybeSingle();
        if (data) oldStatus = data.status;
      } catch (e) {}
    }

    const payload = this.mapToDb(trip);
    const isExisting = !!(trip.id && !trip.id.startsWith('new-'));
    const { id: _pid, ...payloadWithoutId } = payload as any;
    const osKey = trip.os?.trim().toUpperCase();

    // Para INSERT, gera UUID compatível com qualquer ambiente (HTTP/HTTPS).
    // A migration 20260529000000 adiciona DEFAULT ao banco, mas o código
    // também gera para garantir funcionamento antes da migration ser aplicada.
    const insertPayload = isExisting ? payloadWithoutId : { id: generateUUID(), ...payloadWithoutId };

    // Tenta salvar e, se houver conflito de OS (23505), faz UPDATE pelo OS como fallback.
    // Isso resolve casos em que o id em memória divergiu do registro real no banco.
    const doSave = async (p: Record<string, unknown>) => {
      let result;
      if (isExisting) {
        result = await supabase.from('trips').update(p).eq('id', trip.id!);
      } else {
        result = await supabase.from('trips').insert(p);
      }

      if (result.error?.code === '23505' && osKey) {
        console.warn(`Conflito de OS ${osKey} — fazendo UPDATE pelo OS`);
        result = await supabase.from('trips').update(p).eq('os', osKey);
      }

      return result;
    };

    const { error } = await doSave(insertPayload);

    if (error) {
      // Coluna inexistente no banco (migration ainda não aplicada) — remove o campo e tenta de novo
      const missingColumnMatch = error.message?.match(/column ["']?(\w+)["']? (of relation|does not exist)/i)
        || error.details?.match(/column ["']?(\w+)["']? (of relation|does not exist)/i);
      const isUnknownColumn = error.code === 'PGRST204' || !!missingColumnMatch
        || error.message.includes('agencia')
        || error.message.includes('coleta_order_index');

      if (isUnknownColumn) {
        // Detecta quais colunas remover
        const columnsToRemove: string[] = [];
        if (error.message.includes('agencia')) columnsToRemove.push('agencia');
        if (error.message.includes('coleta_order_index')) columnsToRemove.push('coleta_order_index');
        if (missingColumnMatch) columnsToRemove.push(missingColumnMatch[1]);

        // Fallback genérico: tenta também sem coleta_order_index sempre que o erro for de coluna
        if (!columnsToRemove.includes('coleta_order_index')) columnsToRemove.push('coleta_order_index');

        const retryPayload = { ...insertPayload };
        columnsToRemove.forEach(col => delete (retryPayload as any)[col]);

        console.warn(`Colunas ausentes no banco [${columnsToRemove.join(', ')}] — tentando salvar sem elas...`);

        const { error: retryError } = await doSave(retryPayload);

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
          payload: payloadWithoutId
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
