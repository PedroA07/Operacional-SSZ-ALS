
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

  // Inicialização de Sessão
  useEffect(() => {
    const initSession = async () => {
      try {
        const saved = sessionStorage.getItem('als_active_session');
        if (saved) {
          const sessionData: User = JSON.parse(saved);
          
          // No "Admin Master", confiamos na sessão local para agilizar o carregamento
          if (sessionData.id === 'admin-master') {
            setUser(sessionData);
            setCurrentScreen(AppScreen.DASHBOARD);
            setIsInitializing(false);
            return;
          }

          // Para outros usuários, re-validamos com o banco com um timeout curto
          const timeout = new Promise((_, rej) => setTimeout(rej, 3000));
          const usersFetch = db.getUsers();
          
          try {
            const allUsers = await Promise.race([usersFetch, timeout]) as User[];
            const dbUser = allUsers.find(u => u.id === sessionData.id);

            if (dbUser && dbUser.status !== 'Inativo') {
              setUser(dbUser);
              await db.updatePresence(dbUser.id, 'online');
              setCurrentScreen(AppScreen.DASHBOARD);
            } else {
              sessionStorage.removeItem('als_active_session');
            }
          } catch (e) {
            // Em caso de timeout/erro, mantemos logado se já tinha sessão para não travar o operacional
            setUser(sessionData);
            setCurrentScreen(AppScreen.DASHBOARD);
          }
        }
      } catch (e) {
        console.error("Sessão corrompida:", e);
        sessionStorage.removeItem('als_active_session');
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  // Monitor de Presença
  useEffect(() => {
    if (!user || currentScreen !== AppScreen.DASHBOARD) return;

    const handlePresence = async (status: PresenceStatus) => {
      try {
        await db.updatePresence(user.id, status);
      } catch (e) {}
    };

    const heartbeat = setInterval(() => {
      const status: PresenceStatus = document.hidden ? 'away' : 'online';
      handlePresence(status);
    }, 30000);

    return () => clearInterval(heartbeat);
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
        <div className="text-blue-600 font-black italic text-5xl animate-pulse tracking-tighter">ALS</div>
        <div className="w-48 h-1 bg-white/5 rounded-full mt-8 overflow-hidden">
           <div className="h-full bg-blue-600 animate-[loading_2s_infinite]"></div>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
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
    <div className="min-h-screen bg-[#020617]">
      {currentScreen === AppScreen.LOGIN ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        renderMainContent()
      )}
    </div>
  );
};

export default App;
