
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

  const domain = process.env.R2_PUBLIC_DOMAIN || "";
  const cleanDomain = domain.replace(/\/$/, "").replace(/^https?:\/\//, "");

  const fixUrl = (url: string) => {
    if (!url || !url.startsWith('http')) return url;
    if (url.includes('/als-transportes/')) return url;
    if (url.includes(cleanDomain)) {
       return url.replace(cleanDomain, `${cleanDomain}/als-transportes`);
    }
    return url;
  };

  try {
    // 1. STAFF
    const { data: staff } = await supabase.from('staff').select('id, name, photo');
    for (const s of (staff || [])) {
      if (s.photo) {
        const newPhotoUrl = fixUrl(s.photo);
        if (s.photo !== newPhotoUrl) {
          await supabase.from('staff').update({ photo: newPhotoUrl }).eq('id', s.id);
          await supabase.from('users').update({ photo: newPhotoUrl }).eq('staff_id', s.id);
          results.staff_updated++;
        }
      }
    }

    // 2. MOTORISTAS
    const { data: drivers } = await supabase.from('drivers').select('id, photo, cnh_pdf_url');
    for (const d of (drivers || [])) {
      const newPhoto = fixUrl(d.photo);
      const newCnh = fixUrl(d.cnh_pdf_url);
      if (newPhoto !== d.photo || newCnh !== d.cnh_pdf_url) {
        await supabase.from('drivers').update({ photo: newPhoto, cnh_pdf_url: newCnh }).eq('id', d.id);
        results.drivers_updated++;
      }
    }

    // 3. TRIPS (Documentos e driver_docs)
    const { data: trips } = await supabase.from('trips').select('id, os_doc, cte_doc, completo_doc, agendamento_doc, cva_doc, nf_doc, freight_contract_doc, driver_docs');
    for (const t of (trips || [])) {
      let updated = false;
      const updatePayload: any = {};

      const fixDoc = (doc: any) => {
        if (doc && doc.url) {
          const newUrl = fixUrl(doc.url);
          if (newUrl !== doc.url) {
            doc.url = newUrl;
            return true;
          }
        }
        return false;
      };

      if (fixDoc(t.os_doc)) { updatePayload.os_doc = t.os_doc; updated = true; }
      if (fixDoc(t.cte_doc)) { updatePayload.cte_doc = t.cte_doc; updated = true; }
      if (fixDoc(t.completo_doc)) { updatePayload.completo_doc = t.completo_doc; updated = true; }
      if (fixDoc(t.agendamento_doc)) { updatePayload.agendamento_doc = t.agendamento_doc; updated = true; }
      if (fixDoc(t.cva_doc)) { updatePayload.cva_doc = t.cva_doc; updated = true; }
      if (fixDoc(t.nf_doc)) { updatePayload.nf_doc = t.nf_doc; updated = true; }
      if (fixDoc(t.freight_contract_doc)) { updatePayload.freight_contract_doc = t.freight_contract_doc; updated = true; }
      
      // Processamento especial para o array JSON driver_docs
      if (t.driver_docs && Array.isArray(t.driver_docs)) {
        const newDriverDocs = t.driver_docs.map((doc: any) => ({
          ...doc,
          url: fixUrl(doc.url)
        }));
        
        if (JSON.stringify(newDriverDocs) !== JSON.stringify(t.driver_docs)) {
          updatePayload.driver_docs = newDriverDocs;
          updated = true;
        }
      }

      if (updated) {
        await supabase.from('trips').update(updatePayload).eq('id', t.id);
        results.trips_updated++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      summary: results,
      message: "Limpeza de URLs concluída. Todas as fotos pré-12/01 foram corrigidas no banco de dados."
    }), { status: 200 });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
