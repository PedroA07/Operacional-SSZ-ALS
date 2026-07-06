
import React, { useRef, useState } from 'react';
import { Trip, EmissaoCteAttachment } from '../../../types';
import { fileStorage } from '../../../utils/fileStorage';
import { cteXmlToPdfBlob } from '../../../utils/cteXmlToPdf';
import DocumentViewerModal from '../operations/DocumentViewerModal';

interface CteAttachmentsModalProps {
  trip: Trip;
  onClose: () => void;
  onUpdate: (trip: Trip, data: Partial<Trip>) => Promise<void>;
}

const genId = () => `cte-att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const CteAttachmentsModal: React.FC<CteAttachmentsModalProps> = ({ trip, onClose, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; title: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const attachments = trip.emissaoCteAttachments || [];

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
              const baseName = file.name.replace(/\.[^.]+$/, '');
              const pdfFile = new File([result.blob], `dacte_${baseName}.pdf`, { type: 'application/pdf' });
              att.pdfUrl = await fileStorage.uploadEmissaoCte(pdfFile, trip.os);
              if (result.data.numero) {
                att.cteNumber = result.data.numero;
                extractedCteNumber = extractedCteNumber || result.data.numero;
              }
            } else {
              newErrors.push(`"${file.name}": XML anexado, mas não foi reconhecido como CT-e — visualização em PDF indisponível.`);
            }
          } catch (convErr) {
            console.error('Erro na conversão XML→PDF:', convErr);
            newErrors.push(`"${file.name}": XML anexado, mas houve erro na conversão para PDF.`);
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
    if (!window.confirm(`Excluir o anexo "${att.fileName}"?`)) return;
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
      setViewer({ url: att.url, title: `CT-E — ${att.fileName}` });
    } else if (att.pdfUrl) {
      setViewer({ url: att.pdfUrl, title: `DACTE — ${att.fileName}` });
    } else {
      window.open(att.url, '_blank', 'noopener');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[500] p-4 animate-in fade-in duration-200"
        onClick={e => { if (e.target === e.currentTarget && !uploading) onClose(); }}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">

          {/* Header */}
          <div className="flex items-center justify-between p-5 pb-3 shrink-0">
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Anexos CT-E</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                OS <span className="font-black text-slate-700">{trip.os}</span> — anexe os CT-Es em PDF ou XML.
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

          <div className="px-5 pb-5 space-y-3 overflow-y-auto">

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
                          {isXml && att.pdfUrl && (
                            <span className="text-[7px] px-1.5 py-px bg-emerald-100 text-emerald-700 rounded font-black uppercase">DACTE PDF</span>
                          )}
                          {isXml && !att.pdfUrl && (
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
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.fileName}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Baixar arquivo original"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                          </svg>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(att)}
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
          </div>
        </div>
      </div>

      {/* PDF viewer */}
      {viewer && (
        <DocumentViewerModal
          isOpen
          onClose={() => setViewer(null)}
          url={viewer.url}
          title={viewer.title}
        />
      )}
    </>
  );
};

export default CteAttachmentsModal;
