
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
          const userData: User = JSON.parse(saved);
          const now = new Date();
          const lastLoginDate = new Date(userData.lastLogin);
          
          // LÓGICA DE SINCRONIZAÇÃO DE TIMER DIÁRIO:
          // Se o dia mudou (ex: login ontem, abriu hoje) OU se passou mais de 12h,
          // resetamos o lastLogin para "agora" tanto localmente quanto no DB.
          const isDifferentDay = now.toLocaleDateString() !== lastLoginDate.toLocaleDateString();
          const isTooOld = (now.getTime() - lastLoginDate.getTime()) > (12 * 60 * 60 * 1000);

          if (isDifferentDay || isTooOld) {
            const freshTimestamp = now.toISOString();
            const updatedUser = { ...userData, lastLogin: freshTimestamp };
            
            // Atualiza Estado, SessionStorage e o Banco de Dados (Supabase/Local)
            setUser(updatedUser);
            sessionStorage.setItem('als_active_session', JSON.stringify(updatedUser));
            await db.saveUser(updatedUser);
          } else {
            setUser(userData);
          }
          
          setCurrentScreen(AppScreen.DASHBOARD);
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

    const updatePresence = async () => {
      const isVisible = document.visibilityState === 'visible';
      await db.updatePresence(user.id, isVisible);
    };

    updatePresence();
    const interval = setInterval(updatePresence, 15000);
    
    const handleVisibility = () => updatePresence();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id, currentScreen]);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    sessionStorage.setItem('als_active_session', JSON.stringify(userData));
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  const handleLogout = () => {
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
