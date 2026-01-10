
import { useEffect, useRef } from 'react';
import { User, PresenceStatus, AppScreen } from '../types';
import { db } from '../utils/storage';

const HEARTBEAT_INTERVAL = 30000; // 30 segundos
const MAX_AWAY_TIME = 15 * 60 * 1000; // 15 minutos em milissegundos

export const usePresenceMonitor = (
  user: User | null, 
  currentScreen: AppScreen, 
  onLogout: () => void
) => {
  const awayTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    // Só monitora se o usuário estiver logado e no Dashboard
    if (!user || currentScreen !== AppScreen.DASHBOARD) {
      awayTimestampRef.current = null;
      return;
    }

    const updatePresenceStatus = async () => {
      const isHidden = document.hidden;
      const status: PresenceStatus = isHidden ? 'away' : 'online';

      // Gerenciamento do Timer de Inatividade
      if (isHidden) {
        if (awayTimestampRef.current === null) {
          // Usuário acabou de ficar ausente
          awayTimestampRef.current = Date.now();
          console.debug(`[Presence] Usuário ${user.username} entrou em modo AUSENTE.`);
        } else {
          // Verifica se já passou do tempo limite
          const elapsed = Date.now() - awayTimestampRef.current;
          if (elapsed >= MAX_AWAY_TIME) {
            console.warn(`[Presence] Sessão expirada por inatividade (15min+). Forçando logout.`);
            onLogout();
            return;
          }
        }
      } else {
        // Usuário voltou a ficar ativo, reseta o cronômetro
        if (awayTimestampRef.current !== null) {
          console.debug(`[Presence] Usuário ${user.username} retornou.`);
        }
        awayTimestampRef.current = null;
      }

      // Envia o batimento cardíaco para o servidor
      try {
        await db.updatePresence(user.id, status);
      } catch (e) {
        console.error("[Presence] Falha ao sincronizar presença:", e);
      }
    };

    // Executa imediatamente e define o intervalo
    updatePresenceStatus();
    const interval = setInterval(updatePresenceStatus, HEARTBEAT_INTERVAL);

    // Listener para mudanças de visibilidade instantâneas
    const handleVisibilityChange = () => updatePresenceStatus();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, currentScreen, onLogout]);
};
