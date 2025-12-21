
import React from 'react';
import { Trip } from '../../types';

interface OverviewTabProps {
  trips: Trip[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trips }) => {
  const ongoing = trips.filter(t => t.status !== 'CONCLUIDA');
  const importTrips = ongoing.filter(t => t.type === 'IMPORT_ENTREGA');
  const exportTrips = ongoing.filter(t => t.type === 'EXPORT_COLETA');

  const renderStatusStep = (label: string, completed: boolean, dt?: string, extra?: string) => (
    <div className="flex items-start gap-3">
      <div className={`w-3 h-3 rounded-full mt-1 border-2 ${completed ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}></div>
      <div className="flex-1">
        <div className="flex justify-between items-center">
          <p className={`text-[9px] font-black uppercase ${completed ? 'text-slate-700' : 'text-slate-300'}`}>{label}</p>
          {completed && dt && <span className="text-[8px] font-bold text-blue-500">{new Date(dt).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>}
        </div>
        {extra && <p className="text-[8px] text-slate-400 font-bold uppercase italic mt-0.5">{extra}</p>}
      </div>
    </div>
  );

  const renderTripCard = (trip: Trip) => (
    <div key={trip.id} className={`bg-white rounded-2xl border-2 p-5 shadow-sm ${trip.status === 'ATRASADA' ? 'border-red-100 bg-red-50/5' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${trip.type === 'IMPORT_ENTREGA' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {trip.type === 'IMPORT_ENTREGA' ? 'Entrega / Importação' : 'Exportação / Coleta'}
          </span>
          <h4 className="text-sm font-black text-slate-800 mt-2">OS: {trip.os}</h4>
          <p className="text-[9px] text-slate-400 font-bold uppercase">{trip.customerName}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase">Agenda</p>
          <p className="text-[11px] font-black text-slate-700">{new Date(trip.scheduledDateTime).toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5 pb-4 border-b border-slate-50">
        <div>
          <p className="text-[8px] font-black text-slate-400 uppercase">Motorista</p>
          <p className="text-[10px] font-bold text-slate-700 uppercase">{trip.driverName}</p>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase">Equipamento</p>
          <p className="text-[10px] font-black text-blue-600 font-mono">{trip.plateHorse} / {trip.plateTrailer}</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {trip.type === 'IMPORT_ENTREGA' ? (
          <>
            {renderStatusStep("Retirada Vazio", !!trip.milestones.retiradaVazio, trip.milestones.retiradaVazio?.dt)}
            {renderStatusStep("Chegada no Cliente", !!trip.milestones.chegadaCliente, trip.milestones.chegadaCliente?.dt)}
            {renderStatusStep("Retirada do Cheio", !!trip.milestones.retiradaCheio, trip.milestones.retiradaCheio?.dt)}
            {renderStatusStep("Agendamento (Porto/Cliente)", !!trip.milestones.agendamento, trip.milestones.agendamento?.dt, trip.milestones.agendamento?.location)}
            {renderStatusStep("Entrega do Container", !!trip.milestones.entregaFinal, trip.milestones.entregaFinal?.dt)}
          </>
        ) : (
          <>
            {renderStatusStep("Liberação Retirada", !!trip.milestones.liberacaoRetirada, trip.milestones.liberacaoRetirada?.dt, trip.milestones.liberacaoRetirada?.location)}
            {renderStatusStep("Retirada do Vazio", !!trip.milestones.retiradaVazio, trip.milestones.retiradaVazio?.dt)}
            {renderStatusStep("Chegada no Cliente", !!trip.milestones.chegadaCliente, trip.milestones.chegadaCliente?.dt)}
            {renderStatusStep("Abasteceu Vazio (NF)", !!trip.milestones.baixaNF, trip.milestones.baixaNF?.dt)}
            {renderStatusStep("Saída do Cliente", !!trip.milestones.saidaCliente, trip.milestones.saidaCliente?.dt)}
            {renderStatusStep("Agendamento Porto", !!trip.milestones.agendamento, trip.milestones.agendamento?.dt, trip.milestones.agendamento?.location)}
            {renderStatusStep("Entregue", !!trip.milestones.entregaFinal, trip.milestones.entregaFinal?.dt)}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Viagens de Hoje</p>
          <p className="text-3xl font-black text-blue-600">{ongoing.length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Atrasos Identificados</p>
          <p className="text-3xl font-black text-red-500">{ongoing.filter(t => t.status === 'ATRASADA').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Concluídas na Semana</p>
          <p className="text-3xl font-black text-emerald-500">{trips.filter(t => t.status === 'CONCLUIDA').length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Programadas Próx. Semana</p>
          <p className="text-3xl font-black text-slate-800">0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-800 uppercase italic border-l-4 border-indigo-500 pl-3">Importação & Entrega</h3>
          <div className="grid gap-6">
            {importTrips.map(renderTripCard)}
            {importTrips.length === 0 && (
              <div className="bg-white/50 p-10 rounded-2xl border border-dashed border-slate-200 text-center text-[10px] font-black text-slate-300 uppercase italic">
                Nenhuma viagem de importação ativa.
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <h3 className="text-sm font-black text-slate-800 uppercase italic border-l-4 border-emerald-500 pl-3">Exportação & Coleta</h3>
          <div className="grid gap-6">
            {exportTrips.map(renderTripCard)}
            {exportTrips.length === 0 && (
              <div className="bg-white/50 p-10 rounded-2xl border border-dashed border-slate-200 text-center text-[10px] font-black text-slate-300 uppercase italic">
                Nenhuma viagem de exportação ativa.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="pt-8 border-t border-slate-200">
        <h3 className="text-sm font-black text-slate-400 uppercase mb-6">Projeção Próxima Semana</h3>
        <div className="bg-slate-100/50 rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Aguardando dados de programação.</p>
        </div>
      </section>
    </div>
  );
};

export default OverviewTab;
