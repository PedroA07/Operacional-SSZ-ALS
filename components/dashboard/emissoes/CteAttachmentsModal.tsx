
import React, { useMemo, useRef, useState } from 'react';
import { Trip, EmissaoCteAttachment, CteDocParty } from '../../../types';
import { fileStorage } from '../../../utils/fileStorage';
import { cteXmlToPdfBlob, extractCteSummary } from '../../../utils/cteXmlToPdf';
import { parseNfeXml } from '../../../utils/nfeXmlParser';
import { nfeXmlToPdfBlob } from '../../../utils/nfeXmlToPdf';
import ConfirmDialog from '../../shared/ConfirmDialog';
import { downloadFile, downloadBlob, fetchFileBlob } from '../../../utils/fileDownloader';
import CteViewerModal from './CteViewerModal';
import { fmtMoney, fmtQty, copyMoney, copyQty, fmtCnpjCpf, sumUnVolumes, CopyButton, PartyCard } from './cteDisplay';
import { resolveClienteDestino, tipoOperacaoIdentificado, ParsedAliancaOs } from '../../../utils/aliancaOsParser';

interface CteAttachmentsModalProps {
  trip: Trip;
  onClose: () => void;
  onUpdate: (trip: Trip, data: Partial<Trip>) => Promise<void>;
}

