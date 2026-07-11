
import React, { useEffect, useRef, useState } from 'react';
import { Trip, Customer, ColetaTipoViagemOption, OperationType } from '../../../types';
import { db } from '../../../utils/storage';
import { osCategoryService } from '../../../utils/osCategoryService';
import { parseAliancaOsPdf, matchCustomer, matchTipoViagem, matchOperationType, normalizeKg, resolveClienteDestino, ParsedAliancaOs } from '../../../utils/aliancaOsParser';
import { ensureCustomerByCnpj } from '../../../utils/entityAutoRegister';

interface ImportOsModalProps {
  onClose: () => void;
  onImported: () => Promise<void>;
}

interface ImportItem {
  fileName: string;
  parsed?: ParsedAliancaOs;
  customer?: Customer;
  tipoViagem?: ColetaTipoViagemOption;
  tipoOperacao?: string;
  category?: string;
  error?: string;
}

const ImportOsModal: React.FC<ImportOsModalProps> = ({ onClose, onImported }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tiposViagem, setTiposViagem] = useState<ColetaTipoViagemOption[]>([]);
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, tv, ot] = await Promise.all([db.getCustomers(), db.getColetaTiposViagem(), db.getOperationTypes()]);
        setCustomers(c || []);
        setTiposViagem(tv || []);
        setOperationTypes(ot || []);
      } catch (e) { console.error('Erro ao carregar cadastros:', e); }
    })();
  }, []);

  const processFiles = async (files: File[]) => {
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) return;
    setParsing(true);
    const newItems: ImportItem[] = [];
    for (const file of pdfs) {
      try {
        const parsed = await parseAliancaOsPdf(file);
        if (!parsed || !parsed.os) {
          newItems.push({ fileName: file.name, error: 'PDF não reconhecido como OS da Aliança (sem camada de texto ou layout diferente).' });
          continue;
        }
        newItems.push({
          fileName: file.name,
          parsed,
          customer: matchCustomer(customers, parsed),
          tipoViagem: matchTipoViagem(tiposViagem, parsed.docReferencia),
          tipoOperacao: matchOperationType(operationTypes, parsed.tipoOperacao)?.name,
          category: osCategoryService.detectCategoryFromOS(parsed.os) || undefined,
        });
      } catch (e: any) {
        console.error('Erro ao ler OS:', e);
        newItems.push({ fileName: file.name, error: `Falha na leitura: ${e?.message || 'erro desconhecido'}.` });
      }
    }
    setItems(prev => [...prev, ...newItems]);
    setParsing(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const validItems = items.filter(i => i.parsed?.os);

  const handleImport = async () => {
    if (validItems.length === 0) return;
    setSaving(true);
    try {
      // Cache local para não re-cadastrar o mesmo CNPJ em OS's do mesmo lote
      let customerPool = [...customers];
      for (let i = 0; i < validItems.length; i++) {
        const it = validItems[i];
        const p = it.parsed!;

        // Cliente conforme o tipo: coleta/exportação = Local Coleta;
        // entrega/importação = Local Entrega. Se não achou, cadastra pelo CNPJ.
        const cd = resolveClienteDestino(p);
        let customer = it.customer;
        if (!customer && cd.clienteCnpj) {
          const ensured = await ensureCustomerByCnpj(customerPool, cd.clienteCnpj, {
            nome: cd.clienteNome, cnpj: cd.clienteCnpj,
            endereco: cd.clienteEndereco, municipio: cd.clienteMunicipio, uf: cd.clienteUf,
            bairro: cd.clienteBairro, cep: cd.clienteCep,
          });
          if (ensured) { customer = ensured.customer; if (ensured.created) customerPool = [ensured.customer, ...customerPool]; }
        }

        const trip: Trip = {
          id: `new-${Date.now()}-${i}`,
          os: p.os!.toUpperCase(),
          booking: p.booking || '',
          ship: p.ship || '',
          dateTime: p.dataColeta ? `${p.dataColeta}:00` : new Date().toISOString(),
          isLate: false,
          type: (it.tipoOperacao || p.tipoOperacao || 'EXPORTAÇÃO') as any,
          category: it.category || 'ALIANÇA',
          container: p.container || '',
          containerType: p.containerTipo,
          tara: normalizeKg(p.tara),
          pesoCarga: normalizeKg(p.pesoCarga),
          seal: p.lacre,
          customer: customer
            ? { id: customer.id, name: customer.name, legalName: customer.legalName, cnpj: customer.cnpj, city: customer.city, state: customer.state }
            : { id: '', name: cd.clienteNome || '', cnpj: cd.clienteCnpj || '', city: cd.clienteMunicipio || '' },
          driver: { id: '', name: '', plateHorse: '', plateTrailer: '', status: '' },
          status: 'Pendente',
          statusHistory: [],
          balancePayment: { status: 'AGUARDANDO_DOCS' } as any,
          advancePayment: { status: 'BLOQUEADO' } as any,
          coletaEmissaoSolicitada: true,
          coletaTipoViagem: it.tipoViagem?.id,
          autColeta: p.autColeta,
          embarcador: p.embarcador,
          agencia: p.armador,
          osImportData: p,
        };
        await db.saveTrip(trip);
      }
      await onImported();
      onClose();
    } catch (e: any) {
      console.error('Erro ao importar OS:', e);
      setSaveError(`Erro ao salvar uma das OS: ${e?.message || 'erro desconhecido'}. Nenhuma alteração adicional foi feita.`);
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch { return iso; }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[3000] p-4 animate-in fade-in duration-200"
      onClick={e => { if (e.target === e.currentTarget && !saving && !parsing) onClose(); }}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Importar OS (PDF)</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              OS's da Aliança — os dados são extraídos automaticamente para criar a programação.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving || parsing}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-3 overflow-y-auto flex-1">

          {/* Dropzone */}
          <div
            onClick={() => !parsing && inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              if (!parsing) processFiles(Array.from(e.dataTransfer.files));
            }}
            className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
              parsing
                ? 'border-slate-200 bg-slate-50 cursor-wait'
                : dragOver
                  ? 'border-indigo-400 bg-indigo-50 cursor-pointer'
                  : 'border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              multiple
              className="hidden"
              onChange={e => processFiles(Array.from(e.target.files || []))}
            />
            {parsing ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-slate-600">Lendo OS...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                <p className="text-[11px] font-black text-slate-600 uppercase">Clique ou arraste os PDFs das OS's aqui</p>
                <p className="text-[9px] text-slate-400">Pode importar várias de uma vez.</p>
              </div>
            )}
          </div>

          {/* Preview */}
          {items.map((it, idx) => (
            <div key={idx} className={`p-3 border rounded-2xl ${it.error ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'}`}>
              {it.error ? (
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black text-red-600">{it.fileName}</p>
                    <p className="text-[9px] text-red-500 mt-0.5">{it.error}</p>
                  </div>
                  <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:bg-red-100 rounded-lg shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              ) : (() => {
                const p = it.parsed!;
                const cd = resolveClienteDestino(p);
                return (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-slate-800">{p.os}</span>
                        {(it.tipoOperacao || p.tipoOperacao) && (
                          <span
                            className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase ${it.tipoOperacao ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}
                            title={it.tipoOperacao ? `Tipo de operação: ${it.tipoOperacao}` : `"${p.tipoOperacao}" não encontrado nos tipos cadastrados`}
                          >
                            {it.tipoOperacao || `${p.tipoOperacao} ⚠`}
                          </span>
                        )}
                        {p.containerTipo && (
                          <span className="text-[7px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded font-black uppercase">{p.containerTipo}</span>
                        )}
                        {p.padraoCarga && p.padraoCarga !== 'CARGA GERAL' && (
                          <span className="text-[7px] px-1.5 py-0.5 bg-purple-50 text-purple-600 border border-purple-200 rounded font-black uppercase">{p.padraoCarga}</span>
                        )}
                        {it.tipoViagem ? (
                          <span className="text-[7px] px-1.5 py-0.5 rounded font-black uppercase border" style={{ backgroundColor: `${it.tipoViagem.color}20`, color: it.tipoViagem.color, borderColor: `${it.tipoViagem.color}50` }}>
                            {it.tipoViagem.name}
                          </span>
                        ) : p.docReferencia ? (
                          <span className="text-[7px] px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded font-black uppercase" title="Não encontrei este tipo de viagem no banco">
                            {p.docReferencia} ⚠
                          </span>
                        ) : null}
                      </div>
                      <button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0" title="Remover da importação">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase">Cliente <span className="text-indigo-400">({cd.clienteOrigem})</span></p>
                        <p className="text-[9px] font-bold text-slate-700 truncate" title={it.customer?.name || cd.clienteNome}>
                          {it.customer?.name || cd.clienteNome || '—'}
                          {it.customer
                            ? <span className="ml-1 text-[7px] font-black text-emerald-600 uppercase">✓ cadastro</span>
                            : cd.clienteCnpj
                              ? <span className="ml-1 text-[7px] font-black text-blue-600 uppercase" title="Não encontrado — será cadastrado automaticamente pelo CNPJ ao importar">+ auto-cadastro</span>
                              : <span className="ml-1 text-[7px] font-black text-amber-600 uppercase" title="Cliente sem CNPJ na OS — será salvo com os dados da OS">novo</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase">Destino <span className="text-indigo-400">({cd.destinoOrigem})</span></p>
                        <p className="text-[9px] font-bold text-slate-700 truncate" title={cd.destinoNome}>{cd.destinoNome || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase">Data/Hora Coleta</p>
                        <p className="text-[9px] font-bold text-slate-700">{fmtDate(p.dataColeta)}</p>
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase">Navio / Viagem</p>
                        <p className="text-[9px] font-bold text-slate-700">
                          {p.ship || '—'}
                          {p.shipFromObs && (
                            <span className="ml-1 text-[7px] font-black text-blue-500 uppercase" title={`Extraído das Demais Observações (campo Navio/Viagem trazia: ${p.navioViagemCampo || '—'})`}>
                              via obs.
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7px] font-black text-slate-400 uppercase">Booking</p>
                        <p className="text-[9px] font-bold text-slate-700">{p.booking || '—'}</p>
                      </div>
                      {(p.senhaOc || p.autColeta) && (
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase">{p.senhaOc ? 'Senha OC (Aut. Coleta)' : 'Aut. Coleta/Entrega'}</p>
                          <p className="text-[9px] font-black text-rose-600">{p.autColeta}</p>
                        </div>
                      )}
                      {p.municipioColeta && (
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase">Local Coleta</p>
                          <p className="text-[9px] font-bold text-slate-700">{p.municipioColeta}{p.ufColeta ? ` - ${p.ufColeta}` : ''}</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Footer */}
        {saveError && (
          <div className="mx-5 mb-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-[10px] font-bold text-red-600 shrink-0">
            {saveError}
          </div>
        )}
        {items.length > 0 && (
          <div className="p-5 pt-3 border-t border-slate-100 shrink-0 flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={validItems.length === 0 || saving}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Importando...' : `Importar ${validItems.length} OS`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportOsModal;
