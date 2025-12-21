
import React, { useState, useEffect } from 'react';
import { AppScreen, User } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);

  const handleLoginSuccess = (username: string) => {
    setUser({
      username,
      role: 'admin',
      lastLogin: new Date().toLocaleString('pt-BR')
    });
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen(AppScreen.LOGIN);
  };

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300">
      {currentScreen === AppScreen.LOGIN ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
