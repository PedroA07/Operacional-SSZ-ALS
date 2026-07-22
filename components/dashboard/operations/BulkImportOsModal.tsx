import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Customer, ColetaTipoViagemOption, OperationType, Port, PreStacking, Driver, User } from '../../../types';
import { db } from '../../../utils/storage';
import { osCategoryService } from '../../../utils/osCategoryService';
import {
  parseAliancaOsPdf, matchCustomer, matchByName, matchTipoViagem, matchOperationType,
  normalizeKg, resolveClienteDestino, isEntregaImportacaoOs, ParsedAliancaOs,
} from '../../../utils/aliancaOsParser';
import { ensureCustomerByCnpj } from '../../../utils/entityAutoRegister';
import { fileStorage } from '../../../utils/fileStorage';
import { localDateStr, localDateTimeStr } from '../../../utils/dateHelpers';
import OrdemColetaForm from '../forms/OrdemColetaForm';
import LiberacaoVazioForm from '../forms/LiberacaoVazioForm';
import DevolucaoVazioForm from '../forms/DevolucaoVazioForm';

interface BulkImportOsModalProps {
  user?: User;
  onClose: () => void;
  onImported?: () => void;
}

interface ImportItem {
  fileName: string;
  file: File;
  parsed: ParsedAliancaOs;
  customer?: Customer;
  destino?: any;         // porto/pré-stacking do destino (entrega/devolução)
  origem?: any;          // porto/pré-stacking da retirada (vazio/cheio)
  tipoViagem?: ColetaTipoViagemOption;
  tipoOperacao?: string;
  category?: string;
  isImport: boolean;     // entrega/importação (vs coleta/exportação)
  createdTripId?: string;
  osPdfUrl?: string;
}

type MinutaKind = 'oc' | 'liberacao' | 'devolucao';

