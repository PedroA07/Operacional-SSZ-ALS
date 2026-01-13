
import React, { useState } from 'react';
import { Trip, User, PaymentStatus, TripStatus } from '../../../types';
import { db } from '../../../utils/storage';

interface FinanceActionProps {
  trip: Trip;
  user: User;
  onRefresh: () => void;
}

const FinanceAction: React.FC<FinanceActionProps> = ({ trip, user, onRefresh }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const togglePayment = async (type: 'advance' | 'balance') => {
    if (isProcessing) return;

    const currentPayment = type === 'advance' ? trip.advancePayment : trip.balancePayment;
    
    // Se já estiver pago, não permite alterar via painel operacional
    if (currentPayment.status === 'PAGO') return;

    const isLiberated = currentPayment.status === 'LIBERAR';
    
    if (isLiberated && !confirm(`Deseja BLOQUEAR novamente o ${type === 'advance' ? 'adiantamento' : 'saldo'} desta OS?`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const nextStatus: PaymentStatus['status'] = isLiberated 
        ? (type === 'advance' ? 'BLOQUEADO' : 'AGUARDANDO_DOCS') 
        : 'LIBERAR';

      const updatedTrip = {
        ...trip,
        [type === 'advance' ? 'advancePayment' : 'balancePayment']: {
          status: nextStatus,
          liberatedAt: nextStatus === 'LIBERAR' ? new Date().toISOString() : undefined
        }
      };

      const success = await db.saveTrip(updatedTrip, user);
      
      if (success) {
        // Notifica o sistema sobre a liberação
        if (nextStatus === 'LIBERAR') {
          await db.addNotification(
            user, 
            'PAYMENT_LIBERATED', 
            `${type === 'advance' ? '70%' : '30%'} LIBERADO`, 
            `Pagamento da OS ${trip.os} autorizado por ${user.displayName}.`,
            { os: trip.os, motorista: trip.driver.name }
          );
        }
        onRefresh();
      }
    } catch (e) {
      alert("Erro ao atualizar financeiro.");
    } finally {
      setIsProcessing(false);
    }
  };

  const StatusDot = ({ type, payment }: { type: 'advance' | 'balance', payment: PaymentStatus }) => {
    const isPaid = payment.status === 'PAGO';
    const isLiberated = payment.status === 'LIBERAR';
    const label = type === 'advance' ? '70%' : '30%';

    let dotClass = "bg-slate-200";
    let shadowClass = "";
    
    if (isPaid) {
      dotClass = "bg-emerald-500";
      shadowClass = "shadow-[0_0_10px_rgba(16,185,129,0.5)]";
    } else if (isLiberated) {
      dotClass = "bg-blue-500 animate-pulse";
      shadowClass = "shadow-[0_0_10px_rgba(59,130,246,0.5)]";
    }

    return (
      <div className="flex items-center gap-3 group/item">
        <span className="text-[8px] font-black text-slate-400 uppercase w-6 leading-none">{label}</span>
        <button
          type="button"
          disabled={isPaid || isProcessing}
          onClick={(e) => {
            e.stopPropagation();
            togglePayment(type);
          }}
          className={`relative w-6 h-6 flex items-center justify-center rounded-lg border-2 transition-all ${
            isPaid 
              ? 'border-emerald-100 bg-emerald-50 cursor-default' 
              : isLiberated 
                ? 'border-blue-200 bg-blue-50 hover:bg-white' 
                : 'border-slate-100 bg-slate-50 hover:border-blue-300'
          }`}
          title={isPaid ? "Pagamento Confirmado" : isLiberated ? "Clique para Bloquear" : "Clique para Liberar"}
        >
          <div className={`w-2 h-2 rounded-full transition-all ${dotClass} ${shadowClass}`}></div>
          
          {/* Tooltip dinâmico */}
          {!isPaid && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[7px] font-black uppercase rounded opacity-0 group-hover/item:opacity-100 pointer-events-none whitespace-nowrap z-50">
              {isLiberated ? 'Revogar Liberação' : 'Liberar Agora'}
            </div>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 min-w-[85px] p-1">
      <StatusDot type="advance" payment={trip.advancePayment} />
      <StatusDot type="balance" payment={trip.balancePayment} />
    </div>
  );
};

export default FinanceAction;
