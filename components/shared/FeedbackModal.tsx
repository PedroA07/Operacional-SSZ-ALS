
import React from 'react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'confirm';
  onConfirm?: () => void;
  confirmLabel?: string;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ 
  isOpen, onClose, title, message, type = 'info', onConfirm, confirmLabel = 'Confirmar' 
}) => {
  if (!isOpen) return null;

  const colors = {
    info: 'bg-blue-50 text-blue-600 border-blue-100',
    error: 'bg-red-50 text-red-600 border-red-100',
    success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    confirm: 'bg-amber-50 text-amber-600 border-amber-100'
  };

  const icons = {
    info: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    error: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    success: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M5 13l4 4L19 7" /></svg>,
    confirm: <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 text-center space-y-6">
          <div className={`w-20 h-20 rounded-[2rem] mx-auto flex items-center justify-center ${colors[type]}`}>
            {icons[type]}
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">{title}</h3>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-medium">{message}</p>
          </div>
          <div className={`grid ${type === 'confirm' ? 'grid-cols-2' : 'grid-cols-1'} gap-3 pt-2`}>
            <button 
              onClick={onClose} 
              className="py-4.5 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all active:scale-95"
            >
              {type === 'confirm' ? 'Cancelar' : 'Fechar'}
            </button>
            {type === 'confirm' && (
              <button 
                onClick={() => { onConfirm?.(); onClose(); }} 
                className="py-4.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95"
              >
                {confirmLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
