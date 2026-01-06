
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

  // Monitor de Presença Real-time (Online / Ausente / Offline)
  useEffect(() => {
    if (!user || currentScreen !== AppScreen.DASHBOARD) return;

    const handlePresence = async (status: PresenceStatus) => {
      await db.updatePresence(user.id, status);
    };

    const handleVisibilityChange = () => {
      handlePresence(document.hidden ? 'away' : 'online');
    };

    const handleFocus = () => handlePresence('online');
    const handleBlur = () => handlePresence('away');

    const handleUnload = () => {
      // Tenta sinalizar offline ao fechar aba
      db.updatePresence(user.id, 'offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleUnload);

    // Heartbeat: mantém o sinal de vida no banco a cada 20s
    const heartbeat = setInterval(() => {
      const status: PresenceStatus = document.hidden ? 'away' : 'online';
      handlePresence(status);
    }, 20000);

    return () => {
      clearInterval(heartbeat);
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
