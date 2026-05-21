import React, { useState, useEffect, useCallback } from 'react';
import { User, Driver, FreightContract, FreightContractDoc, Trip } from '../../types';
import { db } from '../../utils/storage';
import PDFViewer from '../shared/PDFViewer';

interface Props {
  user: User;
  onLogout: () => void;
}

interface ContractItem extends FreightContract {
  localidade?: string;
  tripStatus?: string;
  localDeBaixa?: string;
  prevTermino?: string;
  expiresAt?: string;
}

const MONTHS_PT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

const normLoc = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

function locConfirmsTrip(localidade: string | undefined, tripDest: string): boolean {
  if (!localidade || !tripDest) return true;
  const words = normLoc(localidade).split(/[\s\-]+/).filter(w => w.length >= 3);
  if (!words.length) return true;
  const dest = normLoc(tripDest);
  return words.length >= 2
    ? words.slice(0, 2).every(w => dest.includes(w))
    : words.some(w => dest.includes(w));
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return {
    day:   String(d.getDate()).padStart(2, '0'),
    month: MONTHS_PT[d.getMonth()],
    year:  d.getFullYear(),
    time:  `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
  };
}

function statusStyle(s?: string) {
  if (!s) return null;
  const l = s.toLowerCase();
  if (l.includes('conclu') || l.includes('entregue') || l.includes('pago'))
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (l.includes('trânsito') || l.includes('transito') || l.includes('viagem'))
    return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  if (l.includes('aguard') || l.includes('previsto') || l.includes('agend'))
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-slate-400 bg-white/5 border-white/10';
}

const BeneficiaryPortal: React.FC<Props> = ({ user, onLogout }) => {
  const [drivers, setDrivers]               = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [contracts, setContracts]           = useState<ContractItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [viewerDoc, setViewerDoc]           = useState<{ url: string; title: string } | null>(null);
  const [downloading, setDownloading]       = useState<string | null>(null);
  const [refreshing, setRefreshing]         = useState(false);

  const loadDrivers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const all = await db.getDrivers();
      setDrivers(all.filter(d => d.beneficiaryUserId === user.id && d.status === 'Ativo'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const loadContracts = useCallback(async (driver: Driver) => {
    setLoadingContracts(true);
    try {
      const [trips, allFC] = await Promise.all([db.getTrips(), db.getFreightContracts()]);
      const result: ContractItem[] = [];
      const seenUrls = new Set<string>();

      // 1. Contratos vindos de viagens
      for (const trip of trips.filter(t => t.driver?.id === driver.id)) {
        const docs: FreightContractDoc[] = trip.freightContractDocs?.length
          ? trip.freightContractDocs
          : trip.freightContractDoc
            ? [trip.freightContractDoc as FreightContractDoc]
            : [];

        for (const doc of docs) {
          if (!doc.url) continue;
          seenUrls.add(doc.url);

          const tripDest = trip.destination?.name || trip.customer?.name || '';
          const parsedLocalidade = doc.parsedData?.localidade;
          const osConfirmed = locConfirmsTrip(parsedLocalidade, tripDest);

          result.push({
            id:           `${trip.id}-${doc.url}`,
            fileName:     doc.fileName || `Contrato-${trip.os}.pdf`,
            fileUrl:      doc.url,
            tripId:       trip.id,
            tripOs:       osConfirmed ? trip.os : undefined,
            container:    doc.parsedData?.container || trip.container,
            destination:  tripDest,
            driverId:     driver.id,
            driverName:   driver.name,
            status:       'linked',
            uploadedAt:   doc.uploadDate || trip.dateTime,
            localidade:   parsedLocalidade || trip.destination?.city || trip.customer?.city,
            tripStatus:   trip.status as string,
            localDeBaixa: tripDest,
            prevTermino:  doc.parsedData?.prevTermino,
            expiresAt:    doc.expiresAt,
          });
        }
      }

      // 2. Contratos vinculados apenas ao motorista (sem viagem)
      for (const c of allFC.filter(c => c.driverId === driver.id && c.fileUrl)) {
        if (seenUrls.has(c.fileUrl!)) continue;
        seenUrls.add(c.fileUrl!);
        result.push({
          id:           c.id,
          fileName:     c.fileName,
          fileUrl:      c.fileUrl,
          tripId:       undefined,
          tripOs:       undefined,
          container:    c.container,
          destination:  c.destination,
          driverId:     driver.id,
          driverName:   driver.name,
          status:       'linked',
          uploadedAt:   c.uploadedAt,
          localidade:   c.destination,
          tripStatus:   undefined,
          localDeBaixa: c.destination,
          prevTermino:  undefined,
          expiresAt:    undefined,
        });
      }

      result.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      setContracts(result);
    } finally {
      setLoadingContracts(false);
    }
  }, []);

  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setContracts([]);
    loadContracts(driver);
  };

  const handleBack = () => {
    setSelectedDriver(null);
    setContracts([]);
  };

  const downloadContract = async (contract: ContractItem) => {
    if (!contract.fileUrl) return;
    setDownloading(contract.id);
    try {
      const res  = await fetch(contract.fileUrl);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = contract.fileName || `Contrato-${contract.tripOs || contract.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(contract.fileUrl, '_blank');
    } finally {
      setDownloading(null);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <img src="/logo.jpg" alt="ALS" className="w-16 h-16 rounded-3xl object-contain border border-white/10 shadow-2xl"/>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
          ))}
        </div>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carregando...</p>
      </div>
    );
  }

  // ── View 1: lista de motoristas ──────────────────────────────────────────────
  if (!selectedDriver) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <header className="px-6 pt-12 pb-6 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Portal do Beneficiário</p>
              <h1 className="text-xl font-black text-white uppercase tracking-tight leading-none truncate max-w-[200px]">
                {user.displayName.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {refreshing && (
                <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              )}
              <button onClick={() => loadDrivers(true)}
                className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
              <button onClick={onLogout}
                className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 overflow-y-auto">
          {drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-8">
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Nenhum motorista vinculado</p>
              <p className="text-[9px] text-slate-600 font-bold mt-2 leading-relaxed">
                Solicite ao operador que vincule sua conta aos motoristas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
                {drivers.length} motorista{drivers.length !== 1 ? 's' : ''} vinculado{drivers.length !== 1 ? 's' : ''}
              </p>
              {drivers.map(driver => (
                <button key={driver.id} onClick={() => handleSelectDriver(driver)}
                  className="w-full flex items-center gap-4 p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] active:scale-98 hover:border-blue-500/30 transition-all text-left shadow-xl">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {driver.photo
                      ? <img src={driver.photo} alt={driver.name} className="w-full h-full object-cover"/>
                      : <span className="text-lg font-black text-slate-500">{driver.name.split(' ').map(w => w[0]).slice(0,2).join('')}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">{driver.name}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-white/5">{driver.plateHorse}</span>
                      {driver.plateTrailer && (
                        <span className="text-[8px] font-mono font-bold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-lg border border-white/5">{driver.plateTrailer}</span>
                      )}
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${driver.driverType === 'Frota' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : 'text-slate-400 bg-slate-800 border border-white/5'}`}>
                        {driver.driverType}
                      </span>
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // ── View 2: contratos do motorista selecionado ───────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="px-6 pt-12 pb-5 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={handleBack}
            className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contratos de Frete</p>
            <h2 className="text-base font-black text-white uppercase tracking-tight leading-tight truncate">
              {selectedDriver.name.split(' ').slice(0,2).join(' ')}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {selectedDriver.photo
              ? <img src={selectedDriver.photo} alt={selectedDriver.name} className="w-full h-full object-cover"/>
              : <span className="text-xs font-black text-slate-500">{selectedDriver.name.split(' ').map(w => w[0]).slice(0,2).join('')}</span>}
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 py-6 overflow-y-auto">
        {loadingContracts ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}/>
              ))}
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carregando contratos...</p>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center px-8">
            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Nenhum contrato disponível</p>
            <p className="text-[9px] text-slate-600 font-bold mt-2 leading-relaxed">
              Os contratos aparecerão aqui quando forem enviados pelo operador.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">
              {contracts.length} contrato{contracts.length !== 1 ? 's' : ''} disponível{contracts.length !== 1 ? 'is' : ''}
            </p>

            {contracts.map(contract => {
              const dt = fmtDate(contract.uploadedAt);
              const ss = statusStyle(contract.tripStatus);

              return (
                <div key={contract.id}
                  className="bg-slate-900 border border-white/5 rounded-[1.8rem] shadow-xl overflow-hidden hover:border-blue-500/10 transition-all">

                  {/* ── Linha 1: data + hora · localidade ── */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      {/* Ícone calendário */}
                      <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 shrink-0">
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[13px] font-black text-white tabular-nums leading-none">{dt.day}</span>
                          <span className="text-[11px] font-black text-blue-400 leading-none">{dt.month}</span>
                          <span className="text-[9px] font-bold text-slate-500 leading-none">{dt.year}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-500 tabular-nums">{dt.time}</span>
                      </div>
                    </div>

                    {/* Localidade */}
                    {(contract.localidade || contract.destination) && (
                      <div className="flex items-center gap-1.5 max-w-[48%]">
                        <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span className="text-[9px] font-black text-slate-300 uppercase truncate">
                          {contract.localidade || contract.destination}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Linha 2: container ── */}
                  {contract.container && (
                    <div className="px-5 py-3 border-b border-white/5">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Container</p>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                        </svg>
                        <span className="font-mono font-black text-[18px] text-white tracking-wider leading-none">
                          {contract.container}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ── Linha 3: OS + status + térm + exp + local de baixa ── */}
                  <div className="px-5 py-3 border-b border-white/5 flex items-center gap-1.5 flex-wrap">
                    {contract.tripOs && (
                      <span className="text-[8px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                        OS {contract.tripOs}
                      </span>
                    )}
                    {contract.tripStatus && ss && (
                      <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border ${ss}`}>
                        {contract.tripStatus}
                      </span>
                    )}
                    {contract.prevTermino && (
                      <span className="text-[8px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                        Térm: {contract.prevTermino}
                      </span>
                    )}
                    {contract.expiresAt && (
                      <span className="text-[8px] font-black text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                        Exp: {new Date(contract.expiresAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                    {contract.localDeBaixa && (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-slate-500 truncate min-w-0 mt-0.5 w-full">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                        </svg>
                        <span className="truncate">{contract.localDeBaixa}</span>
                      </span>
                    )}
                  </div>

                  {/* ── Linha 4: ações ── */}
                  <div className="flex">
                    <button
                      onClick={() => setViewerDoc({
                        url:   contract.fileUrl!,
                        title: `Contrato${contract.tripOs ? ` · OS ${contract.tripOs}` : ''} · ${selectedDriver.name.split(' ')[0]}`,
                      })}
                      className="flex-1 flex items-center justify-center gap-2 py-4 text-[9px] font-black text-blue-400 uppercase tracking-widest border-r border-white/5 active:bg-blue-600/20 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                      </svg>
                      Visualizar
                    </button>
                    <button
                      onClick={() => downloadContract(contract)}
                      disabled={downloading === contract.id}
                      className="flex-1 flex items-center justify-center gap-2 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest active:bg-emerald-600/20 hover:text-emerald-400 transition-all disabled:opacity-50"
                    >
                      {downloading === contract.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                      )}
                      Baixar PDF
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {viewerDoc && (
        <PDFViewer url={viewerDoc.url} title={viewerDoc.title} onClose={() => setViewerDoc(null)}/>
      )}
    </div>
  );
};

export default BeneficiaryPortal;