const genId = () => `cte-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const DownloadIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
  </svg>
);

const CteAttachmentsModal: React.FC<CteAttachmentsModalProps> = ({ trip, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'anexos' | 'valores'>('anexos');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EmissaoCteAttachment | null>(null);
  const [viewer, setViewer] = useState<{ att: EmissaoCteAttachment; url: string; title: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [bundleLoading, setBundleLoading] = useState<'pdf' | 'xml' | 'all' | null>(null);

  const attachments = trip.emissaoCteAttachments || [];
  // Regra visual da Aliança (aba Valores): CT-e de transporte → RODOVIÁRIO;
  // CT-e referenciado → MULTIMODAL — ajuda no preenchimento de sistemas externos
  const isAlianca = (trip.category || '').toUpperCase().includes('ALIAN');

  // Nome base dos arquivos baixados: "OS - CONTAINER"
  const baseName = useMemo(() => {
    const os = trip.os?.trim().toUpperCase() || 'OS';
    const container = trip.container?.trim().toUpperCase();
    return container ? `${os} - ${container}` : os;
  }, [trip.os, trip.container]);

  // Nome individual: "OS - CONTAINER - CTE 12345.ext" (nº do documento ou nome original)
  const attFileName = (att: EmissaoCteAttachment, ext: 'pdf' | 'xml') => {
    const id = att.cteNumber ? `CTE ${att.cteNumber}`
      : att.nfeInfo?.numero ? `NF-e ${att.nfeInfo.numero}`
      : att.fileName.replace(/\.[^.]+$/, '');
    return `${baseName} - ${id}.${ext}`;
  };

  // ── Download compilado (PDF unificado / XMLs / tudo) ───────────────────────
  const handleBundleDownload = async (mode: 'pdf' | 'xml' | 'all') => {
    setBundleLoading(mode);
    setErrors([]);
    const newErrors: string[] = [];
    try {
      const pdfAtts = attachments.filter(a => a.fileType === 'pdf' || a.pdfUrl);
      const xmlAtts = attachments.filter(a => a.fileType === 'xml');

      if (mode === 'pdf') {
        if (pdfAtts.length === 0) throw new Error('Nenhum PDF disponível.');
        if (pdfAtts.length === 1) {
          const a = pdfAtts[0];
          await downloadFile(a.fileType === 'pdf' ? a.url : a.pdfUrl!, attFileName(a, 'pdf'));
        } else {
          const blobs: Blob[] = [];
          for (const a of pdfAtts) {
            try {
              blobs.push(await fetchFileBlob(a.fileType === 'pdf' ? a.url : a.pdfUrl!));
            } catch { newErrors.push(`"${a.fileName}": falha ao baixar para o compilado.`); }
          }
          if (blobs.length === 0) throw new Error('Não foi possível baixar os PDFs.');
          const { mergePdfBlobs } = await import('../../../utils/pdfMerger');
          downloadBlob(await mergePdfBlobs(blobs), `${baseName}.pdf`);
        }
      } else if (mode === 'xml') {
        if (xmlAtts.length === 0) throw new Error('Nenhum XML disponível.');
        if (xmlAtts.length === 1) {
          await downloadFile(xmlAtts[0].url, attFileName(xmlAtts[0], 'xml'));
        } else {
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          for (const a of xmlAtts) {
            try { zip.file(attFileName(a, 'xml'), await fetchFileBlob(a.url)); }
            catch { newErrors.push(`"${a.fileName}": falha ao baixar para o compilado.`); }
          }
          downloadBlob(await zip.generateAsync({ type: 'blob' }), `${baseName} - XML.zip`);
        }
      } else {
        // Tudo: ZIP com PDFs + XMLs
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        let count = 0;
        for (const a of pdfAtts) {
          try { zip.file(attFileName(a, 'pdf'), await fetchFileBlob(a.fileType === 'pdf' ? a.url : a.pdfUrl!)); count++; }
          catch { newErrors.push(`"${a.fileName}": falha ao baixar para o compilado.`); }
        }
        for (const a of xmlAtts) {
          try { zip.file(attFileName(a, 'xml'), await fetchFileBlob(a.url)); count++; }
          catch { newErrors.push(`"${a.fileName}": falha ao baixar para o compilado.`); }
        }
        if (count === 0) throw new Error('Não foi possível baixar os arquivos.');
        downloadBlob(await zip.generateAsync({ type: 'blob' }), `${baseName}.zip`);
      }
    } catch (e: any) {
      console.error('Erro no download compilado:', e);
      newErrors.push(`Compilado: ${e?.message || 'erro desconhecido'}.`);
    } finally {
      setErrors(newErrors);
      setBundleLoading(null);
    }
  };

  // ── Consolidação dos valores do processo ───────────────────────────────────
  const summary = useMemo(() => {
    const withInfo = attachments.filter(a => a.cteInfo);

    // Detecta CT-e duplicado (mesma chave ou mesmo nº) — só o primeiro entra nos totais
    const duplicateIds = new Set<string>();
    const seenKeys = new Set<string>();
    const uniqueInfo: EmissaoCteAttachment[] = [];
    withInfo.forEach(a => {
      const info = a.cteInfo!;
      const key = info.chave || (info.numero ? `n:${info.numero}` : `id:${a.id}`);
      if (seenKeys.has(key)) {
        duplicateIds.add(a.id);
      } else {
        seenKeys.add(key);
        uniqueInfo.push(a);
      }
    });

    let totalPrestacao: number | undefined;
    let totalCarga: number | undefined;
    const volumeTotals = new Map<string, { tipo: string; unidade?: string; total: number }>();
    const remetentes = new Map<string, { party: CteDocParty; ctes: string[] }>();
    const destinatarios = new Map<string, { party: CteDocParty; ctes: string[] }>();

    uniqueInfo.forEach(a => {
      const info = a.cteInfo!;
      const cteLabel = info.numero || a.fileName;
      if (info.valorPrestacao !== undefined) totalPrestacao = (totalPrestacao || 0) + info.valorPrestacao;
      if (info.valorCarga !== undefined) totalCarga = (totalCarga || 0) + info.valorCarga;
      (info.volumes || []).forEach(v => {
        const key = `${v.tipo.toUpperCase()}|${v.unidade || ''}`;
        const cur = volumeTotals.get(key);
        if (cur) cur.total += v.quantidade;
        else volumeTotals.set(key, { tipo: v.tipo, unidade: v.unidade, total: v.quantidade });
      });
      const addParty = (map: Map<string, { party: CteDocParty; ctes: string[] }>, p?: CteDocParty) => {
        if (!p || (!p.nome && !p.cnpjCpf)) return;
        const key = p.cnpjCpf || p.nome || '';
        const cur = map.get(key);
        if (cur) { if (!cur.ctes.includes(cteLabel)) cur.ctes.push(cteLabel); }
        else map.set(key, { party: p, ctes: [cteLabel] });
      };
      addParty(remetentes, info.remetente);
      addParty(destinatarios, info.destinatario);
    });

    // NF-es: totais próprios (separados dos CT-es), com dedupe por chave/nº
    const nfes = attachments.filter(a => a.docType === 'nfe' && a.nfeInfo);
    const nfeDuplicateIds = new Set<string>();
    const nfeSeen = new Set<string>();
    let nfeUniqueCount = 0;
    let nfeTotalValor: number | undefined;
    let nfeTotalPesoBruto: number | undefined;
    let nfeTotalPesoLiquido: number | undefined;
    let nfeTotalVolumes: number | undefined;
    nfes.forEach(a => {
      const info = a.nfeInfo!;
      const key = info.chave || (info.numero ? `n:${info.numero}` : `id:${a.id}`);
      if (nfeSeen.has(key)) { nfeDuplicateIds.add(a.id); return; }
      nfeSeen.add(key);
      nfeUniqueCount++;
      if (info.valorNf !== undefined) nfeTotalValor = (nfeTotalValor || 0) + info.valorNf;
      if (info.pesoBruto !== undefined) nfeTotalPesoBruto = (nfeTotalPesoBruto || 0) + info.pesoBruto;
      if (info.pesoLiquido !== undefined) nfeTotalPesoLiquido = (nfeTotalPesoLiquido || 0) + info.pesoLiquido;
      if (info.qVolumes !== undefined) nfeTotalVolumes = (nfeTotalVolumes || 0) + info.qVolumes;
    });

    return {
      withInfo,
      uniqueCount: uniqueInfo.length,
      duplicateIds,
      nfes,
      nfeDuplicateIds,
      nfeUniqueCount,
      nfeTotalValor,
      nfeTotalPesoBruto,
      nfeTotalPesoLiquido,
      nfeTotalVolumes,
      semInfo: attachments.filter(a => !a.cteInfo && a.docType !== 'nfe'),
      totalPrestacao,
      totalCarga,
      volumeTotals: Array.from(volumeTotals.values()),
      remetentes: Array.from(remetentes.values()),
      destinatarios: Array.from(destinatarios.values()),
    };
  }, [attachments]);

  // Pesos vindos da OS importada (tara + peso da carga e a soma)
  const pesosOs = useMemo(() => {
    const parse = (v?: string) => {
      const n = parseFloat((v || '').replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? undefined : n;
    };
    const tara = parse(trip.tara);
    const pesoCarga = parse(trip.pesoCarga);
    const soma = tara !== undefined || pesoCarga !== undefined
      ? (tara || 0) + (pesoCarga || 0)
      : undefined;
    return { tara, pesoCarga, soma };
  }, [trip.tara, trip.pesoCarga]);

  // Dados completos da OS importada (PDF Aliança) — exibidos no topo da aba Valores
  const osData = useMemo(() => {
    const p = trip.osImportData as ParsedAliancaOs | undefined;
    if (!p || !p.os) return null;
    return { p, cd: resolveClienteDestino(p) };
  }, [trip.osImportData]);

  // ── Upload ─────────────────────────────────────────────────────────────────
  const processFiles = async (files: File[]) => {
    const valid = files.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'pdf' || ext === 'xml';
    });
    const rejected = files.length - valid.length;
    const newErrors: string[] = [];
    if (rejected > 0) newErrors.push(`${rejected} arquivo(s) ignorado(s) — apenas PDF ou XML são aceitos.`);
    if (valid.length === 0) { setErrors(newErrors); return; }

    setUploading(true);
    setErrors([]);
    const newAttachments: EmissaoCteAttachment[] = [];
    let extractedCteNumber: string | undefined;

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i];
      const isXml = file.name.split('.').pop()?.toLowerCase() === 'xml';
      setProgress(`Enviando ${i + 1}/${valid.length}: ${file.name}`);
      try {
        const url = await fileStorage.uploadEmissaoCte(file, trip.os);
        const att: EmissaoCteAttachment = {
          id: genId(),
          url,
          fileName: file.name,
          fileType: isXml ? 'xml' : 'pdf',
          uploadDate: new Date().toISOString(),
        };

        if (isXml) {
          setProgress(`Convertendo ${file.name} para PDF...`);
          try {
            const xmlText = await file.text();
            const result = cteXmlToPdfBlob(xmlText);
            if (result) {
              att.docType = 'cte';
              const baseName = file.name.replace(/\.[^.]+$/, '');
              const pdfFile = new File([result.blob], `dacte_${baseName}.pdf`, { type: 'application/pdf' });
              att.pdfUrl = await fileStorage.uploadEmissaoCte(pdfFile, trip.os);
              att.cteInfo = extractCteSummary(result.data);
              if (result.data.numero) {
                att.cteNumber = result.data.numero;
                extractedCteNumber = extractedCteNumber || result.data.numero;
              }
            } else {
              // Não é CT-e — tenta interpretar como NF-e (modelo 55)
              const nfe = parseNfeXml(xmlText);
              if (nfe) {
                att.docType = 'nfe';
                att.nfeInfo = nfe;
                // Gera o DANFE em PDF para visualização nativa
                try {
                  const danfe = nfeXmlToPdfBlob(xmlText);
                  if (danfe) {
                    const baseName = file.name.replace(/\.[^.]+$/, '');
                    const pdfFile = new File([danfe.blob], `danfe_${baseName}.pdf`, { type: 'application/pdf' });
                    att.pdfUrl = await fileStorage.uploadEmissaoCte(pdfFile, trip.os);
                  }
                } catch (danfeErr) {
                  console.error('Erro na conversão NF-e→PDF:', danfeErr);
                  newErrors.push(`"${file.name}": NF-e anexada, mas houve erro na conversão para PDF.`);
                }
              } else {
                newErrors.push(`"${file.name}": XML anexado, mas não foi reconhecido como CT-e nem NF-e.`);
              }
            }
          } catch (convErr) {
            console.error('Erro na conversão XML→PDF:', convErr);
            newErrors.push(`"${file.name}": XML anexado, mas houve erro na conversão para PDF.`);
          }
        } else {
          // PDF: extrai valores da camada de texto do DACTE (best-effort)
          setProgress(`Lendo valores de ${file.name}...`);
          try {
            const { parseCtePdf } = await import('../../../utils/ctePdfParser');
            const result = await parseCtePdf(file);
            if (result.found) {
              att.cteInfo = result.summary;
              if (result.summary.numero) {
                att.cteNumber = result.summary.numero;
                extractedCteNumber = extractedCteNumber || result.summary.numero;
              }
            } else {
              newErrors.push(`"${file.name}": PDF anexado; não foi possível extrair valores automaticamente (PDF sem camada de texto ou layout não reconhecido). Para valores completos, anexe também o XML.`);
            }
          } catch (parseErr) {
            console.error('Erro ao extrair valores do PDF:', parseErr);
            newErrors.push(`"${file.name}": PDF anexado; houve erro na leitura dos valores.`);
          }
        }

        newAttachments.push(att);
      } catch (e: any) {
        console.error('Erro no upload do anexo CT-e:', e);
        newErrors.push(`"${file.name}": falha no upload — ${e?.message || 'erro desconhecido'}.`);
      }
    }

    if (newAttachments.length > 0) {
      setProgress('Salvando...');
      const data: Partial<Trip> = {
        emissaoCteAttachments: [...attachments, ...newAttachments],
      };
      // Preenche o nº do CT-e automaticamente a partir do XML, se ainda não informado
      if (extractedCteNumber && !trip.emissaoCteNumber) {
        data.emissaoCteNumber = extractedCteNumber;
      }
      await onUpdate(trip, data);
    }

    setErrors(newErrors);
    setProgress('');
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async (att: EmissaoCteAttachment) => {
    setDeletingId(att.id);
    try {
      // Exclusão do bucket é best-effort — o registro é removido mesmo se falhar
      await fileStorage.deleteFile(att.url).catch(e => console.warn('Falha ao excluir arquivo do bucket:', e));
      if (att.pdfUrl) {
        await fileStorage.deleteFile(att.pdfUrl).catch(e => console.warn('Falha ao excluir PDF gerado do bucket:', e));
      }
      const remaining = attachments.filter(a => a.id !== att.id);
      await onUpdate(trip, { emissaoCteAttachments: remaining });
    } catch (e) {
      console.error('Erro ao excluir anexo:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const handleView = (att: EmissaoCteAttachment) => {
    if (att.fileType === 'pdf') {
      setViewer({ att, url: att.url, title: `CT-E — ${att.fileName}` });
    } else if (att.pdfUrl) {
      setViewer({ att, url: att.pdfUrl, title: `${att.docType === 'nfe' ? 'DANFE' : 'DACTE'} — ${att.fileName}` });
    } else {
      window.open(att.url, '_blank', 'noopener');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[3000] p-4 animate-in fade-in duration-200"
        onClick={e => { if (e.target === e.currentTarget && !uploading) onClose(); }}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh]">

          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3 shrink-0">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Anexos CT-E</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                OS <span className="font-black text-slate-700">{trip.os}</span>
                {trip.container ? <> — Container <span className="font-black text-indigo-600">{trip.container}</span></> : null}
                {' '}— anexe os CT-Es em PDF ou XML.
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={uploading}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="px-5 shrink-0">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
              {([
                { id: 'anexos', label: 'Anexos', count: attachments.length },
                { id: 'valores', label: 'Valores do CT-E', count: summary.withInfo.length },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 shadow-sm border border-blue-100'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-4 space-y-3 overflow-y-auto">

            {/* ══ Aba Anexos ══════════════════════════════════════════════════ */}
            {activeTab === 'anexos' && (
              <>
                {/* Dropzone */}
                <div
                  onClick={() => !uploading && inputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOver(false);
                    if (!uploading) processFiles(Array.from(e.dataTransfer.files));
                  }}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                    uploading
                      ? 'border-slate-200 bg-slate-50 cursor-wait'
                      : dragOver
                        ? 'border-blue-400 bg-blue-50 cursor-pointer'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.xml,application/pdf,text/xml"
                    multiple
                    className="hidden"
                    onChange={e => processFiles(Array.from(e.target.files || []))}
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-[10px] font-bold text-slate-600">{progress}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5">
                      <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                      <p className="text-[11px] font-black text-slate-600 uppercase">Clique ou arraste arquivos aqui</p>
                      <p className="text-[9px] text-slate-400">
                        PDF ou XML — pode anexar vários. XMLs de CT-e são convertidos automaticamente para PDF (DACTE).
                      </p>
                    </div>
                  )}
                </div>

                {/* Errors */}
                {errors.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-1">
                    {errors.map((err, i) => (
                      <p key={i} className="text-[9px] font-bold text-amber-700 flex items-start gap-1.5">
                        <svg className="w-3 h-3 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                        {err}
                      </p>
                    ))}
                  </div>
                )}

                {/* Download compilado */}
                {attachments.length > 0 && (() => {
                  const hasPdf = attachments.some(a => a.fileType === 'pdf' || a.pdfUrl);
                  const hasXml = attachments.some(a => a.fileType === 'xml');
                  const btn = (mode: 'pdf' | 'xml' | 'all', label: string, cls: string) => (
                    <button
                      type="button"
                      onClick={() => handleBundleDownload(mode)}
                      disabled={bundleLoading !== null}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all disabled:opacity-50 ${cls}`}
                    >
                      {bundleLoading === mode ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                      )}
                      {label}
                    </button>
                  );
                  return (
                    <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-2xl flex-wrap">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mr-1">
                        Baixar compilado ({baseName}):
                      </span>
                      {hasPdf && btn('pdf', attachments.filter(a => a.fileType === 'pdf' || a.pdfUrl).length > 1 ? 'PDF unificado' : 'PDF', 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')}
                      {hasXml && btn('xml', attachments.filter(a => a.fileType === 'xml').length > 1 ? 'XML (ZIP)' : 'XML', 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100')}
                      {hasPdf && hasXml && btn('all', 'Os dois (ZIP)', 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100')}
                    </div>
                  );
                })()}

                {/* Attachment list */}
                {attachments.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-3 italic">Nenhum anexo ainda.</p>
                ) : (
                  <div className="space-y-1.5">
                    {attachments.map(att => {
                      const isXml = att.fileType === 'xml';
                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-2xl hover:border-blue-200 transition-all"
                        >
                          {/* Type badge */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[8px] font-black ${
                            isXml ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {isXml ? 'XML' : 'PDF'}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-700 truncate" title={att.fileName}>{att.fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[8px] text-slate-400">
                                {new Date(att.uploadDate).toLocaleDateString('pt-BR')}
                              </span>
                              {att.cteNumber && (
                                <span className="text-[8px] font-black text-blue-600">CT-E {att.cteNumber}</span>
                              )}
                              {att.docType === 'nfe' && (
                                <span className="text-[7px] px-1.5 py-px bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-black uppercase">
                                  NF-e {att.nfeInfo?.numero || ''}
                                </span>
                              )}
                              {att.cteInfo?.modal && (
                                <span className="text-[7px] px-1.5 py-px bg-blue-50 text-blue-600 border border-blue-200 rounded font-black uppercase">
                                  {att.cteInfo.modal}
                                </span>
                              )}
                              {isXml && !att.pdfUrl && att.docType !== 'nfe' && (
                                <span className="text-[7px] px-1.5 py-px bg-slate-200 text-slate-500 rounded font-black uppercase" title="XML não reconhecido como CT-e">sem prévia</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleView(att)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              title={isXml && att.pdfUrl ? 'Visualizar DACTE (PDF)' : 'Visualizar'}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                            </button>

                            {/* Download XML (original) */}
                            {isXml && (
                              <button
                                type="button"
                                onClick={() => downloadFile(att.url, attFileName(att, 'xml'))}
                                className="flex items-center gap-1 px-1.5 py-1 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg text-[7px] font-black uppercase transition-colors"
                                title="Baixar XML original"
                              >
                                <DownloadIcon /> XML
                              </button>
                            )}

                            {/* Download PDF (original ou DACTE gerado) */}
                            {(!isXml || att.pdfUrl) && (
                              <button
                                type="button"
                                onClick={() => downloadFile(isXml ? att.pdfUrl! : att.url, attFileName(att, 'pdf'))}
                                className="flex items-center gap-1 px-1.5 py-1 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-[7px] font-black uppercase transition-colors"
                                title={isXml ? 'Baixar DACTE em PDF' : 'Baixar PDF'}
                              >
                                <DownloadIcon /> PDF
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setConfirmDelete(att)}
                              disabled={deletingId === att.id}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40"
                              title="Excluir anexo"
                            >
                              {deletingId === att.id ? (
                                <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ══ Aba Valores ═════════════════════════════════════════════════ */}
            {activeTab === 'valores' && (
              summary.withInfo.length === 0 && summary.nfes.length === 0 && pesosOs.soma === undefined && !osData ? (
                <div className="text-center py-8 space-y-1">
                  <p className="text-[11px] font-black text-slate-500 uppercase">Sem valores para exibir</p>
                  <p className="text-[9px] text-slate-400 max-w-xs mx-auto">
                    Os valores são extraídos automaticamente dos anexos em <span className="font-bold">XML</span> (CT-e ou NF-e) e,
                    quando possível, da camada de texto de anexos em <span className="font-bold">PDF</span>.
                    Para dados completos e confiáveis, prefira anexar o XML.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">

                  {/* ── 1. DADOS DA OS (sempre no topo): OS, tomador, cliente e
                        destino — tipo identificado pelos remetentes/destinatários */}
                  {osData && (() => {
                    const { p, cd } = osData;
                    return (
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Dados da OS</p>
                        <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-[10px] font-black text-slate-800 flex items-center gap-0.5">
                              OS {p.os}
                              <CopyButton value={p.os || ''} title="Copiar OS" />
                            </p>
                            <span
                              className="text-[7px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded font-black uppercase"
                              title={`Tipo identificado pelas partes da OS (remetente/destinatário)${p.tipoOperacao ? ` — título da OS: ${p.tipoOperacao}` : ''}`}
                            >
                              {tipoOperacaoIdentificado(p)}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-amber-200/70">
                            <div>
                              <p className="text-[7px] font-black text-amber-600 uppercase">Tomador · A Faturar</p>
                              <p className="text-[9px] font-black text-slate-800 flex items-center gap-0.5 break-words">
                                {p.faturarNome || '—'}
                                {p.faturarNome && <CopyButton value={p.faturarNome} title="Copiar tomador" />}
                              </p>
                              {p.faturarCnpj && (
                                <p className="text-[8px] font-bold text-slate-500 flex items-center gap-0.5">
                                  {fmtCnpjCpf(p.faturarCnpj)}
                                  <CopyButton value={p.faturarCnpj.replace(/\D/g, '')} title="Copiar CNPJ do tomador (só números)" />
                                </p>
                              )}
                            </div>
                            <div>
                              <p className="text-[7px] font-black text-amber-600 uppercase">Cliente · {cd.clienteOrigem}</p>
                              <p className="text-[9px] font-black text-slate-800 flex items-center gap-0.5 break-words">
                                {cd.clienteNome || '—'}
                                {cd.clienteNome && <CopyButton value={cd.clienteNome} title="Copiar cliente" />}
                              </p>
                              {cd.clienteCnpj && (
                                <p className="text-[8px] font-bold text-slate-500 flex items-center gap-0.5">
                                  {fmtCnpjCpf(cd.clienteCnpj)}
                                  <CopyButton value={cd.clienteCnpj.replace(/\D/g, '')} title="Copiar CNPJ (só números)" />
                                </p>
                              )}
                              {(cd.clienteMunicipio || cd.clienteUf) && (
                                <p className="text-[8px] text-slate-500">{cd.clienteMunicipio}{cd.clienteUf ? ` - ${cd.clienteUf}` : ''}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-[7px] font-black text-amber-600 uppercase">Destino · {cd.destinoOrigem}</p>
                              <p className="text-[9px] font-black text-slate-800 flex items-center gap-0.5 break-words">
                                {cd.destinoNome || '—'}
                                {cd.destinoNome && <CopyButton value={cd.destinoNome} title="Copiar destino" />}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Pesos da OS: tara + peso da carga + soma */}
                  {pesosOs.soma !== undefined && (
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Pesos da OS</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Tara</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            <p className="text-sm font-black text-slate-700">
                              {pesosOs.tara !== undefined ? `${fmtQty(pesosOs.tara)} KG` : '—'}
                            </p>
                            {pesosOs.tara !== undefined && <CopyButton value={copyQty(pesosOs.tara)} title="Copiar tara" />}
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                          <p className="text-[8px] font-black text-slate-400 uppercase">Peso da Carga</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            <p className="text-sm font-black text-slate-700">
                              {pesosOs.pesoCarga !== undefined ? `${fmtQty(pesosOs.pesoCarga)} KG` : '—'}
                            </p>
                            {pesosOs.pesoCarga !== undefined && <CopyButton value={copyQty(pesosOs.pesoCarga)} title="Copiar peso da carga" />}
                          </div>
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                          <p className="text-[8px] font-black text-amber-600 uppercase">Peso Total (Soma)</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            <p className="text-sm font-black text-amber-700">{fmtQty(pesosOs.soma)} KG</p>
                            <CopyButton value={copyQty(pesosOs.soma)} title="Copiar peso total (tara + carga)" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── 2. DADOS DOS CT-ES ──────────────────────────────────── */}
                  {summary.withInfo.length > 0 && (
                  <>
                  {/* Lembrete Aliança para preenchimento em sistema externo */}
                  {isAlianca && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-start gap-2">
                      <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <p className="text-[9px] font-bold text-indigo-700 leading-relaxed">
                        <span className="font-black uppercase">Aliança:</span> no preenchimento externo, o CT-e de{' '}
                        <span className="font-black">transporte</span> é sempre <span className="font-black text-blue-700">RODOVIÁRIO</span> e o CT-e{' '}
                        <span className="font-black">referenciado</span> é sempre <span className="font-black text-purple-700">MULTIMODAL</span>.
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Totais dos CT-Es</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                        <p className="text-[8px] font-black text-blue-500 uppercase">CT-Es</p>
                        <p className="text-base font-black text-blue-700 mt-0.5">{summary.uniqueCount}</p>
                        {summary.duplicateIds.size > 0 && (
                          <p className="text-[7px] font-black text-amber-600 uppercase mt-0.5">
                            +{summary.duplicateIds.size} duplicado(s) fora dos totais
                          </p>
                        )}
                      </div>
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                        <p className="text-[8px] font-black text-indigo-500 uppercase">Valor da Mercadoria</p>
                        <div className="flex items-center gap-0.5 mt-1">
                          <p className="text-sm font-black text-indigo-700">{fmtMoney(summary.totalCarga)}</p>
                          <CopyButton value={copyMoney(summary.totalCarga)} title="Copiar total" />
                        </div>
                      </div>
                    </div>
                    {summary.volumeTotals.length > 0 && (
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Volume Total</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                          {summary.volumeTotals.map((v, i) => (
                            <p key={i} className="text-[10px] font-black text-slate-700 flex items-center gap-0.5">
                              {v.tipo}: <span className="text-blue-700">{fmtQty(v.total)}{v.unidade ? ` ${v.unidade}` : ''}</span>
                              <CopyButton value={copyQty(v.total)} title={`Copiar total de ${v.tipo.toLowerCase()}`} />
                            </p>
                          ))}
                          {(() => {
                            const totalUn = summary.volumeTotals.filter(v => v.unidade === 'UN').reduce((s, v) => s + v.total, 0);
                            return totalUn > 0 ? (
                              <p className="text-[10px] font-black text-amber-700 flex items-center gap-0.5">
                                Qtde de Volumes: <span>{fmtQty(totalUn)}</span>
                                <CopyButton value={copyQty(totalUn)} title="Copiar quantidade total de volumes" />
                              </p>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Por CT-e */}
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Por CT-E</p>
                    <div className="space-y-1.5">
                      {summary.withInfo.map(att => {
                        const info = att.cteInfo!;
                        return (
                          <div key={att.id} className={`p-3 bg-white border rounded-2xl ${summary.duplicateIds.has(att.id) ? 'border-amber-300' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <p className="text-[10px] font-black text-slate-800">
                                  CT-E {info.numero || '—'}{info.serie ? <span className="text-slate-400 font-bold"> · Série {info.serie}</span> : null}
                                </p>
                                <CopyButton value={info.numero} title="Copiar nº do CT-e" />
                                {info.chave && <CopyButton value={info.chave} title="Copiar chave de acesso (sem espaços)" />}
                                {info.modal && (
                                  isAlianca ? (
                                    info.modal === 'RODOVIÁRIO' ? (
                                      <span className="text-[7px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded font-black uppercase shrink-0" title="CT-e de transporte — preencher como RODOVIÁRIO no sistema externo">
                                        TRANSPORTE · RODOVIÁRIO
                                      </span>
                                    ) : (
                                      <span className="text-[7px] px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 rounded font-black uppercase shrink-0" title={`CT-e referenciado (modal ${info.modal}) — preencher como MULTIMODAL no sistema externo`}>
                                        REFERENCIADO · MULTIMODAL
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-[7px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded font-black uppercase shrink-0">
                                      {info.modal}
                                    </span>
                                  )
                                )}
                                {summary.duplicateIds.has(att.id) && (
                                  <span className="text-[7px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-black uppercase shrink-0" title="CT-e repetido — não é somado nos totais do processo">
                                    Duplicado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {info.dataEmissao && (
                                  <>
                                    <span className="text-[8px] text-slate-400">
                                      {new Date(info.dataEmissao).toLocaleDateString('pt-BR')}
                                    </span>
                                    <CopyButton value={new Date(info.dataEmissao).toLocaleDateString('pt-BR')} title="Copiar data de emissão" />
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase">Valor da Mercadoria</p>
                                <div className="flex items-center gap-0.5">
                                  <p className="text-[10px] font-black text-indigo-700">{fmtMoney(info.valorCarga)}</p>
                                  <CopyButton value={copyMoney(info.valorCarga)} title="Copiar valor" />
                                </div>
                              </div>
                              <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase">Volume</p>
                                {(info.volumes && info.volumes.length > 0) ? (
                                  <>
                                    {info.volumes.map((v, i) => (
                                      <p key={i} className="text-[9px] font-black text-slate-700 flex items-center gap-0.5">
                                        {v.tipo}: {fmtQty(v.quantidade)}{v.unidade ? ` ${v.unidade}` : ''}
                                        <CopyButton value={copyQty(v.quantidade)} title={`Copiar ${v.tipo.toLowerCase()}`} />
                                      </p>
                                    ))}
                                    {sumUnVolumes(info.volumes) > 0 && (
                                      <p className="text-[9px] font-black text-amber-700 flex items-center gap-0.5">
                                        Qtde volumes: {fmtQty(sumUnVolumes(info.volumes))}
                                        <CopyButton value={copyQty(sumUnVolumes(info.volumes))} title="Copiar quantidade de volumes" />
                                      </p>
                                    )}
                                  </>
                                ) : <p className="text-[10px] font-black text-slate-300">—</p>}
                              </div>
                            </div>
                            {info.chavesNfe && info.chavesNfe.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-100">
                                <p className="text-[7px] font-black text-slate-400 uppercase mb-1">
                                  Notas Fiscais ({info.chavesNfe.length})
                                </p>
                                <div className="space-y-0.5">
                                  {info.chavesNfe.map((nfe, i) => {
                                    const isChave = /^\d{44}$/.test(nfe);
                                    const numero = isChave ? String(parseInt(nfe.substring(25, 34), 10)) : '—';
                                    const serie = isChave ? String(parseInt(nfe.substring(22, 25), 10)) : '—';
                                    return (
                                      <div key={i} className="flex items-center gap-1.5">
                                        <span className="text-[8px] px-1.5 py-px bg-slate-100 text-slate-600 rounded font-black shrink-0">
                                          NF-e {numero} · Série {serie}
                                        </span>
                                        <span className="text-[8px] text-slate-400 truncate flex-1" title={nfe}>
                                          {nfe.replace(/(\d{4})(?=\d)/g, '$1 ')}
                                        </span>
                                        <CopyButton value={nfe} title="Copiar chave da NF-e (sem espaços)" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                            {(info.remetente?.nome || info.destinatario?.nome) && (
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                                <span className="text-[8px] font-bold text-slate-500 truncate" title={info.remetente?.nome}>
                                  {info.remetente?.nome || '—'}
                                </span>
                                <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                                </svg>
                                <span className="text-[8px] font-bold text-slate-500 truncate" title={info.destinatario?.nome}>
                                  {info.destinatario?.nome || '—'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </>
                  )}

                  {/* Remetentes (dos CT-es) */}
                  {summary.remetentes.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Remetentes ({summary.remetentes.length})
                      </p>
                      <div className="space-y-1.5">
                        {summary.remetentes.map((r, i) => <PartyCard key={i} party={r.party} ctes={r.ctes} />)}
                      </div>
                    </div>
                  )}

                  {/* Destinatários (dos CT-es) */}
                  {summary.destinatarios.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        Destinatários ({summary.destinatarios.length})
                      </p>
                      <div className="space-y-1.5">
                        {summary.destinatarios.map((d, i) => <PartyCard key={i} party={d.party} ctes={d.ctes} />)}
                      </div>
                    </div>
                  )}

                  {/* ── 3. DADOS DAS NF-ES (sempre por último) ──────────────── */}
                  {summary.nfes.length > 0 && (
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Totais das NF-es</p>
                      <div className="grid grid-cols-4 gap-2 mb-1.5">
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <p className="text-[8px] font-black text-emerald-500 uppercase">NF-es</p>
                          <p className="text-base font-black text-emerald-700 mt-0.5">{summary.nfeUniqueCount}</p>
                          {summary.nfeDuplicateIds.size > 0 && (
                            <p className="text-[7px] font-black text-amber-600 uppercase mt-0.5">
                              +{summary.nfeDuplicateIds.size} dup.
                            </p>
                          )}
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <p className="text-[8px] font-black text-emerald-500 uppercase">Valor das NFs</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            <p className="text-[11px] font-black text-emerald-700">{fmtMoney(summary.nfeTotalValor)}</p>
                            <CopyButton value={copyMoney(summary.nfeTotalValor)} title="Copiar valor total das NFs" />
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <p className="text-[8px] font-black text-emerald-500 uppercase">Peso Bruto</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            <p className="text-[11px] font-black text-emerald-700">
                              {summary.nfeTotalPesoBruto !== undefined ? `${fmtQty(summary.nfeTotalPesoBruto)} KG` : '—'}
                            </p>
                            {summary.nfeTotalPesoBruto !== undefined && (
                              <CopyButton value={copyQty(summary.nfeTotalPesoBruto)} title="Copiar peso bruto total das NFs" />
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                          <p className="text-[8px] font-black text-emerald-500 uppercase">Volumes</p>
                          <div className="flex items-center gap-0.5 mt-1">
                            <p className="text-[11px] font-black text-emerald-700">
                              {summary.nfeTotalVolumes !== undefined ? fmtQty(summary.nfeTotalVolumes) : '—'}
                            </p>
                            {summary.nfeTotalVolumes !== undefined && (
                              <CopyButton value={copyQty(summary.nfeTotalVolumes)} title="Copiar total de volumes das NFs" />
                            )}
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                        NF-es Anexadas ({summary.nfes.length})
                      </p>
                      <div className="space-y-1.5">
                        {summary.nfes.map(att => {
                          const nfe = att.nfeInfo!;
                          return (
                            <div key={att.id} className={`p-3 bg-white border rounded-2xl ${summary.nfeDuplicateIds.has(att.id) ? 'border-amber-300' : 'border-emerald-200'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 min-w-0">
                                  <p className="text-[10px] font-black text-emerald-800">
                                    NF-e {nfe.numero || '—'}{nfe.serie ? <span className="text-slate-400 font-bold"> · Série {nfe.serie}</span> : null}
                                  </p>
                                  <CopyButton value={nfe.numero} title="Copiar nº da NF-e" />
                                  {nfe.chave && <CopyButton value={nfe.chave} title="Copiar chave de acesso (sem espaços)" />}
                                  {summary.nfeDuplicateIds.has(att.id) && (
                                    <span className="text-[7px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-black uppercase shrink-0" title="NF-e repetida — não é somada nos totais">
                                      Duplicado
                                    </span>
                                  )}
                                  {nfe.container && (
                                    <span className="text-[7px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded font-black uppercase shrink-0 flex items-center gap-0.5">
                                      {nfe.container}
                                      <CopyButton value={nfe.container} title="Copiar container" />
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {nfe.dataEmissao && (
                                    <>
                                      <span className="text-[8px] text-slate-400">
                                        {new Date(nfe.dataEmissao).toLocaleDateString('pt-BR')}
                                      </span>
                                      <CopyButton value={new Date(nfe.dataEmissao).toLocaleDateString('pt-BR')} title="Copiar data de emissão" />
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <div>
                                  <p className="text-[7px] font-black text-slate-400 uppercase">Valor da NF</p>
                                  <div className="flex items-center gap-0.5">
                                    <p className="text-[10px] font-black text-indigo-700">{fmtMoney(nfe.valorNf)}</p>
                                    <CopyButton value={copyMoney(nfe.valorNf)} title="Copiar valor da NF" />
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[7px] font-black text-slate-400 uppercase">Pesos</p>
                                  {nfe.pesoBruto !== undefined && (
                                    <p className="text-[9px] font-black text-slate-700 flex items-center gap-0.5">
                                      Bruto: {fmtQty(nfe.pesoBruto)} KG
                                      <CopyButton value={copyQty(nfe.pesoBruto)} title="Copiar peso bruto" />
                                    </p>
                                  )}
                                  {nfe.pesoLiquido !== undefined && (
                                    <p className="text-[9px] font-black text-slate-500 flex items-center gap-0.5">
                                      Líquido: {fmtQty(nfe.pesoLiquido)} KG
                                      <CopyButton value={copyQty(nfe.pesoLiquido)} title="Copiar peso líquido" />
                                    </p>
                                  )}
                                  {nfe.pesoBruto === undefined && nfe.pesoLiquido === undefined && (
                                    <p className="text-[10px] font-black text-slate-300">—</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[7px] font-black text-slate-400 uppercase">Volumes</p>
                                  {nfe.qVolumes !== undefined ? (
                                    <p className="text-[9px] font-black text-slate-700 flex items-center gap-0.5">
                                      {fmtQty(nfe.qVolumes)}
                                      <CopyButton value={copyQty(nfe.qVolumes)} title="Copiar quantidade de volumes" />
                                    </p>
                                  ) : <p className="text-[10px] font-black text-slate-300">—</p>}
                                </div>
                              </div>
                              {(nfe.emitente?.nome || nfe.destinatario?.nome) && (
                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                                  <span className="text-[8px] font-bold text-slate-500 truncate" title={nfe.emitente?.nome}>
                                    {nfe.emitente?.nome || '—'}
                                  </span>
                                  <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                                  </svg>
                                  <span className="text-[8px] font-bold text-slate-500 truncate" title={nfe.destinatario?.nome}>
                                    {nfe.destinatario?.nome || '—'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anexos sem dados extraídos */}
                  {summary.semInfo.length > 0 && (
                    <p className="text-[8px] text-slate-400 italic">
                      {summary.semInfo.length} anexo(s) sem valores extraídos:{' '}
                      {summary.semInfo.map(a => a.fileName).join(', ')}. PDFs escaneados (imagem) e XMLs
                      não reconhecidos não permitem extração — anexe o XML do CT-e para dados completos.
                    </p>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Confirmação de exclusão (modal do sistema) */}
      <ConfirmDialog
        open={confirmDelete !== null}
        title="Excluir anexo"
        message={`Excluir o anexo "${confirmDelete?.fileName}"? O arquivo também será removido do armazenamento.`}
        confirmLabel="Excluir"
        danger
        loading={deletingId !== null}
        onConfirm={async () => {
          if (confirmDelete) {
            await handleDelete(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => { if (deletingId === null) setConfirmDelete(null); }}
      />

      {/* PDF viewer com painel de valores */}
      {viewer && (
        <CteViewerModal
          attachment={viewer.att}
          url={viewer.url}
          title={viewer.title}
          totals={{
            count: summary.uniqueCount,
            totalCarga: summary.totalCarga,
            volumeTotals: summary.volumeTotals,
          }}
          onClose={() => setViewer(null)}
        />
      )}
    </>
  );
};

export default CteAttachmentsModal;
