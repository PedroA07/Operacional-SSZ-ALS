
import React, { useState, useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

const SimpleToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    const handleShowToast = (e: any) => {
      const { message, type = 'info', duration = 4000 } = e.detail;
      const id = Math.random().toString(36).substring(2, 9);
      
      setToasts(prev => [...prev, { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    };

    window.addEventListener('als_show_toast', handleShowToast);
    return () => window.removeEventListener('als_show_toast', handleShowToast);
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`
            px-6 py-3 rounded-2xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto flex items-center gap-3
            ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
              toast.type === 'error' ? 'bg-red-600/90 border-red-500 text-white' : 
              toast.type === 'warning' ? 'bg-amber-500/90 border-amber-400 text-white' : 
              'bg-slate-900/90 border-slate-700 text-white'}
          `}
        >
          {toast.type === 'success' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
          )}
          <span className="text-[11px] font-black uppercase tracking-wider">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

export const showToast = (message: string, type: ToastType = 'info', duration = 4000) => {
  window.dispatchEvent(new CustomEvent('als_show_toast', { 
    detail: { message, type, duration } 
  }));
};

export default SimpleToast;
