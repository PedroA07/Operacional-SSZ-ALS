
import { SupabaseClient } from '@supabase/supabase-js';
import { Driver, PlateEntry } from '../types';

function primaryPlate(entries: PlateEntry[] | undefined): string {
  if (!entries || entries.length === 0) return '';
  return (entries.find(e => e.isPrimary) || entries[0]).plate;
}

function primaryYear(entries: PlateEntry[] | undefined): string {
  if (!entries || entries.length === 0) return '';
  return (entries.find(e => e.isPrimary) || entries[0]).year || '';
}

function ensureArray(raw: any, fallbackPlate?: string, fallbackYear?: string): PlateEntry[] {
  if (Array.isArray(raw) && raw.length > 0) return raw as PlateEntry[];
  if (fallbackPlate) {
    return [{ id: `plate-${Date.now()}-${Math.random()}`, plate: fallbackPlate, year: fallbackYear || '', isPrimary: true }];
  }
  return [];
}

export const driverRepository = {
  mapToDb: (driver: Driver) => {
    const platesHorse = driver.platesHorse && driver.platesHorse.length > 0
      ? driver.platesHorse
      : (driver.plateHorse ? [{ id: `ph-${driver.id}`, plate: driver.plateHorse, year: driver.yearHorse || '', isPrimary: true }] : []);

    const platesTrailer = driver.platesTrailer && driver.platesTrailer.length > 0
      ? driver.platesTrailer
      : (driver.plateTrailer ? [{ id: `pt-${driver.id}`, plate: driver.plateTrailer, year: driver.yearTrailer || '', isPrimary: true }] : []);

    const primaryHorse = primaryPlate(platesHorse);
    const primaryHorseYear = primaryYear(platesHorse);
    const primaryTrailer = primaryPlate(platesTrailer);
    const primaryTrailerYear = primaryYear(platesTrailer);

    return {
      id: driver.id,
      photo: driver.photo || null,
      name: driver.name?.trim().toUpperCase() || '',
      cpf: driver.cpf?.trim() || '',
      rg: driver.rg?.trim() || null,
      cnh: driver.cnh?.trim() || null,
      phone: driver.phone?.trim() || null,
      email: driver.email?.trim().toLowerCase() || null,
      plate_horse: primaryHorse?.trim().toUpperCase() || null,
      year_horse: primaryHorseYear?.trim() || null,
      plate_trailer: primaryTrailer?.trim().toUpperCase() || null,
      year_trailer: primaryTrailerYear?.trim() || null,
      plates_horse: platesHorse,
      plates_trailer: platesTrailer,
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
      freight_contract_send_to: driver.freightContractSendTo || null,
      last_freight_contract_date: driver.lastFreightContractDate || null,
      last_freight_contract_location: driver.lastFreightContractLocation?.trim() || null,
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

  mapFromDb: (d: any): Driver => {
    const platesHorse: PlateEntry[] = ensureArray(
      d.plates_horse,
      d.plate_horse || d.plateHorse,
      d.year_horse || d.yearHorse
    );
    const platesTrailer: PlateEntry[] = ensureArray(
      d.plates_trailer,
      d.plate_trailer || d.plateTrailer,
      d.year_trailer || d.yearTrailer
    );

    return {
      id: d.id,
      photo: d.photo,
      name: d.name,
      cpf: d.cpf,
      rg: d.rg,
      cnh: d.cnh,
      phone: d.phone,
      email: d.email,
      plateHorse: primaryPlate(platesHorse) || d.plate_horse || d.plateHorse || '',
      yearHorse: primaryYear(platesHorse) || d.year_horse || d.yearHorse || '',
      plateTrailer: primaryPlate(platesTrailer) || d.plate_trailer || d.plateTrailer || '',
      yearTrailer: primaryYear(platesTrailer) || d.year_trailer || d.yearTrailer || '',
      platesHorse,
      platesTrailer,
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
      freightContractSendTo: d.freight_contract_send_to || d.freightContractSendTo,
      lastFreightContractDate: d.last_freight_contract_date || d.lastFreightContractDate,
      lastFreightContractLocation: d.last_freight_contract_location || d.lastFreightContractLocation,
      currentLat: d.current_lat ? Number(d.current_lat) : undefined,
      currentLng: d.current_lng ? Number(d.current_lng) : undefined,
      lastLocationAt: d.last_location_at || d.lastLocationAt
    };
  },

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
