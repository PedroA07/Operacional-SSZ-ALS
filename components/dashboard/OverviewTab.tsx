
import React, { useMemo } from 'react';
import { Trip, Driver } from '../../types';

interface OverviewTabProps {
  trips: Trip[];
  drivers: Driver[];
}

const OverviewTab: React.FC<OverviewTabProps> = ({ trips, drivers }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Início e fim da semana atual
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    // Próxima semana
    const startOfNextWeek = new Date(endOfWeek);
    startOfNextWeek.setDate(endOfWeek.getDate() + 1);
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);

    const checkInInterval = (dateStr: string, start: Date, end: Date) => {
      const d = new Date(dateStr);
      return d >= start && d <= end;
    };

    // Corrected: Use 'Viagem concluída' to match TripStatus type
    const activeTrips = trips.filter(t => t.status !== 'Viagem concluída');
    const driversInTripIds = new Set(activeTrips.map(t => t.driver.id));

    return {
      today: trips.filter(t => t.dateTime.startsWith(todayStr)).length,
      thisWeek: trips.filter(t => checkInInterval(t.dateTime, startOfWeek, endOfWeek)).length,
      nextWeek: trips.filter(t => checkInInterval(t.dateTime, startOfNextWeek, endOfNextWeek)).length,
      // Corrected: Use 'Viagem concluída' to match TripStatus type
      completed: trips.filter(t => t.status === 'Viagem concluída').length,
      pending: activeTrips.length,
      delayed: trips.filter(t => t.isLate).length,
      // Frota
      driversInTrip: driversInTripIds.size,
      driversScheduled: trips.filter(t => t.status === 'Pendente').length,
      driversAvailable: drivers.filter(d => d.status === 'Ativo' && !driversInTripIds.has(d.id)).length
    };
  }, [trips, drivers]);

  const Card = ({ title, value, sub, color, icon }: any) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-xl`}>{icon}</div>
      </div>
      {sub && <p className="text-[9px] font-bold text-slate-400 mt-4 uppercase">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Viagens Hoje" value={stats.today} color="bg-blue-500" icon="📅" sub="Programadas para hoje" />
        <Card title="Esta Semana" value={stats.thisWeek} color="bg-indigo-500" icon="📊" sub="Total acumulado da semana" />
        <Card title="Próxima Semana" value={stats.nextWeek} color="bg-slate-500" icon="⏭️" sub="Previsão de demanda" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card title="Concluídas" value={stats.completed} color="bg-emerald-500" icon="✅" />
        <Card title="Pendentes" value={stats.pending} color="bg-amber-500" icon="⏳" />
        <div className="bg-red-600 p-6 rounded-[2rem] shadow-xl shadow-red-500/20 text-white col-span-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Alerta de Atrasos</p>
             <span className="text-2xl animate-pulse">⚠️</span>
          </div>
          <div className="flex items-end justify-between mt-4">
             <p className="text-5xl font-black">{stats.delayed}</p>
             <p className="text-[10px] font-bold uppercase text-right opacity-80">Motoristas fora do<br/>horário previsto</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400 mb-8">Status Operacional da Frota</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Em Viagem / Carregando</p>
            <p className="text-5xl font-black">{stats.driversInTrip}</p>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${(stats.driversInTrip / (drivers.length || 1)) * 100}%` }}></div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Escalados (Aguard. Início)</p>
            <p className="text-5xl font-black text-amber-400">{stats.driversScheduled}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase italic">Prontos para saída</p>
          </div>
          <div className="space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Disponíveis na Base</p>
            <p className="text-5xl font-black text-emerald-400">{stats.driversAvailable}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase italic">Aguardando programação</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
