import { Driver, Trip } from '../types';

// Meses sem viagens para inativar automaticamente
export const INACTIVE_MONTHS = 3;

// Converte datas em vários formatos (ISO, YYYY-MM-DD, DD/MM/YYYY) para ms
const toMs = (v?: string | null): number => {
  if (!v) return 0;
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.getTime();
  const m = String(v).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) {
    const dd = new Date(`${m[3]}-${m[2]}-${m[1]}`);
    if (!isNaN(dd.getTime())) return dd.getTime();
  }
  return 0;
};

// Data (ms) da viagem mais recente de cada motorista (por id e por nome)
export const buildLastTripDates = (trips: Trip[]): Map<string, number> => {
  const map = new Map<string, number>();
  const bump = (key: string | undefined, ms: number) => {
    if (!key) return;
    const cur = map.get(key) || 0;
    if (ms > cur) map.set(key, ms);
  };
  for (const t of trips) {
    const d = t.driver;
    if (!d) continue;
    const ms = Math.max(
      toMs(t.dateTime),
      toMs((t as any).scheduledDateTime),
      toMs(t.scheduling?.dateTime),
    );
    bump(d.id, ms);
    bump(d.name, ms);
  }
  return map;
};

// Retorna o novo status ('Ativo'|'Inativo') se ele DEVE mudar, ou null se não muda.
// - Inativa motorista ativo sem viagens há mais de INACTIVE_MONTHS (respeitando
//   ajustes manuais recentes via statusLastChangeDate e cadastro recente).
// - Reativa motorista inativo que recebeu uma viagem/programação após a última
//   mudança de status (ex.: nova programação, formulário).
export const computeAutoStatusChange = (
  driver: Driver,
  lastTripMs: number,
  now: number = Date.now(),
): 'Ativo' | 'Inativo' | null => {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - INACTIVE_MONTHS);
  const cutoffMs = cutoff.getTime();

  const statusChangeMs = toMs(driver.statusLastChangeDate);
  const regMs = toMs(driver.registrationDate);

  if (driver.status !== 'Inativo') {
    // Ativo → deve inativar?
    const lastActivity = Math.max(lastTripMs, statusChangeMs, regMs);
    if (lastActivity === 0) return null;          // sem nenhuma referência de data
    return lastActivity < cutoffMs ? 'Inativo' : null;
  }

  // Inativo → reativar se houve viagem recente após a última mudança de status
  if (lastTripMs >= cutoffMs && lastTripMs > statusChangeMs) return 'Ativo';
  return null;
};
