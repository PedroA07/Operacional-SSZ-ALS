
import React, { useState, useEffect } from 'react';
import { Driver } from '../../../types';
import { db } from '../../../utils/storage';

interface DriverLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string | null;
}

const DriverLocationModal: React.FC<DriverLocationModalProps> = ({ isOpen, onClose, driverId }) => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLocation = async () => {
    if (!driverId) return;
    setIsLoading(true);
    try {
      const drivers = await db.getDrivers();
      const found = drivers.find(d => d.id === driverId);
      setDriver(found || null);
    } catch (e) {
      console.warn("Falha ao buscar GPS");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && driverId) {
      loadLocation();
      const interval = setInterval(loadLocation, 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen, driverId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[3.5rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95">
        <header className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Rastreamento ALS em Tempo Real</p>
              <h3 className="text-xl font-black uppercase truncate max-w-md">{driver ? driver.name : 'Localizando...'}</h3>
            </div>
          </div>
          <div className="flex items-center gap-4">
             {driver?.lastLocationAt && (
               <div className="text-right hidden sm:block">
                  <p className="text-[8px] font-black text-slate-400 uppercase">Último Sinal</p>
                  <p className="text-[11px] font-mono font-bold text-white">{new Date(driver.lastLocationAt).toLocaleTimeString('pt-BR')}</p>
               </div>
             )}
             <button onClick={onClose} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-xl">
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
             </button>
          </div>
        </header>

        <div className="flex-1 bg-slate-100 relative">
          {isLoading && !driver ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-sm z-10">
               <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mt-6 animate-pulse">Sincronizando Satélites...</p>
            </div>
          ) : driver?.currentLat ? (
            <iframe 
               width="100%" 
               height="100%" 
               style={{ border: 0 }} 
               loading="lazy" 
               allowFullScreen 
               src={`https://maps.google.com/maps?q=${driver.currentLat},${driver.currentLng}&z=16&output=embed`}
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-slate-50">
               <div className="w-20 h-20 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-6">
                 <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2"/></svg>
               </div>
               <h4 className="text-xl font-black text-slate-800 uppercase">Sem Sinal de GPS</h4>
               <p className="text-sm text-slate-500 mt-2 max-w-sm">O motorista ainda não iniciou o portal ou está em uma zona sem sinal de rede. Assim que o app for aberto, a localização aparecerá aqui.</p>
               <button onClick={loadLocation} className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Tentar Novamente</button>
            </div>
          )}
        </div>
        
        <footer className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-10">
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                 <span className="text-[9px] font-black text-slate-400 uppercase">GPS Ativo</span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[9px] font-black text-slate-400 uppercase">Placa: <span className="text-slate-800 font-mono font-bold">{driver?.plateHorse || '---'}</span></span>
              </div>
           </div>
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ALS TRANSPORTES • SAT-CONTROL SYSTEM</p>
        </footer>
      </div>
    </div>
  );
};

export default DriverLocationModal;
