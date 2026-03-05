
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
    
    if (oldId) {
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
          
          // Valida no banco se ainda estão ativos
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
          }
        }
      } catch (e) {
        console.error("Erro na carga da sessão:", e);
      } finally {
        setIsInitializing(false);
      }
    };

    initSession();
  }, []);

  const handleLoginSuccess = async (userData: User) => {
    setUser(userData);
    const now = new Date().toISOString();
    sessionStorage.setItem('als_session_start', now);
    
    // Atualiza presença no banco
    await db.updatePresence(userData.id, 'online');
    
    sessionStorage.setItem('als_active_session', JSON.stringify(userData));
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] mb-8 animate-bounce">
           <span className="text-white font-black italic text-2xl">ALS</span>
        </div>
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
           <div className="h-full bg-blue-600 animate-[loading_2s_infinite]"></div>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-6">Sincronizando Terminal...</p>
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
