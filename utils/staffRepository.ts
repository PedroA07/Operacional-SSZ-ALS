
import { SupabaseClient } from '@supabase/supabase-js';
import { Staff } from '../types';

export const staffRepository = {
  mapToDb: (staff: Staff) => ({
    id: staff.id,
    name: staff.name?.toUpperCase() || '',
    username: staff.username?.toLowerCase() || '',
    role: staff.role || 'staff',
    position: staff.position?.toUpperCase() || '',
    registration_date: staff.registrationDate || new Date().toISOString(),
    status: staff.status || 'Ativo',
    status_since: staff.statusSince || new Date().toISOString(),
    photo: staff.photo || null,
    lastlogin: staff.lastLogin || null,
    emailcorp: staff.emailCorp?.toLowerCase() || null,
    phonecorp: staff.phoneCorp || null
  }),

  mapFromDb: (d: any): Staff => ({
    id: d.id,
    name: d.name,
    username: d.username,
    role: d.role,
    position: d.position,
    registrationDate: d.registration_date,
    status: d.status,
    statusSince: d.status_since,
    photo: d.photo,
    lastLogin: d.lastlogin,
    emailCorp: d.emailcorp,
    phoneCorp: d.phonecorp
  }),

  async save(supabase: SupabaseClient, staff: Staff) {
    const payload = this.mapToDb(staff);
    const { error } = await supabase.from('staff').upsert(payload);
    if (error) throw error;
    return true;
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
