
import React, { useState, useRef, useCallback } from 'react';
import { FreightContractDoc } from '../../../types';
import { fileStorage } from '../../../utils/fileStorage';
import { extractTextFromPDF, parseFreightContractText, compressPDFForStorage, normAccent } from '../../../utils/freightContractParser';

// ── Estado por arquivo ─────────────────────────────────────────────────────────
type FileStatus = 'parsing' | 'compressing' | 'ready' | 'uploading' | 'done' | 'error';

const fmt = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

interface FileEntry {
  id: string;
  file: File;           // arquivo final (já comprimido se aplicável)
  originalSize: number; // tamanho original para exibição
  status: FileStatus;
  errorMsg?: string;
  compressed: boolean;
  parsed: {
    prevTermino: string;
    localidade: string;
    motorista: string;
    container: string;
  };
}

interface Props {
  tripOS: string;
  tripDriver?: string;   // nome do motorista da viagem para comparação
  existingDocs: FreightContractDoc[];
  onDone: (docs: FreightContractDoc[]) => void;
  onCancel: () => void;
}

const FIELD_LABEL: Record<keyof FileEntry['parsed'], string> = {
  prevTermino: 'Prev. Término',
  localidade: 'Destino/Origem',
  motorista: 'Motorista',
  container: 'Container',
};

