
import React from 'react';
import { Trip, TripDocument } from '../../../types';
import SmartOperationTable from '../operations/SmartOperationTable';
import { maskCNPJ } from '../../../utils/masks';

interface Props {
  trips: Trip[];
  onUpdate: (trip: Trip) => Promise<void>;
  userId: string;
}

const FreightContractsSubTab: React.FC<Props> = ({ trips, onUpdate, userId }) => {
  
  // Regra: Apenas viagens concluídas e que já tiveram saldo liberado ou pago
  const eligibleTrips = trips.filter(t => 
    t.status === 'Viagem concluída' && 
    (t.balancePayment?.status === 'LIBERAR' || t.balancePayment?.status === 'PAGO')
  );

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
        uploadDate: new Date().toISOString()
      };
      
      const updatedTrip = { ...trip, freightContractDoc: doc };
      await onUpdate(updatedTrip);
    };
    reader.readAsDataURL(file);
  };

  const columns = [
    { 
      key: 'dateTime', 
      label: '1. Data/Hora Viagem', 
      render: (t: Trip) => (
        <div className="flex flex-col">
          <span className="font-black text-slate-800 text-[10px]">{new Date(t.dateTime).toLocaleDateString('pt-BR')}</span>
          <span className="text-blue-600 font-bold text-[9px]">{new Date(t.dateTime).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
        </div>
      )
    },
    { 
      key: 'os', 
      label: '2. OS', 
      render: (t: Trip) => <span className="font-black text-blue-700 text-sm tracking-tighter">{t.os}</span> 
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
      )
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
      )
    },
    { 
      key: 'contract_status', 
      label: '5. Ação Contrato', 
      render: (t: Trip) => {
        const hasDoc = !!t.freightContractDoc;
        return (
          <div className="flex items-center gap-3">
             {hasDoc ? (
               <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl border border-emerald-100 shadow-inner group">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  <span className="text-[9px] font-black uppercase">Anexado</span>
                  <button onClick={() => window.open(t.freightContractDoc!.url, '_blank')} className="ml-2 text-[8px] font-black text-blue-600 hover:underline">Ver</button>
               </div>
             ) : (
               <label className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-all shadow-md active:scale-95 group">
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileUpload(t, e)} />
                  <svg className="w-4 h-4 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  <span className="text-[9px] font-black uppercase tracking-widest">Anexar</span>
               </label>
             )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2.5"/></svg>
        </div>
        <div>
           <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest">Gestão de Contratos de Frete</h4>
           <p className="text-[9px] font-bold text-blue-800 opacity-70 mt-1 uppercase leading-tight">
             Anexe aqui os contratos assinados das viagens concluídas e liberadas. <br/>
             Eles ficarão disponíveis automaticamente no portal do motorista.
           </p>
        </div>
      </div>

      <SmartOperationTable 
        userId={userId} 
        componentId="admin-freight-contracts" 
        columns={columns} 
        data={eligibleTrips} 
        title="Fila de Documentação de Frete"
      />
    </div>
  );
};

export default FreightContractsSubTab;
