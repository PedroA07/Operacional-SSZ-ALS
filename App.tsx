
import React, { useState, useEffect } from 'react';
import { AppScreen, User } from './types';
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
            await db.updatePresence(dbUser.id, true);
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

  // Monitor de Status Online (Presença Real-time)
  useEffect(() => {
    if (!user || currentScreen !== AppScreen.DASHBOARD) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        db.updatePresence(user.id, true);
      }
    }, 15000);
    
    // Função para "zerar" a presença ao fechar o site ou aba
    const handleUnload = () => {
      // Usamos o navigator.sendBeacon se possível para chamadas de fechamento de aba
      // Mas como updatePresence é assíncrona, fazemos o melhor esforço
      db.updatePresence(user.id, false);
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [user?.id, currentScreen]);

  const handleLoginSuccess = async (userData: User) => {
    setUser(userData);
    await db.updatePresence(userData.id, true);
    sessionStorage.setItem('als_active_session', JSON.stringify(userData));
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  const handleLogout = async () => {
    if (user) {
      // Marca como offline antes de sair para zerar os timers dos outros usuários imediatamente
      await db.updatePresence(user.id, false);
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
