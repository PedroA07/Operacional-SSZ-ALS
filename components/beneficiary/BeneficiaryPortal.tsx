import React, { useState, useEffect, useCallback } from 'react';
import { User, Driver, FreightContract } from '../../types';
import { db } from '../../utils/storage';
import PDFViewer from '../shared/PDFViewer';

interface Props {
  user: User;
  onLogout: () => void;
}

const BeneficiaryPortal: React.FC<Props> = ({ user, onLogout }) => {
  const [drivers, setDrivers]           = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [contracts, setContracts]       = useState<FreightContract[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [viewerDoc, setViewerDoc]       = useState<{ url: string; title: string } | null>(null);
  const [refreshing, setRefreshing]     = useState(false);

  // Carrega motoristas vinculados ao beneficiário
  const loadDrivers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const all = await db.getDrivers();
      const mine = all.filter(d => d.beneficiaryUserId === user.id && d.status === 'Ativo');
      setDrivers(mine);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  // Carrega contratos do motorista selecionado
  const loadContracts = useCallback(async (driver: Driver) => {
    setLoadingContracts(true);
    try {
      const all = await db.getFreightContracts();
      const forDriver = all.filter(c => c.driverId === driver.id && c.fileUrl);
      setContracts(forDriver);
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

  // ── Tela de loading ──────────────────────────────────────────────────────────
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

  // ── View 1: lista de motoristas ─────────────────────────────────────────────
  if (!selectedDriver) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Header */}
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
              <button
                onClick={() => loadDrivers(true)}
                className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </button>
              <button
                onClick={onLogout}
                className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors"
              >
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
                <button
                  key={driver.id}
                  onClick={() => handleSelectDriver(driver)}
                  className="w-full flex items-center gap-4 p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] active:scale-98 hover:border-blue-500/30 transition-all text-left shadow-xl"
                >
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {driver.photo ? (
                      <img src={driver.photo} alt={driver.name} className="w-full h-full object-cover"/>
                    ) : (
                      <span className="text-lg font-black text-slate-500">
                        {driver.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">{driver.name}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-lg border border-white/5">
                        {driver.plateHorse}
                      </span>
                      {driver.plateTrailer && (
                        <span className="text-[8px] font-mono font-bold text-slate-500 bg-slate-800/60 px-2 py-0.5 rounded-lg border border-white/5">
                          {driver.plateTrailer}
                        </span>
                      )}
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${
                        driver.driverType === 'Frota' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' : 'text-slate-400 bg-slate-800 border border-white/5'
                      }`}>
                        {driver.driverType}
                      </span>
                    </div>
                  </div>

                  {/* Chevron */}
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
      {/* Header */}
      <header className="px-6 pt-12 pb-5 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Contratos de Frete</p>
            <h2 className="text-base font-black text-white uppercase tracking-tight leading-tight truncate">
              {selectedDriver.name.split(' ').slice(0, 2).join(' ')}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {selectedDriver.photo ? (
              <img src={selectedDriver.photo} alt={selectedDriver.name} className="w-full h-full object-cover"/>
            ) : (
              <span className="text-xs font-black text-slate-500">
                {selectedDriver.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </span>
            )}
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
            {contracts.map(contract => (
              <button
                key={contract.id}
                onClick={() => setViewerDoc({
                  url: contract.fileUrl!,
                  title: `Contrato${contract.tripOs ? ` · OS ${contract.tripOs}` : ''} · ${selectedDriver.name.split(' ')[0]}`,
                })}
                className="w-full p-5 bg-slate-900 border border-white/5 rounded-[1.8rem] flex items-center justify-between active:bg-blue-600 transition-all group shadow-xl text-left hover:border-blue-500/20"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* PDF icon */}
                  <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 group-active:text-white shrink-0 border border-blue-500/20">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2.5"/>
                    </svg>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-[11px] font-black text-white uppercase truncate">
                      {contract.tripOs ? `OS ${contract.tripOs}` : contract.fileName.replace(/\.[^.]+$/, '')}
                    </p>
                    {contract.destination && (
                      <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5 truncate group-active:text-blue-100">
                        📍 {contract.destination}
                      </p>
                    )}
                    {contract.container && (
                      <p className="text-[8px] font-mono font-black text-slate-400 mt-0.5 group-active:text-blue-200">
                        📦 {contract.container}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                  <span className="text-[7px] font-mono text-slate-600 group-active:text-blue-200">
                    {new Date(contract.uploadedAt).toLocaleDateString('pt-BR')}
                  </span>
                  <svg className="w-4 h-4 text-slate-700 group-active:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9 5l7 7-7 7" strokeWidth="3"/>
                  </svg>
                </div>
              </button>
            ))}
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
