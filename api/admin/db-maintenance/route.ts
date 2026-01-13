
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const normalizeFolderName = (name: string): string => {
  return name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .trim();
};

export async function POST(request: Request) {
  const authKey = request.headers.get("x-migration-key");
  if (authKey !== "als-master-2025") {
    return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 403 });
  }

  const results = {
    drivers_updated: 0,
    staff_updated: 0,
    trips_updated: 0
  };

  const domain = (process.env.R2_PUBLIC_DOMAIN || "").replace(/\/$/, "");

  try {
    // 1. STAFF
    const { data: staff } = await supabase.from('staff').select('id, name, photo');
    for (const s of (staff || [])) {
      if (s.photo) {
        const normalized = normalizeFolderName(s.name);
        const newPhotoUrl = `${domain}/als-transportes/colaboradores/${normalized}/foto_perfil/perfil.jpg`;
        if (s.photo !== newPhotoUrl) {
          await supabase.from('staff').update({ photo: newPhotoUrl }).eq('id', s.id);
          await supabase.from('users').update({ photo: newPhotoUrl }).eq('staff_id', s.id);
          results.staff_updated++;
        }
      }
    }

    // 2. MOTORISTAS (CORRIGIDO: Mudar de ID para NOME no link do DB)
    const { data: drivers } = await supabase.from('drivers').select('id, name, photo, cnh_pdf_url');
    for (const d of (drivers || [])) {
      const normalizedName = normalizeFolderName(d.name);
      
      const newPhoto = d.photo ? `${domain}/als-transportes/drivers/${normalizedName}/foto_perfil/perfil.jpg` : null;
      const newCnh = d.cnh_pdf_url ? `${domain}/als-transportes/drivers/${normalizedName}/cnh/cnh.pdf` : null;

      if (newPhoto !== d.photo || newCnh !== d.cnh_pdf_url) {
        await supabase.from('drivers').update({ photo: newPhoto, cnh_pdf_url: newCnh }).eq('id', d.id);
        results.drivers_updated++;
      }
    }

    // 3. TRIPS
    const { data: trips } = await supabase.from('trips').select('id, os_doc, cte_doc, completo_doc');
    for (const t of (trips || [])) {
      let updated = false;
      const updatePayload: any = {};

      const fixDoc = (doc: any) => {
        if (doc && doc.url && !doc.url.includes('/als-transportes/')) {
          const path = doc.url.split('trips/')[1];
          if (path) {
            doc.url = `${domain}/als-transportes/trips/${path}`;
            return true;
          }
        }
        return false;
      };

      if (fixDoc(t.os_doc)) { updatePayload.os_doc = t.os_doc; updated = true; }
      if (fixDoc(t.cte_doc)) { updatePayload.cte_doc = t.cte_doc; updated = true; }
      if (fixDoc(t.completo_doc)) { updatePayload.completo_doc = t.completo_doc; updated = true; }
      
      if (updated) {
        await supabase.from('trips').update(updatePayload).eq('id', t.id);
        results.trips_updated++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: results,
      message: "Storage reorganizado por NOMES e prefixo pai."
    }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
