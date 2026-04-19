
import { SupabaseClient } from '@supabase/supabase-js';
import { Staff } from '../types';

export const staffRepository = {
  mapToDb: (staff: Staff) => ({
    id: staff.id,
    // trim() remove espaços acidentais no início e fim antes de salvar
    name: staff.name?.trim().toUpperCase() || '',
    username: staff.username?.trim().toLowerCase() || '',
    role: staff.role || 'staff',
    position: staff.position?.trim().toUpperCase() || '',
    registration_date: staff.registrationDate || null,
    status: staff.status || 'Ativo',
    status_since: staff.statusSince || null,
    photo: staff.photo || null,
    lastlogin: staff.lastLogin || null,
    emailcorp: staff.emailCorp?.trim().toLowerCase() || null,
    phonecorp: staff.phoneCorp?.trim() || null
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
    emailCorp: d.emailcorp || d.email_corp || d.emailCorp || '',
    phoneCorp: d.phonecorp || d.phone_corp || d.phoneCorp || ''
  }),

  // Fixed: Added password as an optional third argument to match the call in storage.ts
  async save(supabase: SupabaseClient, staff: Staff, password?: string) {
    try {
      const payload = this.mapToDb(staff);
      const { error } = await supabase.from('staff').upsert(payload);
      if (error) throw error;

      // Sincroniza com a tabela de usuários
      if (staff.username) {
        // Prepara o payload do usuário
        const userPayload: any = {
          username: staff.username.toLowerCase(),
          display_name: staff.name.toUpperCase(),
          role: staff.role,
          position: staff.position.toUpperCase(),
          photo: staff.photo || null,
          staff_id: staff.id,
          status: staff.status
        };

        // Se uma senha foi fornecida, inclui no payload
        if (password) {
          userPayload.password = password;
        }

        // Busca se já existe um usuário para este staff_id
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, password')
          .eq('staff_id', staff.id)
          .maybeSingle();

        if (existingUser) {
          // Atualiza usuário existente
          const { error: updateError } = await supabase
            .from('users')
            .update(userPayload)
            .eq('id', existingUser.id);
          if (updateError) throw updateError;
        } else {
          // Cria novo usuário se não existir
          // Garante uma senha inicial se não foi enviada
          if (!userPayload.password) {
            userPayload.password = '12345678';
          }
          userPayload.id = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          userPayload.isfirstlogin = true;
          
          const { error: insertError } = await supabase
            .from('users')
            .insert(userPayload);
          if (insertError) throw insertError;
        }
      }

      return true;
    } catch (error: any) {
      console.error("Erro no repositório Staff:", error);
      throw error;
    }
  },

  async getAll(supabase: SupabaseClient): Promise<Staff[]> {
    const { data, error } = await supabase.from('staff').select('*').order('name');
    if (error) return [];
    return (data || []).map(d => this.mapFromDb(d));
  },

  async delete(supabase: SupabaseClient, id: string) {
    // Primeiro remove o usuário vinculado
    await supabase.from('users').delete().eq('staff_id', id);
    
    // Depois remove o colaborador
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
