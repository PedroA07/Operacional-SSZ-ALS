
import { SupabaseClient } from '@supabase/supabase-js';
import { Driver } from '../types';

export const driverRepository = {
  /**
   * Converte o objeto Driver do TypeScript (camelCase) 
   * para o formato do Banco de Dados (snake_case)
   */
  mapToDb: (driver: Driver) => {
    // Filtra operações para garantir que o JSONB seja válido
    const cleanOperations = Array.isArray(driver.operations) 
      ? driver.operations.map(op => ({ 
          category: op.category || '', 
          client: op.client || '' 
        }))
      : [];

    return {
      id: driver.id,
      photo: driver.photo || null,
      name: driver.name?.toUpperCase() || '',
      cpf: driver.cpf || '',
      rg: driver.rg || null,
      cnh: driver.cnh || null,
      cnh_pdf_url: driver.cnhPdfUrl || null,
      phone: driver.phone || null,
      email: driver.email?.toLowerCase() || null,
      plate_horse: driver.plateHorse?.toUpperCase() || null,
      year_horse: driver.yearHorse || null,
      plate_trailer: driver.plateTrailer?.toUpperCase() || null,
      year_trailer: driver.yearTrailer || null,
      driver_type: driver.driverType || 'Externo',
      status: driver.status || 'Ativo',
      status_last_change_date: driver.statusLastChangeDate || new Date().toISOString(),
      beneficiary_name: driver.beneficiaryName?.toUpperCase() || null,
      beneficiary_phone: driver.beneficiaryPhone || null,
      beneficiary_email: driver.beneficiaryEmail?.toLowerCase() || null,
      beneficiary_cnpj: driver.beneficiaryCnpj || null,
      payment_preference: driver.paymentPreference || 'PIX',
      whatsapp_group_name: driver.whatsappGroupName?.toUpperCase() || null,
      whatsapp_group_link: driver.whatsappGroupLink || null,
      registration_date: driver.registrationDate || new Date().toISOString(),
      operations: cleanOperations,
      trips_count: driver.tripsCount || 0,
      generated_password: driver.generatedPassword || null,
      current_lat: driver.currentLat || null,
      current_lng: driver.currentLng || null,
      last_location_at: driver.lastLocationAt || null
    };
  },

  /**
   * Converte do Banco de Dados para o objeto Driver
   */
  mapFromDb: (d: any): Driver => ({
    id: d.id,
    photo: d.photo,
    name: d.name,
    cpf: d.cpf,
    rg: d.rg,
    cnh: d.cnh,
    cnhPdfUrl: d.cnh_pdf_url || d.cnhPdfUrl,
    phone: d.phone,
    email: d.email,
    plateHorse: d.plate_horse || d.plateHorse,
    yearHorse: d.year_horse || d.yearHorse,
    plateTrailer: d.plate_trailer || d.plateTrailer,
    yearTrailer: d.year_trailer || d.yearTrailer,
    driverType: d.driver_type || d.driverType,
    status: d.status,
    statusLastChangeDate: d.status_last_change_date || d.statusLastChangeDate,
    beneficiaryName: d.beneficiary_name || d.beneficiaryName,
    beneficiaryPhone: d.beneficiary_phone || d.beneficiaryPhone,
    beneficiaryEmail: d.beneficiary_email || d.beneficiaryEmail,
    beneficiaryCnpj: d.beneficiary_cnpj || d.beneficiaryCnpj,
    paymentPreference: d.payment_preference || d.paymentPreference,
    whatsappGroupName: d.whatsapp_group_name || d.whatsappGroupName,
    whatsappGroupLink: d.whatsapp_group_link || d.whatsappGroupLink,
    registrationDate: d.registration_date || d.registrationDate,
    operations: Array.isArray(d.operations) ? d.operations : [],
    tripsCount: d.trips_count || d.tripsCount || 0,
    generatedPassword: d.generated_password || d.generatedPassword,
    currentLat: d.current_lat || d.currentLat,
    currentLng: d.current_lng || d.currentLng,
    lastLocationAt: d.last_location_at || d.lastLocationAt
  }),

  async save(supabase: SupabaseClient, driver: Driver) {
    try {
      const payload = this.mapToDb(driver);
      
      // Upsert no Supabase
      const { error } = await supabase.from('drivers').upsert(payload);
      
      if (error) {
        console.error("❌ ERRO NO SUPABASE (Upsert Driver):", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return false;
      }
      
      console.log("✅ Motorista salvo com sucesso no banco.");
      return true;
    } catch (e) {
      console.error("❌ Erro inesperado no driverRepository.save:", e);
      return false;
    }
  },

  async getAll(supabase: SupabaseClient): Promise<Driver[]> {
    try {
      const { data, error } = await supabase.from('drivers').select('*');
      if (error) throw error;
      return (data || []).map(d => this.mapFromDb(d));
    } catch (e) {
      console.error("❌ Erro driverRepository.getAll:", e);
      return [];
    }
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
