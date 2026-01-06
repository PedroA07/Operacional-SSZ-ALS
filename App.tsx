
import React, { useState, useEffect } from 'react';
import { AppScreen, User, PresenceStatus } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './Dashboard';
import { db } from './utils/storage';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      const saved = sessionStorage.getItem('als_active_session');

      if (saved) {
        try {
          const sessionData: User = JSON.parse(saved);
          const allUsers = await db.getUsers();
          const dbUser = allUsers.find(u => u.id === sessionData.id);

          if (dbUser && dbUser.status !== 'Inativo') {
            setUser(dbUser);
            // Seta como online ao restaurar sessão
            await db.updatePresence(dbUser.id, 'online');
            sessionStorage.setItem('als_active_session', JSON.stringify(dbUser));
            setCurrentScreen(AppScreen.DASHBOARD);
          } else {
            sessionStorage.removeItem('als_active_session');
          }
        } catch (e) {
          sessionStorage.removeItem('als_active_session');
        }
      }
      setIsInitializing(false);
    };

    initSession();
  }, []);

  // Monitor de Presença (Online / Ausente / Offline)
  useEffect(() => {
    if (!user || currentScreen !== AppScreen.DASHBOARD) return;

    const updateStatus = async (status: PresenceStatus) => {
      await db.updatePresence(user.id, status);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('away');
      } else {
        updateStatus('online');
      }
    };

    const handleFocus = () => updateStatus('online');
    const handleBlur = () => updateStatus('away');

    const handleUnload = () => {
      // Tentativa de marcar como offline ao fechar aba
      // beforeunload e unload são restritos em navegadores modernos,
      // mas o beacon ou uma chamada síncrona curta pode funcionar.
      db.updatePresence(user.id, 'offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleUnload);

    // Heartbeat para manter o timer e status ativo no banco
    const interval = setInterval(() => {
      const currentStatus: PresenceStatus = document.hidden ? 'away' : 'online';
      updateStatus(currentStatus);
    }, 15000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [user?.id, currentScreen]);

  const handleLoginSuccess = async (userData: User) => {
    setUser(userData);
    await db.updatePresence(userData.id, 'online');
    sessionStorage.setItem('als_active_session', JSON.stringify(userData));
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  const handleLogout = async () => {
    if (user) {
      await db.updatePresence(user.id, 'offline');
    }
    setUser(null);
    sessionStorage.removeItem('als_active_session');
    setCurrentScreen(AppScreen.LOGIN);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#020617]">
        <div className="text-blue-600 font-black italic text-4xl animate-pulse tracking-tighter">ALS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentScreen === AppScreen.LOGIN ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        user && <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
