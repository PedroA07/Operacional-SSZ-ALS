
import { SupabaseClient } from '@supabase/supabase-js';
import { Driver } from '../types';

export const driverRepository = {
  mapToDb: (driver: Driver) => {
    const cleanOperations = Array.isArray(driver.operations) 
      ? driver.operations.map(op => ({ category: op.category, client: op.client }))
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
      plate_horse: driver.plateHorse || null,
      year_horse: driver.yearHorse || null,
      plate_trailer: driver.plateTrailer || null,
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

  mapFromDb: (d: any): Driver => ({
    id: d.id,
    photo: d.photo,
    name: d.name,
    cpf: d.cpf,
    rg: d.rg,
    cnh: d.cnh,
    cnhPdfUrl: d.cnh_pdf_url,
    phone: d.phone,
    email: d.email,
    plateHorse: d.plate_horse,
    yearHorse: d.year_horse,
    plateTrailer: d.plate_trailer,
    yearTrailer: d.year_trailer,
    driverType: d.driver_type,
    status: d.status,
    statusLastChangeDate: d.status_last_change_date,
    beneficiaryName: d.beneficiary_name,
    beneficiaryPhone: d.beneficiary_phone,
    beneficiaryEmail: d.beneficiary_email,
    beneficiaryCnpj: d.beneficiary_cnpj,
    paymentPreference: d.payment_preference,
    whatsappGroupName: d.whatsapp_group_name,
    whatsappGroupLink: d.whatsapp_group_link,
    registrationDate: d.registration_date,
    operations: Array.isArray(d.operations) ? d.operations : [],
    tripsCount: d.trips_count || 0,
    generatedPassword: d.generated_password,
    currentLat: d.current_lat,
    currentLng: d.current_lng,
    lastLocationAt: d.last_location_at
  }),

  async save(supabase: SupabaseClient, driver: Driver) {
    const payload = this.mapToDb(driver);
    const { error } = await supabase.from('drivers').upsert(payload);
    if (error) {
      console.error("ERRO CRÍTICO SUPABASE UPSERT DRIVER:", error);
      return false;
    }
    return true;
  },

  async getAll(supabase: SupabaseClient): Promise<Driver[]> {
    const { data, error } = await supabase.from('drivers').select('*');
    if (error) {
      console.error("ERRO GET ALL DRIVERS:", error);
      return [];
    }
    return (data || []).map(d => this.mapFromDb(d));
  },

  // Added delete method for driver records
  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
