
import React from 'react';
import { Notification } from '../../../types';

interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: Notification;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({ isOpen, onClose, notification }) => {
  if (!isOpen) return null;

  const isDriver = notification.origin === 'MOTORISTA';

  return (
    <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col border border-white/10">
        
        {/* CABEÇALHO */}
        <div className={`p-10 ${isDriver ? 'bg-emerald-600' : 'bg-blue-600'} text-white relative`}>
           <div className="absolute top-0 right-0 p-4 opacity-10">
              <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
              </svg>
           </div>
           <div className="relative z-10">
              <span className="px-3 py-1 bg-white/20 rounded-full text-[8px] font-black uppercase tracking-widest border border-white/20">
                {notification.type.replace(/_/g, ' ')}
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight mt-4 leading-tight">
                {notification.title}
              </h3>
              <p className="text-[10px] font-bold text-white/70 uppercase mt-2">
                Evento registrado em {new Date(notification.timestamp).toLocaleString('pt-BR')}
              </p>
           </div>
        </div>

        {/* CONTEÚDO */}
        <div className="p-10 space-y-8 bg-[#fcfdfe]">
           <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Mensagem do Sistema</p>
              <p className="text-sm font-medium text-slate-700 leading-relaxed italic">
                "{notification.description}"
              </p>
           </div>

           {notification.summary && (Object.keys(notification.summary).length > 0) && (
             <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Dados da Operação</p>
                <div className="grid grid-cols-2 gap-4">
                   {notification.summary.os && (
                     <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-blue-500 uppercase">Ordem de Serviço</p>
                        <p className="text-sm font-black text-slate-800 uppercase mt-1">{notification.summary.os}</p>
                     </div>
                   )}
                   {notification.summary.placa && (
                     <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-500 uppercase">Veículo Alocado</p>
                        <p className="text-sm font-black font-mono text-slate-800 uppercase mt-1">{notification.summary.placa}</p>
                     </div>
                   )}
                   {notification.summary.motorista && (
                     <div className="col-span-2 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[8px] font-black text-slate-500 uppercase">Motorista / Colaborador</p>
                        <p className="text-sm font-black text-slate-800 uppercase mt-1">{notification.summary.motorista}</p>
                     </div>
                   )}
                </div>
             </div>
           )}

           <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px]">
                       {notification.authorName.charAt(0)}
                    </div>
                    <div>
                       <p className="text-[8px] font-black text-slate-400 uppercase">Autor da Ação</p>
                       <p className="text-[10px] font-bold text-slate-700 uppercase">{notification.authorName}</p>
                    </div>
                 </div>
                 <p className="text-[9px] font-mono text-slate-300">ID: {notification.authorId.slice(-8)}</p>
              </div>
           </div>
        </div>

        {/* AÇÕES */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 grid grid-cols-1 gap-3">
           <button 
             onClick={onClose}
             className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95"
           >
             Ciente / Fechar
           </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDetailModal;
