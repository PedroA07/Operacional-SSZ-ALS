
import React, { useState, useEffect } from 'react';
import { AppScreen, User } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Verifica se há sessão salva no sessionStorage
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) {
      const userData = JSON.parse(saved);
      setUser(userData);
      setCurrentScreen(AppScreen.DASHBOARD);
    }
    setIsInitializing(false);
  }, []);

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
