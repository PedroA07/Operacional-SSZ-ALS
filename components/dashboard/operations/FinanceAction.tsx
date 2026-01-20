
import React, { useState } from 'react';
import { Trip, User, PaymentStatus } from '../../../types';
import { db } from '../../../utils/storage';

interface FinanceActionProps {
  trip: Trip;
  user: User;
  onRefresh: () => void;
}

const FinanceAction: React.FC<FinanceActionProps> = ({ trip, user, onRefresh }) => {
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const togglePayment = async (type: 'advance' | 'balance') => {
    if (isProcessing) return;

    const isAdvance = type === 'advance';
    // Garantia de inicialização se o campo estiver nulo
    const currentPayment = (isAdvance ? trip.advancePayment : trip.balancePayment) || { status: isAdvance ? 'BLOQUEADO' : 'AGUARDANDO_DOCS' };
    
    // Bloqueio: Não altera se já estiver pago (status final do financeiro)
    if (currentPayment.status === 'PAGO') return;

    // REGRA: 30% só pode ser marcado se 70% estiver LIBERADO ou PAGO
    if (!isAdvance) {
      const advanceStatus = trip.advancePayment?.status || 'BLOQUEADO';
      if (advanceStatus !== 'LIBERAR' && advanceStatus !== 'PAGO') {
        return; 
      }
    }

    const isCurrentlyLiberated = currentPayment.status === 'LIBERAR';
    
    setIsProcessing(type);
    try {
      const nextStatus: PaymentStatus['status'] = isCurrentlyLiberated 
        ? (isAdvance ? 'BLOQUEADO' : 'AGUARDANDO_DOCS') 
        : 'LIBERAR';

      const updatedTrip = {
        ...trip,
        [isAdvance ? 'advancePayment' : 'balancePayment']: {
          ...currentPayment,
          status: nextStatus,
          liberatedAt: nextStatus === 'LIBERAR' ? new Date().toISOString() : undefined
        }
      };

      const success = await db.saveTrip(updatedTrip, user);
      
      if (success) {
        if (nextStatus === 'LIBERAR') {
          await db.addNotification(
            user, 
            'PAYMENT_LIBERATED', 
            `${isAdvance ? '70%' : '30%'} LIBERADO`, 
            `Autorização de pagamento OS ${trip.os} enviada ao financeiro.`,
            { os: trip.os, motorista: trip.driver.name }
          );
        }
        onRefresh();
      }
    } catch (e) {
      console.error("Erro financeiro:", e);
    } finally {
      setIsProcessing(null);
    }
  };

  const FinanceButton = ({ type }: { type: 'advance' | 'balance' }) => {
    const isAdvance = type === 'advance';
    const payment = (isAdvance ? trip.advancePayment : trip.balancePayment) || { status: isAdvance ? 'BLOQUEADO' : 'AGUARDANDO_DOCS' };
    const isPaid = payment.status === 'PAGO';
    const isLiberated = payment.status === 'LIBERAR';
    const label = isAdvance ? '70%' : '30%';
    
    // Verifica se este botão está bloqueado pela regra de dependência
    const isLockedByRule = !isAdvance && 
                           trip.advancePayment?.status !== 'LIBERAR' && 
                           trip.advancePayment?.status !== 'PAGO';

    const getStyles = () => {
      if (isPaid) return "bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/20";
      if (isLiberated) return "bg-blue-600 border-blue-700 text-white shadow-blue-600/40 ring-4 ring-blue-600/10 animate-pulse";
      if (isLockedByRule) return "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed opacity-50";
      return "bg-white border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 shadow-sm";
    };

    return (
      <div className="flex items-center gap-2 group/fin">
        <button
          type="button"
          disabled={isPaid || isProcessing !== null || isLockedByRule}
          onClick={(e) => {
            e.stopPropagation();
            togglePayment(type);
          }}
          className={`
            relative h-8 px-3 rounded-xl border-2 font-black text-[9px] tracking-tighter
            transition-all duration-300 flex items-center justify-center gap-1.5
            active:scale-90 select-none
            ${getStyles()}
          `}
        >
          {isProcessing === type ? (
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : isPaid ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
          ) : isLockedByRule ? (
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          ) : null}
          
          <span>{label}</span>

          {/* Tooltip Informativo */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[7px] font-black uppercase rounded opacity-0 group-hover/fin:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity">
            {isPaid ? 'Pagamento Confirmado' : 
             isLockedByRule ? 'Libere os 70% primeiro' :
             isLiberated ? 'Clique para Bloquear' : 'Clique para Liberar'}
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1.5 py-1">
      <FinanceButton type="advance" />
      <FinanceButton type="balance" />
    </div>
  );
};

export default FinanceAction;
