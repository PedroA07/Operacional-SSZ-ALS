
import { useEffect, useRef } from 'react';
import { User, PresenceStatus, AppScreen } from '../types';
import { db } from '../utils/storage';

const HEARTBEAT_INTERVAL = 30000; // Sincroniza a cada 30s
const MAX_AWAY_TIME = 15 * 60 * 1000; // 15 minutos

export const usePresenceMonitor = (
  user: User | null, 
  currentScreen: AppScreen, 
  onLogout: () => void
) => {
  const awayTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    // Só monitora se o usuário estiver logado e fora da tela de login
    if (!user || currentScreen === AppScreen.LOGIN) {
      awayTimestampRef.current = null;
      return;
    }

    const updatePresence = async () => {
      const isHidden = document.hidden;
      const status: PresenceStatus = isHidden ? 'away' : 'online';

      if (isHidden) {
        // Se a aba estiver escondida, inicia ou verifica o cronômetro
        if (awayTimestampRef.current === null) {
          awayTimestampRef.current = Date.now();
          console.debug(`[Presence] Usuário ${user.username} ficou ausente.`);
        } else {
          const elapsed = Date.now() - awayTimestampRef.current;
          if (elapsed >= MAX_AWAY_TIME) {
            console.warn(`[Presence] Desconectando por inatividade (>15min).`);
            onLogout();
            return;
          }
        }
      } else {
        // Usuário voltou à aba, reseta o tempo de ausência
        awayTimestampRef.current = null;
      }

      // Batimento cardíaco no banco para liberar conexões Realtime de outros usuários
      try {
        await db.updatePresence(user.id, status);
      } catch (e) {
        console.warn("Falha no heartbeat de presença.");
      }
    };

    // Executa e define intervalo
    updatePresence();
    const interval = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Evento nativo de troca de aba para resposta instantânea
    const handleVisibility = () => updatePresence();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, currentScreen, onLogout]);
};
