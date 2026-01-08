
/**
 * ALS OFFLINE MANAGER v1.2
 * Gerencia o cache local de registros e a limpeza profunda de dados.
 */

const STORAGE_KEYS = {
  QUEUE: 'als_sync_queue',
  CACHE_PREFIX: 'als_cache_',
  LAST_SYNC: 'als_last_sync_timestamp',
  UI_PREFS: 'als_ui_preferences'
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

  /**
   * Remove TODOS os dados de cache para garantir que a próxima carga venha 100% do banco.
   */
  clearAllCache: () => {
    const keysToRemove: string[] = [];
    
    // Identifica todas as chaves do ALS
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith(STORAGE_KEYS.CACHE_PREFIX) || 
        key.startsWith(STORAGE_KEYS.LAST_SYNC) ||
        key.includes('als_opt_') || // Filtros de colunas
        key === 'als_active_session'
      )) {
        keysToRemove.push(key);
      }
    }

    // Remove as chaves encontradas
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    console.log("ALS System: Cache de dados e preferências purgado.");
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
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUEUE) || '[]');
    } catch {
      return [];
    }
  },

  removeFromQueue: (id: string) => {
    // Fix: Changed 'this.getQueue()' to 'offlineManager.getQueue()' to fix 'Object is possibly undefined' in arrow function
    const queue = offlineManager.getQueue();
    const filtered = queue.filter((item: SyncItem) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(filtered));
  },

  updateAttempt: (id: string) => {
    // Fix: Changed 'this.getQueue()' to 'offlineManager.getQueue()' to fix 'Object is possibly undefined' in arrow function
    const queue = offlineManager.getQueue();
    const updated = queue.map((item: SyncItem) => {
      if (item.id === id) return { ...item, attempts: item.attempts + 1 };
      return item;
    });
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(updated));
  }
};