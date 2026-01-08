
/**
 * ALS OFFLINE MANAGER v1.0
 * Gerencia o cache local de registros e a fila de sincronização de saída.
 */

const STORAGE_KEYS = {
  QUEUE: 'als_sync_queue',
  CACHE_PREFIX: 'als_cache_',
  LAST_SYNC: 'als_last_sync_timestamp'
};

export interface SyncItem {
  id: string;
  type: 'TRIP' | 'DRIVER' | 'CUSTOMER' | 'PORT' | 'PRESTACKING' | 'STAFF' | 'CATEGORY';
  action: 'UPSERT' | 'DELETE';
  payload: any;
  timestamp: number;
  attempts: number;
}

export const offlineManager = {
  // --- GESTÃO DE REGISTROS (CACHE DE LEITURA) ---
  
  getRegistry: <T>(key: string): T[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CACHE_PREFIX + key);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setRegistry: (key: string, data: any[]) => {
    localStorage.setItem(STORAGE_KEYS.CACHE_PREFIX + key, JSON.stringify(data));
    localStorage.setItem(STORAGE_KEYS.LAST_SYNC + '_' + key, Date.now().toString());
  },

  // --- GESTÃO DE FILA (CACHE DE ESCRITA) ---

  addToQueue: (type: SyncItem['type'], action: SyncItem['action'], payload: any) => {
    const queue: SyncItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || '[]');
    const newItem: SyncItem = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      action,
      payload,
      timestamp: Date.now(),
      attempts: 0
    };
    queue.push(newItem);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    return newItem;
  },

  getQueue: (): SyncItem[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || '[]');
  },

  removeFromQueue: (id: string) => {
    const queue: SyncItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || '[]');
    const filtered = queue.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(filtered));
  },

  updateAttempt: (id: string) => {
    const queue: SyncItem[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || '[]');
    const updated = queue.map(item => {
      if (item.id === id) return { ...item, attempts: item.attempts + 1 };
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(updated));
  }
};
