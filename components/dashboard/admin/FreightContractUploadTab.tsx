import React, { useState, useCallback, useRef, useEffect } from 'react';
import { db } from '../../../utils/storage';
import { fileStorage } from '../../../utils/fileStorage';
import { FreightContract, Trip } from '../../../types';

// ─── Container number extractor ───────────────────────────────────────────────
// ISO 6346: 4 letras + 7 dígitos (ex: MSCU1234567, TCKU 765432-1)

function normalizeContainer(s: string): string {
  return s.toUpperCase().replace(/[\s\-_.]/g, '');
}

function extractContainer(filename: string): string | null {
  const clean = filename.toUpperCase().replace(/\.[^.]+$/, ''); // remove extensão
  // Tenta padrão ISO: 4 letras seguidas de 6-7 dígitos
  const match = clean.match(/[A-Z]{4}[\s\-_]?\d{6,7}/);
  if (!match) return null;
  return normalizeContainer(match[0]);
}

function matchTrip(container: string, trips: Trip[]): Trip | null {
  const norm = normalizeContainer(container);
  return trips.find(t => normalizeContainer(t.container || '') === norm) ?? null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ProcessStatus = 'pending' | 'processing' | 'linked' | 'unlinked' | 'error' | 'saved';

interface FileEntry {
  file:           File;
  id:             string;
  container:      string | null;
  matchedTrip:    Trip | null;
  status:         ProcessStatus;
  savedId?:       string;
  manualTripId?:  string; // para vinculação manual
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  trips: Trip[];
}

const FreightContractUploadTab: React.FC<Props> = ({ trips }) => {
  const [dragging,   setDragging]   = useState(false);
  const [entries,    setEntries]    = useState<FileEntry[]>([]);
  const [contracts,  setContracts]  = useState<FreightContract[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setContracts(await db.getFreightContracts());
    setLoadingHistory(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── File processing ────────────────────────────────────────────────────────

  const processFiles = (files: File[]) => {
    const accepted = files.filter(f =>
      f.type === 'application/pdf' ||
      f.type.startsWith('image/')
    );
    if (!accepted.length) { showToast('Apenas PDF ou imagens são aceitos.', false); return; }

    const newEntries: FileEntry[] = accepted.map(file => {
      const container  = extractContainer(file.name);
      const matchedTrip = container ? matchTrip(container, trips) : null;
      return {
        file,
        id:          `${Date.now()}-${Math.random()}`,
        container,
        matchedTrip,
        status:      matchedTrip ? 'linked' : (container ? 'unlinked' : 'unlinked'),
      };
    });

    setEntries(prev => [...prev, ...newEntries]);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [trips]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const removeEntry = (id: string) =>
    setEntries(prev => prev.filter(e => e.id !== id));

  const patchEntry = (id: string, patch: Partial<FileEntry>) =>
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  // Vinculação manual a uma trip
  const linkManually = (entryId: string, tripId: string) => {
    const trip = trips.find(t => t.id === tripId) ?? null;
    patchEntry(entryId, { matchedTrip: trip, manualTripId: tripId, status: trip ? 'linked' : 'unlinked' });
  };

  // ── Save all ───────────────────────────────────────────────────────────────

  const saveAll = async () => {
    const pending = entries.filter(e => e.status !== 'saved' && e.status !== 'error');
    if (!pending.length) { showToast('Nenhum arquivo para salvar.', false); return; }

    for (const entry of pending) {
      patchEntry(entry.id, { status: 'processing' });
      try {
        const trip = entry.matchedTrip;
        const contractNumber = extractContractNumber(entry.file.name);

        // Upload to R2 storage if trip is linked, otherwise fall back to base64
        let fileUrl: string;
        if (trip) {
          try {
            const existingDocs = trip.freightContractDocs?.length ? trip.freightContractDocs : (trip.freightContractDoc ? [trip.freightContractDoc] : []);
            fileUrl = await fileStorage.uploadFreightContract(entry.file, trip.os, existingDocs.length + 1);
          } catch {
            fileUrl = await readFileAsBase64(entry.file);
          }
        } else {
          fileUrl = await readFileAsBase64(entry.file);
        }

        const savedId = await db.saveFreightContract({
          fileName:       entry.file.name,
          fileUrl,
          contractNumber,
          container:      entry.container ?? undefined,
          tripId:         trip?.id,
          tripOs:         trip?.os,
          destination:    trip?.destination?.name ?? trip?.customer?.name,
          driverId:       trip?.driver?.id ?? undefined,
          driverName:     trip?.driver?.name ?? undefined,
          status:         trip ? 'linked' : 'unlinked',
        });

        // Se vinculado a uma trip, atualiza freightContractDoc e freightContractDocs da trip
        if (trip && savedId) {
          const newDoc = {
            id:         savedId,
            type:       'CONTRATO_FRETE' as const,
            url:        fileUrl,
            fileName:   entry.file.name,
            uploadDate: new Date().toISOString(),
          };
          const existingDocs = trip.freightContractDocs?.length ? trip.freightContractDocs : (trip.freightContractDoc ? [trip.freightContractDoc] : []);
          await db.saveTrip({
            ...trip,
            freightContractDoc: newDoc,
            freightContractDocs: [...existingDocs, newDoc],
          }, { id: 'system', role: 'admin' } as any);

          // Atualiza data e local do último contrato no motorista
          try {
            const drivers = await db.getDrivers();
            const driver = drivers.find(d => d.id === trip.driver?.id);
            if (driver) {
              await db.saveDriver({
                ...driver,
                lastFreightContractDate:     new Date().toISOString().slice(0, 10),
                lastFreightContractLocation: trip.destination?.name ?? trip.customer?.name ?? undefined,
              }, { id: 'system', role: 'admin' } as any);
            }
          } catch { /* non-critical */ }
        }

        patchEntry(entry.id, { status: 'saved', savedId: savedId ?? undefined });
      } catch (err: any) {
        patchEntry(entry.id, { status: 'error' });
        console.error('[FreightContractUpload]', err?.message);
      }
    }

    showToast('Contratos salvos com sucesso!');
    loadHistory();
  };

  // ── Delete from history ────────────────────────────────────────────────────

  const deleteContract = async (id: string) => {
    if (!window.confirm('Remover este contrato?')) return;
    await db.deleteFreightContract(id);
    loadHistory();
  };

  // ── UI ─────────────────────────────────────────────────────────────────────

  const hasPending = entries.some(e => e.status !== 'saved' && e.status !== 'error');

  return (
    <div className="space-y-8">

      {/* Toast */}
      {toast && (
        <div className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 ${
          toast.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                   : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {toast.ok ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          )}
          {toast.msg}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-14 flex flex-col items-center justify-center text-center cursor-pointer transition-all select-none ${
          dragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 bg-white'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,image/*"
          className="hidden"
          onChange={onInputChange}
        />
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-all ${
          dragging ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
        }`}>
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
        </div>
        <p className="text-sm font-black text-slate-700 uppercase tracking-tight">
          {dragging ? 'Solte os arquivos aqui' : 'Arraste os contratos aqui'}
        </p>
        <p className="text-xs text-slate-400 mt-1">ou clique para selecionar — PDF ou imagens</p>
        <p className="text-[10px] text-slate-300 mt-3 uppercase font-bold tracking-widest">
          O container é detectado automaticamente pelo nome do arquivo
        </p>
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
              Arquivos selecionados ({entries.length})
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setEntries([])}
                className="text-[10px] text-slate-400 hover:text-red-500 font-black uppercase transition-all"
              >
                Limpar tudo
              </button>
              {hasPending && (
                <button
                  onClick={saveAll}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                  </svg>
                  Salvar todos
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {entries.map(entry => (
              <FileRow
                key={entry.id}
                entry={entry}
                trips={trips}
                onRemove={() => removeEntry(entry.id)}
                onLink={tripId => linkManually(entry.id, tripId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">
            Histórico de contratos
          </h3>
          <button onClick={loadHistory} className="text-[10px] text-slate-400 hover:text-slate-700 font-black uppercase transition-all">
            ↺ Atualizar
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-12 text-center text-slate-400 text-xs">Carregando...</div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
              </svg>
            </div>
            <p className="text-slate-400 text-xs font-black uppercase">Nenhum contrato enviado ainda</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {contracts.map(c => (
              <div key={c.id} className="px-8 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-all">
                {/* Status */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  c.status === 'linked' ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-slate-700 truncate">{c.fileName}</p>
                  <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                    {c.container && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                        {c.container}
                      </span>
                    )}
                    {c.tripOs && (
                      <span className="text-[10px] text-blue-600 font-black">OS {c.tripOs}</span>
                    )}
                    {c.driverName && (
                      <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-black">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                        </svg>
                        {c.driverName}
                      </span>
                    )}
                    {c.destination && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 truncate max-w-[200px]">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        {c.destination}
                      </span>
                    )}
                    {!c.tripOs && (
                      <span className="text-[10px] text-slate-300 italic">Sem vínculo com viagem</span>
                    )}
                  </div>
                </div>

                {/* Date */}
                <span className="text-[9px] text-slate-300 font-bold whitespace-nowrap">
                  {new Date(c.uploadedAt).toLocaleDateString('pt-BR')}
                </span>

                {/* View + Delete */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.fileUrl && (
                    <button
                      onClick={() => window.open(c.fileUrl, '_blank')}
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-[9px] font-black uppercase transition-all"
                    >
                      Ver
                    </button>
                  )}
                  <button
                    onClick={() => deleteContract(c.id)}
                    className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2.5" strokeLinecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── FileRow ──────────────────────────────────────────────────────────────────

interface FileRowProps {
  entry:    FileEntry;
  trips:    Trip[];
  onRemove: () => void;
  onLink:   (tripId: string) => void;
}

const STATUS_CFG = {
  pending:    { label: 'Pendente',     color: 'bg-slate-100 text-slate-500' },
  processing: { label: 'Processando…', color: 'bg-blue-100 text-blue-600 animate-pulse' },
  linked:     { label: 'Vinculado',    color: 'bg-emerald-100 text-emerald-700' },
  unlinked:   { label: 'Sem vínculo',  color: 'bg-amber-100 text-amber-700' },
  error:      { label: 'Erro',         color: 'bg-red-100 text-red-600' },
  saved:      { label: 'Salvo ✓',      color: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
};

const FileRow: React.FC<FileRowProps> = ({ entry, trips, onRemove, onLink }) => {
  const cfg = STATUS_CFG[entry.status];
  const isSaved = entry.status === 'saved';

  return (
    <div className={`px-8 py-4 flex items-center gap-4 transition-all ${isSaved ? 'opacity-60' : 'hover:bg-slate-50/50'}`}>
      {/* File icon */}
      <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-slate-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-[11px] font-black text-slate-700 truncate">{entry.file.name}</p>
        <div className="flex items-center gap-3 flex-wrap">
          {entry.container ? (
            <span className="flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
              {entry.container}
            </span>
          ) : (
            <span className="text-[10px] text-slate-300 italic">Container não detectado</span>
          )}
          {entry.matchedTrip && (
            <span className="flex items-center gap-1 text-[10px] text-blue-600 font-black">
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              OS {entry.matchedTrip.os} — {entry.matchedTrip.destination?.name ?? entry.matchedTrip.customer?.name ?? '—'}
            </span>
          )}
        </div>
      </div>

      {/* Manual link (only if not saved and no match) */}
      {!isSaved && !entry.matchedTrip && (
        <select
          onChange={e => e.target.value && onLink(e.target.value)}
          defaultValue=""
          className="text-[10px] border border-slate-200 rounded-xl px-3 py-2 text-slate-600 bg-white focus:ring-2 focus:ring-blue-500 outline-none max-w-[200px]"
        >
          <option value="">Vincular manualmente…</option>
          {trips.slice().sort((a, b) => a.os.localeCompare(b.os)).map(t => (
            <option key={t.id} value={t.id}>
              OS {t.os} — {t.container || '—'} — {t.driver?.name || '—'}
            </option>
          ))}
        </select>
      )}

      {/* Status badge */}
      <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase whitespace-nowrap ${cfg.color}`}>
        {cfg.label}
      </span>

      {/* Remove */}
      {!isSaved && (
        <button onClick={onRemove} className="p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-xl transition-all flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeWidth="2.5" strokeLinecap="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractContractNumber(filename: string): string {
  // Remove extensão e retorna nome limpo como número do contrato
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();
}

export default FreightContractUploadTab;
