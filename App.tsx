
import React, { useState, useEffect } from 'react';
import { AppScreen, User, PresenceStatus } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './Dashboard';
import DriverPortal from './components/driver/DriverPortal';
import { db } from './utils/storage';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Desbloqueio de áudio no primeiro clique global
  useEffect(() => {
    const unlockAudio = () => {
      const silentAudio = new Audio();
      silentAudio.play().catch(() => {});
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    const initSession = async () => {
      try {
        const saved = sessionStorage.getItem('als_active_session');
        if (saved) {
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
        }
      } catch (e) {
        console.error("Erro na inicialização da sessão:", e);
        sessionStorage.removeItem('als_active_session');
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  // Monitor de Presença Real-time
  useEffect(() => {
    if (!user || currentScreen !== AppScreen.DASHBOARD) return;

    const handlePresence = async (status: PresenceStatus) => {
      try {
        await db.updatePresence(user.id, status);
      } catch (e) {}
    };

    const handleVisibilityChange = () => {
      handlePresence(document.hidden ? 'away' : 'online');
    };

    const handleFocus = () => handlePresence('online');
    const handleBlur = () => handlePresence('away');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    const heartbeat = setInterval(() => {
      const status: PresenceStatus = document.hidden ? 'away' : 'online';
      handlePresence(status);
    }, 20000);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
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
      try {
        await db.updatePresence(user.id, 'offline');
      } catch (e) {}
    }
    setUser(null);
    sessionStorage.removeItem('als_active_session');
    setCurrentScreen(AppScreen.LOGIN);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="text-blue-600 font-black italic text-4xl animate-pulse tracking-tighter">ALS...</div>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-4">Sincronizando Módulos</p>
      </div>
    );
  }

  const renderMainContent = () => {
    if (!user) return null;
    
    if (user.role === 'driver' || user.role === 'motoboy') {
      return <DriverPortal user={user} onLogout={handleLogout} />;
    }
    
    return <Dashboard user={user} onLogout={handleLogout} />;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {currentScreen === AppScreen.LOGIN ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        renderMainContent()
      )}
    </div>
  );
};

export default App;
