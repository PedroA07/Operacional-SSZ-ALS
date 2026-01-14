
import React from 'react';

interface StayFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error';
  details?: string[];
}

const StayFeedbackModal: React.FC<StayFeedbackModalProps> = ({ isOpen, onClose, title, message, type, details }) => {
  if (!isOpen) return null;

  const themes = {
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: 'M5 13l4 4L19 7' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    error: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', icon: 'M6 18L18 6M6 6l12 12' }
  };

  const theme = themes[type];

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
        <div className={`p-10 text-center space-y-6`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner border ${theme.bg} ${theme.text} ${theme.border}`}>
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d={theme.icon} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{message}</p>
          </div>

          {details && details.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-4 max-h-32 overflow-y-auto text-left border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Itens Ignorados (Já existem):</p>
              <div className="flex flex-wrap gap-2">
                {details.map((d, i) => (
                  <span key={i} className="text-[10px] font-bold text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-200">OS {d}</span>
                ))}
              </div>
            </div>
          )}

          <button 
            onClick={onClose}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase shadow-xl hover:bg-blue-600 transition-all active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default StayFeedbackModal;
