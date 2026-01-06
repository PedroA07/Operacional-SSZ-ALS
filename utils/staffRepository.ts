
import { SupabaseClient } from '@supabase/supabase-js';
import { Staff } from '../types';

export const staffRepository = {
  mapToDb: (staff: Staff) => ({
    id: staff.id,
    name: staff.name?.toUpperCase() || '',
    username: staff.username?.toLowerCase() || '',
    role: staff.role || 'staff',
    position: staff.position?.toUpperCase() || '',
    // Garantindo o mapeamento para snake_case esperado pelo banco
    registration_date: staff.registrationDate ? new Date(staff.registrationDate).toISOString() : new Date().toISOString(),
    status: staff.status || 'Ativo',
    status_since: staff.statusSince ? new Date(staff.statusSince).toISOString() : new Date().toISOString(),
    photo: staff.photo || null,
    lastlogin: staff.lastLogin || null,
    emailcorp: staff.emailCorp?.toLowerCase() || null,
    phonecorp: staff.phoneCorp || null
  }),

  mapFromDb: (d: any): Staff => ({
    id: d.id,
    name: d.name || '',
    username: d.username || '',
    role: d.role || 'staff',
    position: d.position || '',
    registrationDate: d.registration_date || d.registrationDate || new Date().toISOString(),
    status: d.status || 'Ativo',
    statusSince: d.status_since || d.statusSince || new Date().toISOString(),
    photo: d.photo || '',
    lastLogin: d.lastlogin || d.lastLogin || null,
    emailCorp: d.emailcorp || d.emailCorp || '',
    phoneCorp: d.phonecorp || d.phoneCorp || ''
  }),

  async save(supabase: SupabaseClient, staff: Staff) {
    try {
      const payload = this.mapToDb(staff);
      const { error } = await supabase.from('staff').upsert(payload);
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Erro no repositório Staff:", error);
      // Se o erro for de coluna faltante, pode ser cache do Supabase
      if (error.message?.includes('registration_date')) {
        throw new Error("A coluna 'registration_date' não foi encontrada. Verifique se executou o SQL de migração no Supabase.");
      }
      throw error;
    }
  },

  async getAll(supabase: SupabaseClient): Promise<Staff[]> {
    const { data, error } = await supabase.from('staff').select('*').order('name');
    if (error) return [];
    return (data || []).map(d => this.mapFromDb(d));
  },

  async delete(supabase: SupabaseClient, id: string) {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
