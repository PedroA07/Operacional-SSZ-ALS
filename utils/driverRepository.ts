
import { SupabaseClient } from '@supabase/supabase-js';
import { Driver } from '../types';

export const driverRepository = {
  /**
   * Converte o objeto Driver do TypeScript (camelCase) 
   * para o formato exato das colunas do Banco de Dados (snake_case) fornecido pelo usuário.
   */
  mapToDb: (driver: Driver) => {
    return {
      id: driver.id,
      photo: driver.photo || null,
      name: driver.name?.toUpperCase() || '',
      cpf: driver.cpf || '',
      rg: driver.rg || null,
      cnh: driver.cnh || null,
      phone: driver.phone || null,
      email: driver.email?.toLowerCase() || null,
      plate_horse: driver.plateHorse?.toUpperCase() || null,
      year_horse: driver.yearHorse || null,
      plate_trailer: driver.plateTrailer?.toUpperCase() || null,
      year_trailer: driver.yearTrailer || null,
      driver_type: driver.driverType || 'Externo',
      status: driver.status || 'Ativo',
      status_last_change_date: driver.statusLastChangeDate || new Date().toISOString(),
      beneficiary_name: driver.beneficiaryName || null,
      beneficiary_phone: driver.beneficiaryPhone || null,
      beneficiary_email: driver.beneficiaryEmail || null,
      beneficiary_cnpj: driver.beneficiaryCnpj || null, 
      payment_preference: driver.paymentPreference || 'PIX',
      whatsapp_group_name: driver.whatsappGroupName || null,
      whatsapp_group_link: driver.whatsappGroupLink || null,
      registration_date: driver.registrationDate || new Date().toISOString(),
      operations: Array.isArray(driver.operations) ? driver.operations : [],
      trips_count: driver.tripsCount || 0,
      generated_password: driver.generatedPassword || null,
      cnh_pdf_url: driver.cnhPdfUrl || null,
      current_lat: driver.currentLat || null,
      current_lng: driver.currentLng || null,
      last_location_at: driver.lastLocationAt || null
    };
  },

  /**
   * Converte do Banco de Dados para o objeto Driver do App
   */
  mapFromDb: (d: any): Driver => ({
    id: d.id,
    photo: d.photo,
    name: d.name,
    cpf: d.cpf,
    rg: d.rg,
    cnh: d.cnh,
    phone: d.phone,
    email: d.email,
    plateHorse: d.plate_horse || d.plateHorse,
    yearHorse: d.year_horse || d.yearHorse,
    plateTrailer: d.plate_trailer || d.plateTrailer,
    yearTrailer: d.year_trailer || d.yearTrailer,
    driverType: d.driver_type || d.driverType || 'Externo',
    status: d.status || 'Ativo',
    statusLastChangeDate: d.status_last_change_date || d.statusLastChangeDate,
    registrationDate: d.registration_date || d.registrationDate,
    operations: Array.isArray(d.operations) ? d.operations : [],
    tripsCount: d.trips_count || d.tripsCount || 0,
    generatedPassword: d.generated_password || d.generatedPassword,
    cnhPdfUrl: d.cnh_pdf_url || d.cnhPdfUrl,
    beneficiaryName: d.beneficiary_name || d.beneficiaryName,
    beneficiaryPhone: d.beneficiary_phone || d.beneficiaryPhone,
    beneficiaryEmail: d.beneficiary_email || d.beneficiaryEmail,
    beneficiaryCnpj: d.beneficiary_cnpj || d.beneficiaryCnpj,
    paymentPreference: d.payment_preference || d.paymentPreference,
    whatsappGroupName: d.whatsapp_group_name || d.whatsappGroupName,
    whatsappGroupLink: d.whatsapp_group_link || d.whatsappGroupLink,
    currentLat: d.current_lat || d.currentLat,
    currentLng: d.current_lng || d.currentLng,
    lastLocationAt: d.last_location_at || d.lastLocationAt
  }),

  async save(supabase: SupabaseClient, driver: Driver) {
    try {
      const payload = this.mapToDb(driver);
      const { error } = await supabase.from('drivers').upsert(payload);
      if (error) {
        console.error("ERRO SUPABASE DRIVER:", error.message);
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  async getAll(supabase: SupabaseClient): Promise<Driver[]> {
    try {
      const { data, error } = await supabase.from('drivers').select('*').order('name');
      if (error) throw error;
      return (data || []).map(d => this.mapFromDb(d));
    } catch (e) {
      return [];
    }
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    return !error;
  }
};
