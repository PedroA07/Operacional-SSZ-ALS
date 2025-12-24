
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
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        setUser(userData);
        setCurrentScreen(AppScreen.DASHBOARD);
      } catch (e) {
        sessionStorage.removeItem('als_active_session');
      }
    }
    setIsInitializing(false);
  }, []);

  // Monitor de Status Online (Visibilidade e Heartbeat)
  useEffect(() => {
    if (!user || currentScreen !== AppScreen.DASHBOARD) return;

    const updatePresence = async () => {
      const isVisible = document.visibilityState === 'visible';
      await db.updatePresence(user.id, isVisible);
    };

    // Heartbeat a cada 20 segundos para manter o status "LIVE"
    updatePresence();
    const interval = setInterval(updatePresence, 20000);
    document.addEventListener('visibilitychange', updatePresence);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', updatePresence);
    };
  }, [user, currentScreen]);

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
