
import React, { useState, useEffect } from 'react';
import { AppScreen, User } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import DriverPortal from './components/driver/DriverPortal';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    if (userData.role === 'driver') {
      setCurrentScreen(AppScreen.DRIVER_PORTAL);
    } else {
      setCurrentScreen(AppScreen.DASHBOARD);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen(AppScreen.LOGIN);
  };

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
