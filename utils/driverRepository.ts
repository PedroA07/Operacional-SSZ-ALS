
import { SupabaseClient } from '@supabase/supabase-js';
import { Driver } from '../types';

export const driverRepository = {
  mapToDb: (driver: Driver) => {
    return {
      id: driver.id,
      photo: driver.photo || null,
      // trim() remove espaços acidentais no início e fim antes de salvar
      name: driver.name?.trim().toUpperCase() || '',
      cpf: driver.cpf?.trim() || '',
      rg: driver.rg?.trim() || null,
      cnh: driver.cnh?.trim() || null,
      phone: driver.phone?.trim() || null,
      email: driver.email?.trim().toLowerCase() || null,
      plate_horse: driver.plateHorse?.trim().toUpperCase() || null,
      year_horse: driver.yearHorse?.trim() || null,
      plate_trailer: driver.plateTrailer?.trim().toUpperCase() || null,
      year_trailer: driver.yearTrailer?.trim() || null,
      driver_type: driver.driverType || 'Externo',
      status: driver.status || 'Ativo',
      status_last_change_date: driver.statusLastChangeDate || null,
      beneficiary_name: driver.beneficiaryName?.trim() || null,
      beneficiary_phone: driver.beneficiaryPhone?.trim() || null,
      beneficiary_email: driver.beneficiaryEmail?.trim().toLowerCase() || null,
      beneficiary_cnpj: driver.beneficiaryCnpj?.trim() || null, 
      payment_preference: driver.paymentPreference || 'PIX',
      whatsapp_group_name: driver.whatsappGroupName?.trim() || null,
      whatsapp_group_link: driver.whatsappGroupLink?.trim() || null,
      registration_date: driver.registrationDate || null,
      operations: Array.isArray(driver.operations) ? driver.operations : [],
      trips_count: driver.tripsCount || 0,
      generated_password: driver.generatedPassword || null,
      cnh_pdf_url: driver.cnhPdfUrl || null,
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
    currentLat: d.current_lat ? Number(d.current_lat) : undefined,
    currentLng: d.current_lng ? Number(d.current_lng) : undefined,
    lastLocationAt: d.last_location_at || d.lastLocationAt
  }),

  async save(supabase: SupabaseClient, driver: Driver) {
    const payload = this.mapToDb(driver);
    const { error } = await supabase.from('drivers').upsert(payload);
    if (error) throw error;
    return true;
  },

  async getAll(supabase: SupabaseClient): Promise<Driver[]> {
    const { data, error } = await supabase.from('drivers').select('*').order('name');
    if (error) {
      console.error("Erro Supabase Drivers:", error);
      throw error;
    }
    return (data || []).map(d => this.mapFromDb(d));
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('drivers').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
