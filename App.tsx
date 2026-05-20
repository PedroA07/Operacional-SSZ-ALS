
import React, { useState, useEffect } from 'react';
import { AppScreen, User } from './types';
import LoginForm from './components/LoginForm';
import Dashboard from './Dashboard';
import DriverPortal from './components/driver/DriverPortal';
import BeneficiaryPortal from './components/beneficiary/BeneficiaryPortal';
import ExternalUserApp from './components/dashboard/third-party/ExternalUserApp';
import ForcePasswordChange from './components/ForcePasswordChange';
import StandaloneOperationsPage from './components/StandaloneOperationsPage';
import { db } from './utils/storage';
import { usePresenceMonitor } from './hooks/usePresenceMonitor';
import { authSecurity } from './utils/authSecurity';

const isStandaloneOps = new URLSearchParams(window.location.search).get('view') === 'ops';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingFirstLogin, setPendingFirstLogin] = useState<User | null>(null);

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
            // Sempre atualiza sessionStorage com dados frescos do banco (inclui notificationPrefs)
            const mergedSession = { ...JSON.parse(saved), ...dbUser };
            sessionStorage.setItem('als_active_session', JSON.stringify(mergedSession));
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
    const now = new Date().toISOString();
    sessionStorage.setItem('als_session_start', now);
    await db.updatePresence(userData.id, 'online');

    if (authSecurity.mustChangePassword(userData)) {
      setPendingFirstLogin(userData);
      return;
    }

    setUser(userData);
    sessionStorage.setItem('als_active_session', JSON.stringify(userData));
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  const handlePasswordChanged = (updatedUser: User) => {
    setPendingFirstLogin(null);
    setUser(updatedUser);
    setCurrentScreen(AppScreen.DASHBOARD);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.3)] mb-8 animate-bounce overflow-hidden">
         <img src="/logo.jpg" alt="ALS" className="w-full h-full object-cover rounded-xl" />
      </div>
        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
           <div className="h-full bg-blue-600 animate-[loading_2s_infinite]"></div>
        </div>
        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em] mt-6">Sincronizando Terminal...</p>
      </div>
    );
  }

  // Modo tela cheia do painel operacional (nova guia)
  if (isStandaloneOps && user && currentScreen === AppScreen.DASHBOARD) {
    return <StandaloneOperationsPage user={user} />;
  }

  return (
    <div className="min-h-screen bg-[#020617]">
      {pendingFirstLogin ? (
        <ForcePasswordChange user={pendingFirstLogin} onDone={handlePasswordChanged} />
      ) : currentScreen === AppScreen.LOGIN ? (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      ) : user?.role === 'driver' || user?.role === 'motoboy' ? (
        <DriverPortal user={user} onLogout={handleLogout} />
      ) : user?.role === 'beneficiary' ? (
        <BeneficiaryPortal user={user} onLogout={handleLogout} />
      ) : user?.role === 'third_party' ? (
        <ExternalUserApp user={user} onLogout={handleLogout} />
      ) : user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginForm onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
};

export default App;