const FreightContractDropzone: React.FC<Props> = ({ tripOS, tripDriver, existingDocs, onDone, onCancel }) => {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, delta: Partial<FileEntry>) =>
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, ...delta } : e)));

  const patchParsed = (id: string, field: keyof FileEntry['parsed'], value: string) =>
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, parsed: { ...e.parsed, [field]: value } } : e))
    );

  const processFile = useCallback(async (file: File) => {
    const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const entry: FileEntry = {
      id,
      file,
      originalSize: file.size,
      status: 'parsing',
      compressed: false,
      parsed: { prevTermino: '', localidade: '', motorista: '', container: '' },
    };
    setEntries(prev => [...prev, entry]);

    try {
      // 1. Extrai texto ANTES de comprimir (garante que os dados sejam lidos)
      const text = await extractTextFromPDF(file);
      const parsed = parseFreightContractText(text);

      // 2. Comprime o PDF (só age se > 300 KB)
      patch(id, { status: 'compressing' });
      const { file: finalFile, compressed } = await compressPDFForStorage(file);

      patch(id, {
        file: finalFile,
        compressed,
        status: 'ready',
        parsed: {
          prevTermino: parsed.prevTermino || '',
          localidade: parsed.localidade || '',
          motorista: parsed.motorista || '',
          container: parsed.container || '',
        },
      });
    } catch {
      patch(id, { status: 'error', errorMsg: 'Falha ao processar PDF.' });
    }
  }, []);

  const handleFiles = (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    arr.forEach(processFile);
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Upload e salvar ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    const readyEntries = entries.filter(e => e.status === 'ready');
    if (!readyEntries.length) return;
    setSaving(true);

    const uploaded: FreightContractDoc[] = [...existingDocs];
    const startIdx = existingDocs.length;

    for (let i = 0; i < readyEntries.length; i++) {
      const entry = readyEntries[i];
      patch(entry.id, { status: 'uploading' });
      try {
        const url = await fileStorage.uploadFreightContract(entry.file, tripOS, startIdx + i);
        const uploadDate = new Date();
        const expiresAt = new Date(uploadDate);
        expiresAt.setDate(expiresAt.getDate() + 90);
        const doc: FreightContractDoc = {
          id: entry.id,
          type: 'CONTRATO_FRETE',
          url,
          fileName: entry.file.name,
          uploadDate: uploadDate.toISOString(),
          expiresAt: expiresAt.toISOString(),
          parsedData: {
            prevTermino: entry.parsed.prevTermino || undefined,
            localidade: entry.parsed.localidade || undefined,
            motorista: entry.parsed.motorista || undefined,
            container: entry.parsed.container || undefined,
          },
        };
        uploaded.push(doc);
        patch(entry.id, { status: 'done' });
      } catch (err: any) {
        patch(entry.id, { status: 'error', errorMsg: `Erro no upload: ${err?.message || 'desconhecido'}` });
      }
    }

    setSaving(false);
    onDone(uploaded);
  };

  const remove = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));

  const allReady = entries.length > 0 && entries.every(e => ['ready', 'done', 'error'].includes(e.status));
  const hasReady = entries.some(e => e.status === 'ready');

  // ── Status badge ─────────────────────────────────────────────────────────────
  const Spinner = () => (
    <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );

  const StatusBadge = ({ entry }: { entry: FileEntry }) => {
    const { status, errorMsg, compressed, originalSize, file } = entry;
    if (status === 'parsing')
      return <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 uppercase"><Spinner />Lendo PDF…</span>;
    if (status === 'compressing')
      return <span className="flex items-center gap-1 text-[8px] font-black text-violet-500 uppercase"><Spinner />Comprimindo…</span>;
    if (status === 'uploading')
      return <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 uppercase"><Spinner />Enviando…</span>;
    if (status === 'done')
      return (
        <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase">
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          Salvo
        </span>
      );
    if (status === 'error')
      return (
        <span className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase" title={errorMsg}>
          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          Erro
        </span>
      );
    // ready — mostra tamanho com economia se houve compressão
    if (compressed && file.size < originalSize) {
      const pct = Math.round((1 - file.size / originalSize) * 100);
      return (
        <span className="flex items-center gap-1.5">
          <span className="text-[8px] font-bold text-slate-400 line-through">{fmt(originalSize)}</span>
          <span className="text-[8px] font-black text-emerald-600">{fmt(file.size)}</span>
          <span className="text-[7px] font-black text-emerald-500 bg-emerald-50 border border-emerald-100 rounded px-1">−{pct}%</span>
        </span>
      );
    }
    return <span className="text-[8px] font-bold text-slate-400">{fmt(file.size)}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Zona de Drop */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none
          ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
            {dragging ? 'Solte aqui' : 'Arraste PDFs ou clique para selecionar'}
          </p>
          <p className="text-[9px] font-bold text-slate-400 uppercase">
            Apenas PDF · múltiplos arquivos permitidos
          </p>
        </div>
      </div>

      {/* Cards por arquivo */}
      {entries.length > 0 && (
        <div className="space-y-3">
          {entries.map(entry => {
            // Nome descritivo: usa dados extraídos se disponíveis
            const displayName = entry.parsed.motorista
              ? `Contrato · ${entry.parsed.motorista.split(' ').slice(0, 2).join(' ')}${entry.parsed.container ? ` · ${entry.parsed.container}` : ''}`
              : entry.file.name;

            // Verifica se motorista do PDF bate com o da viagem
            const driverMatch = tripDriver && entry.parsed.motorista
              ? normAccent(entry.parsed.motorista).includes(normAccent(tripDriver.split(' ')[0])) ||
                normAccent(tripDriver).includes(normAccent(entry.parsed.motorista.split(' ')[0]))
              : null;

            return (
              <div
                key={entry.id}
                className={`rounded-2xl border p-4 space-y-3 transition-all
                  ${entry.status === 'error' ? 'border-red-200 bg-red-50' :
                    entry.status === 'done' ? 'border-emerald-200 bg-emerald-50' :
                    'border-slate-200 bg-white'}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-700 leading-tight">
                        {entry.status === 'parsing' || entry.status === 'compressing'
                          ? entry.file.name
                          : displayName}
                      </p>
                      <p className="text-[8px] text-slate-400 font-bold mt-0.5 truncate">{entry.file.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge entry={entry} />
                    {entry.status !== 'uploading' && entry.status !== 'done' && (
                      <button onClick={() => remove(entry.id)}
                        className="p-1 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Campos extraídos */}
                {(entry.status === 'ready' || entry.status === 'error') && (
                  <div className="space-y-2">
                    {/* Motorista em destaque */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Motorista</label>
                        {driverMatch === true && (
                          <span className="flex items-center gap-1 text-[7px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                            <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                            Confere com a viagem
                          </span>
                        )}
                        {driverMatch === false && (
                          <span className="flex items-center gap-1 text-[7px] font-black text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                            Nome diferente da viagem
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={entry.parsed.motorista}
                        onChange={e => patchParsed(entry.id, 'motorista', e.target.value)}
                        placeholder="Não extraído — preencha manualmente"
                        className={`text-[9px] font-bold rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white w-full
                          ${entry.parsed.motorista ? 'text-slate-800 border-slate-200' : 'text-slate-400 border-amber-200 bg-amber-50/30'}`}
                      />
                    </div>

                    {/* Container + Local + Término em linha */}
                    <div className="grid grid-cols-3 gap-2">
                      {(['container', 'localidade', 'prevTermino'] as const).map(field => (
                        <div key={field} className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            {FIELD_LABEL[field]}
                          </label>
                          <input
                            type="text"
                            value={entry.parsed[field]}
                            onChange={e => patchParsed(entry.id, field, e.target.value)}
                            placeholder="—"
                            className={`text-[9px] font-bold rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white
                              ${entry.parsed[field] ? 'text-slate-800 border-slate-200' : 'text-slate-300 border-slate-100'}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {entry.status === 'error' && entry.errorMsg && (
                  <p className="text-[8px] font-bold text-red-500">{entry.errorMsg}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Botões */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2.5 rounded-xl text-[9px] font-black uppercase text-slate-500 hover:bg-slate-100 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!hasReady || saving || !allReady}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95
            ${hasReady && !saving && allReady
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
        >
          {saving ? (
            <>
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Enviando…
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Salvar {entries.filter(e => e.status === 'ready').length > 1
                ? `${entries.filter(e => e.status === 'ready').length} contratos`
                : 'contrato'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FreightContractDropzone;
