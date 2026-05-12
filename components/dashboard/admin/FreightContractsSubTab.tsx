
import React, { useState, useCallback } from 'react';
import { Trip, TripDocument, Driver } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';

interface Props {
  trips: Trip[];
  onUpdate: (trip: Trip) => Promise<void>;
  userId: string;
  drivers?: Driver[];
  onUpdateDriver?: (driver: Driver) => Promise<void>;
}

type SendTo = 'driver' | 'beneficiary' | 'group';

interface DriverRowState {
  sendTo: SendTo;
  lastDate: string;
  lastLocation: string;
  saving: boolean;
}

const SEND_TO_LABELS: Record<SendTo, string> = {
  driver: 'Motorista',
  beneficiary: 'Beneficiário',
  group: 'Grupo (ambos)',
};

const FreightContractsSubTab: React.FC<Props> = ({ trips, onUpdate, userId, drivers = [], onUpdateDriver }) => {
  const [view, setView] = useState<'queue' | 'recipients'>('queue');
  const [rowStates, setRowStates] = useState<Record<string, DriverRowState>>({});

  const getRowState = useCallback((driver: Driver): DriverRowState => {
    if (rowStates[driver.id]) return rowStates[driver.id];
    return {
      sendTo: driver.freightContractSendTo || 'driver',
      lastDate: driver.lastFreightContractDate || '',
      lastLocation: driver.lastFreightContractLocation || '',
      saving: false,
    };
  }, [rowStates]);

  const setRowField = (driverId: string, field: keyof DriverRowState, value: any) => {
    setRowStates(prev => ({
      ...prev,
      [driverId]: { ...getRowState({ id: driverId } as Driver), ...prev[driverId], [field]: value },
    }));
  };

  const handleSaveDriver = async (driver: Driver) => {
    if (!onUpdateDriver) return;
    const state = getRowState(driver);
    setRowField(driver.id, 'saving', true);
    try {
      await onUpdateDriver({
        ...driver,
        freightContractSendTo: state.sendTo,
        lastFreightContractDate: state.lastDate || undefined,
        lastFreightContractLocation: state.lastLocation || undefined,
      });
    } finally {
      setRowField(driver.id, 'saving', false);
    }
  };

  const eligibleTrips = trips.filter(t =>
    (t.isCompleted || t.status === 'Viagem concluída') &&
    (t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO')
  );

  const activeDrivers = drivers.filter(d => d.status === 'Ativo' && d.driverType !== 'Motoboy');

  const handleFileUpload = (trip: Trip, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const doc: TripDocument = {
        id: `freight-contract-${Date.now()}`,
        type: 'CONTRATO_FRETE',
        url: reader.result as string,
        fileName: `CONTRATO - ${trip.driver.name} - OS ${trip.os}`,
        uploadDate: new Date().toISOString(),
      };
      await onUpdate({ ...trip, freightContractDoc: doc });
    };
    reader.readAsDataURL(file);
  };

  const queueColumns = [
    {
      key: 'dateTime',
      label: '1. Data/Hora Viagem',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 text-[10px]">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className="text-blue-600 font-bold text-[9px]">{new Date(t.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      ),
    },
    {
      key: 'os',
      label: '2. OS',
      render: (t: Trip) => <span className="font-black text-blue-700 text-sm tracking-tighter">{t.os}</span>,
    },
    {
      key: 'customer_info',
      label: '3. Cliente (Razão / Fantasia)',
      render: (t: Trip) => (
        <div className="flex flex-col max-w-[280px]">
          <span className="font-black text-slate-800 uppercase text-[10px] leading-tight truncate">{t.customer?.legalName || t.customer?.name}</span>
          <p className="text-[8px] font-bold text-slate-400 uppercase italic mt-0.5">FAN: {t.customer?.name}</p>
          <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-slate-50">
            <span className="text-[8px] font-black text-blue-500 uppercase">{t.customer?.city} - {t.customer?.state}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'driver_info',
      label: '4. Motorista / Equipamento',
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-700 uppercase text-[10px] leading-tight">{t.driver?.name}</span>
          <div className="flex gap-1.5 mt-2">
            <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold uppercase shadow-sm">{t.driver?.plateHorse}</span>
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200 text-[9px] font-mono font-bold uppercase">{t.driver?.plateTrailer}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'contract_status',
      label: '5. Ação Contrato',
      render: (t: Trip) => {
        const hasDoc = !!t.freightContractDoc;
        return (
          <div className="flex items-center gap-3">
            {hasDoc ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-100 shadow-inner">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-[9px] font-black uppercase">Anexado</span>
                <button onClick={() => window.open(t.freightContractDoc!.url, '_blank')} className="ml-2 text-[8px] font-black text-blue-600 hover:underline">Ver</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95">
                <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(t, e)} />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                <span className="text-[9px] font-black uppercase tracking-widest">Anexar</span>
              </label>
            )}
          </div>
        );
      },
    },
  ];

  const phoneDisplay = (driver: Driver, state: DriverRowState) => {
    if (state.sendTo === 'driver') return driver.phone || '—';
    if (state.sendTo === 'beneficiary') return driver.beneficiaryPhone || '—';
    return driver.whatsappGroupName ? `Grupo: ${driver.whatsappGroupName}` : (driver.whatsappGroupLink ? 'Grupo configurado' : '—');
  };

  return (
    <div className="space-y-6">
      {/* Header info */}
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5" /></svg>
        </div>
        <div>
          <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Gestão de Contratos de Frete</h4>
          <p className="text-[9px] font-bold text-blue-800 opacity-70 mt-1 uppercase leading-tight">
            Gerencie a fila de contratos pendentes e configure os destinatários de envio via WhatsApp.
          </p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView('queue')}
          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'queue' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          Fila de Contratos
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] ${view === 'queue' ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'}`}>{eligibleTrips.length}</span>
        </button>
        <button
          onClick={() => setView('recipients')}
          className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'recipients' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          Motoristas Destinatários
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[8px] ${view === 'recipients' ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-500'}`}>{activeDrivers.length}</span>
        </button>
      </div>

      {/* Queue view */}
      {view === 'queue' && (
        <SmartOperationTable
          userId={userId}
          componentId="admin-freight-contracts"
          columns={queueColumns}
          data={eligibleTrips}
          title="Fila de Documentação de Frete"
        />
      )}

      {/* Recipients view */}
      {view === 'recipients' && (
        <div className="space-y-3">
          {activeDrivers.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-[11px] font-black uppercase tracking-widest">
              Nenhum motorista ativo cadastrado
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Motorista', 'Beneficiário', 'Enviar para', 'Telefone / Grupo', 'Data Último Contrato', 'Local Último Contrato', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[8px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeDrivers.map((driver, idx) => {
                    const state = getRowState(driver);
                    const phone = phoneDisplay(driver, state);
                    const isDirty =
                      state.sendTo !== (driver.freightContractSendTo || 'driver') ||
                      state.lastDate !== (driver.lastFreightContractDate || '') ||
                      state.lastLocation !== (driver.lastFreightContractLocation || '');

                    return (
                      <tr key={driver.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        {/* Motorista */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 text-[10px] uppercase leading-tight">{driver.name}</span>
                            <div className="flex gap-1 mt-1">
                              <span className="bg-slate-900 text-white px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">{driver.plateHorse}</span>
                              {driver.plateTrailer && (
                                <span className="bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold">{driver.plateTrailer}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Beneficiário */}
                        <td className="px-4 py-3">
                          {driver.beneficiaryName ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700 text-[10px] uppercase leading-tight">{driver.beneficiaryName}</span>
                              {driver.beneficiaryCnpj && (
                                <span className="text-[8px] text-slate-400 font-bold mt-0.5">{driver.beneficiaryCnpj}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-300 font-bold italic">Não cadastrado</span>
                          )}
                        </td>

                        {/* Enviar para */}
                        <td className="px-4 py-3">
                          <select
                            value={state.sendTo}
                            onChange={e => setRowField(driver.id, 'sendTo', e.target.value as SendTo)}
                            className="text-[9px] font-black uppercase bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm"
                          >
                            <option value="driver">Motorista</option>
                            <option value="beneficiary" disabled={!driver.beneficiaryPhone}>Beneficiário{!driver.beneficiaryPhone ? ' (sem tel.)' : ''}</option>
                            <option value="group" disabled={!driver.whatsappGroupLink && !driver.whatsappGroupName}>Grupo (ambos){!driver.whatsappGroupLink && !driver.whatsappGroupName ? ' (não config.)' : ''}</option>
                          </select>
                        </td>

                        {/* Telefone */}
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-black ${state.sendTo === 'group' ? 'text-emerald-600' : 'text-blue-600'} tabular-nums`}>
                            {phone}
                          </span>
                        </td>

                        {/* Data último contrato */}
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={state.lastDate}
                            onChange={e => setRowField(driver.id, 'lastDate', e.target.value)}
                            className="text-[9px] font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm w-36"
                          />
                        </td>

                        {/* Local último contrato */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={state.lastLocation}
                            onChange={e => setRowField(driver.id, 'lastLocation', e.target.value)}
                            placeholder="Ex: Santos/SP → São Paulo/SP"
                            className="text-[9px] font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm w-48 placeholder:text-slate-300"
                          />
                        </td>

                        {/* Salvar */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleSaveDriver(driver)}
                            disabled={state.saving || !isDirty || !onUpdateDriver}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${
                              isDirty && !state.saving
                                ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }`}
                          >
                            {state.saving ? (
                              <span className="flex items-center gap-1">
                                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                                Salvando
                              </span>
                            ) : 'Salvar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FreightContractsSubTab;
