
import { Trip, Devolucao } from '../types';

export type ReuseMatch =
  | { source: 'trip'; os: string; type: string; dateTime: string }
  | { source: 'devolucao'; id: string; os: string; createdAt: string };

const WINDOW_DAYS = 60;

function normContainer(s: string) {
  return (s || '').trim().toUpperCase();
}

function isDeliveryType(type: string) {
  const t = (type || '').toUpperCase();
  return t.includes('ENTREGA') || t.includes('IMPORTA');
}

function isPickupType(type: string) {
  const t = (type || '').toUpperCase();
  return t.includes('COLETA') || t.includes('EXPORTA');
}

function daysDiff(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000;
}

/**
 * Para cada trip de Entrega/Importação com container preenchido,
 * procura se o mesmo container aparece em uma trip de Coleta/Exportação
 * dentro de ±60 dias. Se não achar na lista de trips, busca nas minutas
 * de devolução de vazio. Retorna um Map<tripId, ReuseMatch>.
 */
export function detectContainerReuse(
  trips: Trip[],
  devolucoes: Devolucao[]
): Map<string, ReuseMatch> {
  const result = new Map<string, ReuseMatch>();

  const deliveryTrips = trips.filter(t => t.container && isDeliveryType(t.type));
  const pickupTrips   = trips.filter(t => t.container && isPickupType(t.type));

  const pickupByContainer = new Map<string, Trip[]>();
  for (const t of pickupTrips) {
    const key = normContainer(t.container);
    if (!pickupByContainer.has(key)) pickupByContainer.set(key, []);
    pickupByContainer.get(key)!.push(t);
  }

  const devByContainer = new Map<string, Devolucao[]>();
  for (const d of devolucoes) {
    if (!d.container) continue;
    const key = normContainer(d.container);
    if (!devByContainer.has(key)) devByContainer.set(key, []);
    devByContainer.get(key)!.push(d);
  }

  for (const trip of deliveryTrips) {
    const key = normContainer(trip.container);

    // 1. Busca em trips de Coleta/Exportação
    const matchTrip = (pickupByContainer.get(key) || []).find(p => {
      if (p.id === trip.id) return false;
      const diff = daysDiff(trip.dateTime, p.dateTime);
      return diff >= -30 && diff <= WINDOW_DAYS;
    });

    if (matchTrip) {
      result.set(trip.id, {
        source: 'trip',
        os: matchTrip.os,
        type: matchTrip.type,
        dateTime: matchTrip.dateTime,
      });
      continue;
    }

    // 2. Fallback: busca em minutas de devolução
    const matchDev = (devByContainer.get(key) || []).find(d => {
      const diff = daysDiff(trip.dateTime, d.createdAt);
      return diff >= -30 && diff <= WINDOW_DAYS;
    });

    if (matchDev) {
      result.set(trip.id, {
        source: 'devolucao',
        id: matchDev.id,
        os: matchDev.os,
        createdAt: matchDev.createdAt,
      });
    }
  }

  return result;
}
