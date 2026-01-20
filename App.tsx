
import React, { useState, useEffect } from 'react';
import { AppScreen, User } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './Dashboard';
import DriverPortal from './components/driver/DriverPortal';
import { db } from './utils/storage';
import { usePresenceMonitor } from './hooks/usePresenceMonitor';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const handleLogout = async () => {
    const oldId = user?.id;
    setUser(null);
    setCurrentScreen(AppScreen.LOGIN);
    sessionStorage.removeItem('als_active_session');
    sessionStorage.removeItem('als_session_start');
    
    if (oldId && oldId !== 'admin-master') {
      try {
        await db.updatePresence(oldId, 'offline');
      } catch (e) {}
    }
  };

  usePresenceMonitor(user, currentScreen, handleLogout);

  useEffect(() => {
    const initSession = async () => {
      try {
        const saved = sessionStorage.getItem('als_active_session');
        if (saved) {
          const sessionData: User = JSON.parse(saved);
          
          // Se for o admin master, reconecta direto
          if (sessionData.username === 'operacional_ssz') {
            setUser(sessionData);
            // Garante que o session_start exista se não houver (ex: após refresh)
            if (!sessionStorage.getItem('als_session_start')) {
              sessionStorage.setItem('als_session_start', new Date().toISOString());
            }
            setCurrentScreen(AppScreen.DASHBOARD);
            setIsInitializing(false);
            return;
          }

          // Para outros usuários, valida no banco se ainda estão ativos
          const users = await db.getUsers();
          const dbUser = users.find(u => u.id === sessionData.id);

          if (dbUser && dbUser.status !== 'Inativo') {
            setUser(dbUser);
            await db.updatePresence(dbUser.id, 'online');
            if (!sessionStorage.getItem('als_session_start')) {
              sessionStorage.setItem('als_session_start', new Date().toISOString());
            }
            setCurrentScreen(AppScreen.DASHBOARD);
          } else {
            sessionStorage.removeItem('als_active_session');
            sessionStorage.removeItem('als_session_start');
          }
        }
      } catch (e) {
        console.error("Session Init Error:", e);
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  const handleLoginSuccess = async (userData: User) => {
    setUser(userData);
    // Define o início da sessão apenas no momento do login manual
    const now = new Date().toISOString();
    sessionStorage.setItem('als_session_start', now);
    
    if (userData.id !== 'admin-master') {
      await db.updatePresence(userData.id, 'online');
    } else {
      // Para o master, forçamos um sinal de vida inicial
      await db.updatePresence('admin-master', 'online');
    }
    
    sessionStorage.setItem('als_active_session', JSON.stringify(userData));
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="text-blue-600 font-black italic text-5xl animate-pulse">ALS</div>
        <div className="w-48 h-1 bg-white/5 rounded-full mt-8 overflow-hidden">
           <div className="h-full bg-blue-600 animate-[loading_2s_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {currentScreen === AppScreen.LOGIN ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : user?.role === 'driver' || user?.role === 'motoboy' ? (
        <DriverPortal user={user} onLogout={handleLogout} />
      ) : user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
