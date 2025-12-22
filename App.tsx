
import React, { useState, useEffect } from 'react';
import { AppScreen, User } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import DriverPortal from './components/driver/DriverPortal';
import { sessionManager } from './utils/session';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const savedSession = sessionManager.get();
    if (savedSession) {
      setUser(savedSession);
      if (savedSession.role === 'driver' || savedSession.role === 'motoboy') {
        setCurrentScreen(AppScreen.DRIVER_PORTAL);
      } else {
        setCurrentScreen(AppScreen.DASHBOARD);
      }
    }
    setIsInitializing(false);
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    sessionManager.set(userData);
    if (userData.role === 'driver' || userData.role === 'motoboy') {
      setCurrentScreen(AppScreen.DRIVER_PORTAL);
    } else {
      setCurrentScreen(AppScreen.DASHBOARD);
    }
  };

  const handleLogout = () => {
    setUser(null);
    sessionManager.set(null);
    setCurrentScreen(AppScreen.LOGIN);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="text-white font-black italic text-3xl animate-pulse">ALS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {currentScreen === AppScreen.LOGIN && (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      )}
      
      {currentScreen === AppScreen.DASHBOARD && user && (
        <Dashboard user={user} onLogout={handleLogout} />
      )}

      {currentScreen === AppScreen.DRIVER_PORTAL && user && (
        <DriverPortal user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