const BulkImportOsModal: React.FC<BulkImportOsModalProps> = ({ user, onClose, onImported }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [ports, setPorts] = useState<Port[]>([]);
  const [preStacking, setPreStacking] = useState<PreStacking[]>([]);
  const [tiposViagem, setTiposViagem] = useState<ColetaTipoViagemOption[]>([]);
  const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);

  const [items, setItems] = useState<ImportItem[]>([]);
  const [errors, setErrors] = useState<{ fileName: string; error: string }[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imported, setImported] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Minuta aberta (pré-preenchida) a partir de uma OS importada
  const [activeMinuta, setActiveMinuta] = useState<{ kind: MinutaKind; item: ImportItem } | null>(null);

  const allPorts = [...ports, ...preStacking];

  useEffect(() => {
    (async () => {
      try {
        const [c, tv, ot, d, p, ps] = await Promise.all([
          db.getCustomers(), db.getColetaTiposViagem(), db.getOperationTypes(),
          db.getDrivers(), db.getPorts(), db.getPreStacking(),
        ]);
        setCustomers(c || []); setTiposViagem(tv || []); setOperationTypes(ot || []);
        setDrivers(d || []); setPorts(p || []); setPreStacking(ps || []);
      } catch (e) { console.error('Erro ao carregar cadastros:', e); }
    })();
  }, []);

  const processFiles = async (files: File[]) => {
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length === 0) return;
    setParsing(true);
    const newItems: ImportItem[] = [];
    const newErrors: { fileName: string; error: string }[] = [];
    for (const file of pdfs) {
      try {
        const parsed = await parseAliancaOsPdf(file);
        if (!parsed || !parsed.os) {
          newErrors.push({ fileName: file.name, error: 'PDF não reconhecido como OS (Aliança/Mercosul).' });
          continue;
        }
        const isImp = isEntregaImportacaoOs(parsed);
        const cd = resolveClienteDestino(parsed);
        const origemNome = isImp ? parsed.retirarCheio : parsed.retirarVazio;
        newItems.push({
          fileName: file.name,
          file,
          parsed,
          customer: matchCustomer(customers, parsed),
          destino: cd.destinoNome ? matchByName(allPorts as any[], cd.destinoNome) : undefined,
          origem: origemNome ? matchByName(allPorts as any[], origemNome) : undefined,
          tipoViagem: matchTipoViagem(tiposViagem, parsed.docReferencia),
          tipoOperacao: matchOperationType(operationTypes, parsed.tipoOperacao)?.name,
          category: osCategoryService.detectCategoryFromOS(parsed.os) || undefined,
          isImport: isImp,
        });
      } catch (e: any) {
        newErrors.push({ fileName: file.name, error: `Falha na leitura: ${e?.message || 'erro'}.` });
      }
    }
    setItems(prev => [...prev, ...newItems]);
    setErrors(prev => [...prev, ...newErrors]);
    setParsing(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handleImportAll = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      let customerPool = [...customers];
      const updated = [...items];
      for (let i = 0; i < updated.length; i++) {
        const it = updated[i];
        const p = it.parsed;
        const cd = resolveClienteDestino(p);
        let customer = it.customer;
        if (!customer && cd.clienteCnpj) {
          const ensured = await ensureCustomerByCnpj(customerPool, cd.clienteCnpj, {
            nome: cd.clienteNome, cnpj: cd.clienteCnpj,
            endereco: cd.clienteEndereco, municipio: cd.clienteMunicipio, uf: cd.clienteUf,
            bairro: cd.clienteBairro, cep: cd.clienteCep,
          });
          if (ensured) { customer = ensured.customer; if (ensured.created) { customerPool = [ensured.customer, ...customerPool]; setCustomers(prev => [ensured.customer as any, ...prev]); } }
        }
        let osPdfUrl = '';
        try { osPdfUrl = await fileStorage.uploadTripDoc(it.file, p.os || `os-${Date.now()}-${i}`, 'os'); }
        catch (err) { console.error('Falha ao anexar OS:', err); }

        const tripId = `new-${Date.now()}-${i}`;
        const portToObj = (o: any) => o ? { id: o.id, name: o.name, legalName: o.legalName, cnpj: o.cnpj, city: o.city, state: o.state, kind: o.kind } : undefined;
        const trip: Trip = {
          id: tripId,
          os: p.os!.toUpperCase(),
          booking: p.booking || '',
          ship: p.ship || '',
          dateTime: p.dataColeta ? `${p.dataColeta}:00` : new Date().toISOString(),
          isLate: false,
          type: (it.tipoOperacao || p.tipoOperacao || 'EXPORTAÇÃO') as any,
          category: it.category || 'ALIANÇA',
          container: p.container || '',
          containerType: p.containerTipo,
          pesoCarga: normalizeKg(p.pesoCarga),
          seal: p.lacre,
          customer: customer
            ? { id: customer.id, name: customer.name, legalName: customer.legalName, cnpj: customer.cnpj, city: customer.city, state: customer.state }
            : { id: '', name: cd.clienteNome || '', cnpj: cd.clienteCnpj || '', city: cd.clienteMunicipio || '' },
          destination: portToObj(it.destino),
          retiradaCheio: it.isImport ? portToObj(it.origem) : undefined,
          retiradaVazio: !it.isImport ? portToObj(it.origem) : undefined,
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
          osPdfUrl,
        };
        await db.saveTrip(trip);
        updated[i] = { ...it, createdTripId: tripId, osPdfUrl, customer };
      }
      setItems(updated);
      setImported(true);
      onImported?.();
      window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
    } catch (e: any) {
      console.error('Erro ao importar OS em massa:', e);
      setErrors(prev => [...prev, { fileName: '', error: `Erro ao salvar: ${e?.message || 'erro'}.` }]);
    } finally {
      setSaving(false);
    }
  };

  // ── Dados iniciais das minutas pré-preenchidas ─────────────────────────────
  const buildOcInitial = (it: ImportItem) => {
    const p = it.parsed;
    return {
      date: localDateStr(),
      driverId: '',
      remetenteId: it.customer?.id || '',
      destinatarioId: it.destino?.id || '',
      os: p.os,
      container: p.container || '',
      tara: '',
      seal: p.lacre || '',
      genset: '',
      booking: p.booking || '',
      ship: p.ship || '',
      agencia: p.armador || '',
      tipo: p.containerTipo || '40HC',
      padrao: p.padraoCarga || 'CARGA GERAL',
      tipoOperacao: it.tipoOperacao || p.tipoOperacao || '',
      autColeta: p.autColeta || '',
      embarcador: p.embarcador || '',
      horarioAgendado: p.dataColeta || localDateTimeStr(),
      obs: '',
      category: (it.category || '').toUpperCase(),
      osPdfUrl: it.osPdfUrl || '',
      osImportData: p,
      displayDate: new Date().toLocaleDateString('pt-BR'),
    };
  };

  const buildLiberacaoInitial = (it: ImportItem) => {
    const p = it.parsed;
    return {
      date: localDateStr(), driverId: '',
      remetenteId: it.customer?.id || '',
      destinatarioId: it.origem?.id || '',            // retirada do vazio (porto/pré-stacking)
      booking: p.booking || '', ship: p.ship || '', agencia: p.armador || '',
      pod: p.pod || '', qtdContainer: '01',
      tipo: p.containerTipo || '40HC', padrao: p.padraoCarga || 'CARGA GERAL',
      obs: '', manualLocal: it.origem ? '' : (p.retirarVazio || ''),
    };
  };

  const buildDevolucaoInitial = (it: ImportItem) => {
    const p = it.parsed;
    return {
      date: localDateStr(), driverId: '',
      remetenteId: it.customer?.id || '',
      destinatarioId: it.destino?.id || '',           // devolução (porto/pré-stacking)
      container: p.container || '', booking: p.booking || '', ship: p.ship || '',
      agencia: p.armador || '', pod: p.pod || '', qtdContainer: '01',
      tipo: p.containerTipo || '40HC', padrao: p.padraoCarga || 'CARGA GERAL',
      obs: '', manualLocal: it.destino ? '' : (p.entregarVazio || ''),
      agendamentoDateTime: '',
    };
  };

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try { const d = new Date(iso); return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; } catch { return iso; }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-white flex flex-col">
        {/* Header */}
        <div className="px-8 py-5 bg-blue-600 flex items-center justify-between shrink-0 shadow-lg">
          <div>
            <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Operações</p>
            <h2 className="font-black text-white text-sm uppercase tracking-widest">Importar OS em Massa</h2>
            <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">Cria as programações e libera as minutas pré-preenchidas</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50 p-8">
          <div className="max-w-5xl mx-auto space-y-4">

            {/* Dropzone */}
            {!imported && (
              <div
                onClick={() => !parsing && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); if (!parsing) processFiles(Array.from(e.dataTransfer.files)); }}
                className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${parsing ? 'border-slate-200 bg-slate-50 cursor-wait' : dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'}`}
              >
                <input ref={inputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={e => processFiles(Array.from(e.target.files || []))} />
                {parsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[11px] font-black text-slate-600 uppercase">Lendo OS...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-9 h-9 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    <p className="text-[12px] font-black text-slate-700 uppercase">Clique ou arraste os PDFs das OS's</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Aliança / Mercosul — várias de uma vez</p>
                  </div>
                )}
              </div>
            )}

            {errors.map((e, i) => (
              <div key={`err-${i}`} className="p-3 bg-red-50 border border-red-200 rounded-2xl text-[10px] font-bold text-red-600">
                {e.fileName ? <span className="font-black">{e.fileName}: </span> : null}{e.error}
              </div>
            ))}

            {/* Lista de OS */}
            {items.map((it, idx) => {
              const p = it.parsed;
              const cd = resolveClienteDestino(p);
              const tipoLabel = it.isImport ? 'ENTREGA / IMPORTAÇÃO' : 'COLETA / EXPORTAÇÃO';
              return (
                <div key={idx} className="p-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-black text-slate-800">{p.os}</span>
                      <span className="text-[7px] px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-300 rounded font-black uppercase">{tipoLabel}</span>
                      {(it.tipoOperacao || p.tipoOperacao) && <span className="text-[7px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-black uppercase">{it.tipoOperacao || p.tipoOperacao}</span>}
                      {p.container && <span className="text-[7px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded font-black uppercase">{p.container}{p.containerTipo ? ` · ${p.containerTipo}` : ''}</span>}
                      {it.createdTripId && <span className="text-[7px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-black uppercase">✓ programação criada</span>}
                    </div>
                    {!imported && (
                      <button onClick={() => removeItem(idx)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0" title="Remover">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5 mt-3">
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase">Cliente ({cd.clienteOrigem})</p>
                      <p className="text-[9px] font-bold text-slate-700 truncate" title={it.customer?.name || cd.clienteNome}>
                        {it.customer?.name || cd.clienteNome || '—'}
                        {it.customer ? <span className="ml-1 text-[7px] font-black text-emerald-600">✓</span> : cd.clienteCnpj ? <span className="ml-1 text-[7px] font-black text-blue-600">+cad</span> : null}
                      </p>
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase">{it.isImport ? 'Retirada do Cheio' : 'Retirada do Vazio'}</p>
                      <p className="text-[9px] font-bold text-slate-700 truncate">{it.origem?.name || (it.isImport ? p.retirarCheio : p.retirarVazio) || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase">{it.isImport ? 'Devolução' : 'Entrega'} ({cd.destinoOrigem})</p>
                      <p className="text-[9px] font-bold text-slate-700 truncate">{it.destino?.name || cd.destinoNome || '—'}</p>
                    </div>
                    <div>
                      <p className="text-[7px] font-black text-slate-400 uppercase">Data / Navio</p>
                      <p className="text-[9px] font-bold text-slate-700 truncate">{fmtDate(p.dataColeta)}{p.ship ? ` · ${p.ship}` : ''}</p>
                    </div>
                  </div>

                  {/* Minutas por tipo (após importar) */}
                  {it.createdTripId && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Minutas:</span>
                      <button onClick={() => setActiveMinuta({ kind: 'oc', item: it })} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-[8px] font-black uppercase rounded-lg hover:bg-blue-100 transition-all">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Ordem de Coleta
                      </button>
                      {it.isImport ? (
                        <button onClick={() => setActiveMinuta({ kind: 'devolucao', item: it })} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-black uppercase rounded-lg hover:bg-amber-100 transition-all">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                          Minuta de Devolução
                        </button>
                      ) : (
                        <button onClick={() => setActiveMinuta({ kind: 'liberacao', item: it })} className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-[8px] font-black uppercase rounded-lg hover:bg-violet-100 transition-all">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                          Liberação de Vazio
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {items.length > 0 && !imported && (
          <div className="p-6 border-t border-slate-100 shrink-0 bg-white flex gap-3 max-w-5xl mx-auto w-full">
            <button onClick={onClose} disabled={saving} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase hover:bg-slate-200 transition-all disabled:opacity-50">Cancelar</button>
            <button onClick={handleImportAll} disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {saving ? 'Importando...' : `Importar ${items.length} OS e criar programações`}
            </button>
          </div>
        )}
        {imported && (
          <div className="p-6 border-t border-slate-100 shrink-0 bg-white flex gap-3 max-w-5xl mx-auto w-full">
            <button onClick={onClose} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-blue-600 transition-all">Concluir</button>
          </div>
        )}
      </div>

      {/* Minuta pré-preenchida (fullscreen) */}
      {activeMinuta && createPortal(
        <div className="fixed inset-0 z-[9200] animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-white flex flex-col">
            <div className="px-8 py-5 bg-slate-800 flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">
                  {activeMinuta.kind === 'oc' ? 'Ordem de Coleta' : activeMinuta.kind === 'liberacao' ? 'Liberação de Vazio' : 'Minuta de Devolução'}
                </p>
                <h2 className="font-black text-white text-sm uppercase tracking-widest">OS: {activeMinuta.item.parsed.os}</h2>
              </div>
              <button onClick={() => setActiveMinuta(null)} className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {activeMinuta.kind === 'oc' && (
                <OrdemColetaForm
                  user={user}
                  drivers={drivers}
                  customers={customers}
                  ports={ports}
                  onClose={() => setActiveMinuta(null)}
                  initialData={buildOcInitial(activeMinuta.item)}
                  tripId={activeMinuta.item.createdTripId}
                  osPdfUrl={activeMinuta.item.osPdfUrl}
                />
              )}
              {activeMinuta.kind === 'liberacao' && (
                <LiberacaoVazioForm
                  user={user}
                  drivers={drivers}
                  customers={customers}
                  ports={ports}
                  preStackings={preStacking}
                  onClose={() => setActiveMinuta(null)}
                  initialFormData={buildLiberacaoInitial(activeMinuta.item)}
                />
              )}
              {activeMinuta.kind === 'devolucao' && (
                <DevolucaoVazioForm
                  user={user}
                  drivers={drivers}
                  customers={customers}
                  ports={ports}
                  preStackings={preStacking}
                  onClose={() => setActiveMinuta(null)}
                  tripId={activeMinuta.item.createdTripId}
                  tripOs={activeMinuta.item.parsed.os}
                  initialFormData={buildDevolucaoInitial(activeMinuta.item)}
                />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>,
    document.body
  );
};

export default BulkImportOsModal;
