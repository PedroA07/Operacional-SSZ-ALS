import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Driver, Customer, Category, Port, PreStacking, User, TripStatus } from '../../../types';
import { db } from '../../../utils/storage';
import { showToast } from '../../shared/SimpleToast';
import { osCategoryService } from '../../../utils/osCategoryService';
import TripForm from './TripForm';

interface TripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
  editTrip?: Trip | null;
  initialCategory?: string;
  initialCustomer?: Customer;
}

const TripModal: React.FC<TripModalProps> = ({
  isOpen, onClose, onSuccess, drivers, customers, categories, editTrip, initialCategory, initialCustomer
}) => {
  const [ports, setPorts] = useState<(Port | PreStacking)[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('als_is_editing', { detail: true }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('als_is_editing', { detail: false }));
    };
  }, [isOpen]);

  useEffect(() => {
    const saved = sessionStorage.getItem('als_active_session');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao ler sessão no modal", e);
      }
    }

    const loadPorts = async () => {
      const [p, ps] = await Promise.all([db.getPorts(), db.getPreStacking()]);
      setPorts([...p, ...ps]);
    };
    loadPorts();
  }, [isOpen]);

  const handleSave = async (formData: any) => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const tripId = editTrip?.id || `trip-${Date.now()}`;
      const now = new Date().toISOString();

      if (formData.driver && formData.customer) {
        await osCategoryService.syncVinculos(formData.category || 'Geral', formData.driver, formData.customer);
      }

      const tripStartTime = new Date(formData.dateTime).toISOString();
      const scheduling = editTrip ? editTrip.scheduling : null;

      const payload: Trip = {
        ...formData,
        id: tripId,
        dateTime: tripStartTime,
        isLate: editTrip?.isLate || false,
        documents: editTrip?.documents || [],
        status: editTrip?.status || 'Pendente',
        statusHistory: editTrip?.statusHistory || [{
          status: 'Pendente' as TripStatus,
          dateTime: now,
          createdAt: now
        }],
        advancePayment: editTrip?.advancePayment || { status: 'BLOQUEADO' },
        balancePayment: editTrip?.balancePayment || { status: 'AGUARDANDO_DOCS' },
        scheduling: scheduling,
        ocFormData: {
          ...formData,
          dateTime: tripStartTime,
          scheduling: scheduling
        }
      };

      const success = await db.saveTrip(payload, currentUser || undefined);

      if (success) {
        setTimeout(() => {
          onSuccess();
          window.dispatchEvent(new CustomEvent('als_force_global_refresh'));
        }, 300);
        showToast('Viagem salva com sucesso!', 'success');
        onClose();
      } else {
        showToast('Falha ao salvar no servidor.', 'error');
      }
    } catch (err) {
      console.error("Erro crítico no cadastro:", err);
      showToast('Erro ao processar dados.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9000] animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-white flex flex-col animate-in slide-in-from-bottom duration-400">

        {/* Header com identidade azul — Operações */}
        <div className="px-8 py-5 bg-blue-600 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center overflow-hidden shrink-0">
              <img src="/logo.jpg" alt="ALS" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <p className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Operações</p>
              <h2 className="font-black text-white text-sm uppercase tracking-widest">
                {editTrip ? 'Editar Programação Operacional' : 'Nova Programação Operacional'}
              </h2>
              <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest mt-0.5">Painel de Gerenciamento de Cargas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-white/15 border border-white/20 text-white/80 hover:text-white hover:bg-white/30 rounded-full transition-all active:scale-90"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-slate-50">
          <div className="max-w-5xl mx-auto p-10">
            <TripForm
              editTrip={editTrip}
              initialCategory={initialCategory}
              initialCustomer={initialCustomer}
              drivers={drivers}
              customers={customers}
              categories={categories}
              ports={ports}
              onCancel={onClose}
              onSave={handleSave}
              isSaving={isSaving}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TripModal;
