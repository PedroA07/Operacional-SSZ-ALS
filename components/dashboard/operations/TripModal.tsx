
import React, { useState, useEffect } from 'react';
import { Trip, Driver, Customer, Category, Port, PreStacking, User } from '../../../types';
import { db } from '../../../utils/storage';
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
    if (saved) setCurrentUser(JSON.parse(saved));

    const loadPorts = async () => {
      const [p, ps] = await Promise.all([db.getPorts(), db.getPreStacking()]);
      setPorts([...p, ...ps]);
    };
    loadPorts();
  }, []);

  const handleSave = async (formData: any) => {
    if (isSaving || !currentUser) return;
    setIsSaving(true);
    try {
      const tripId = editTrip?.id || `trip-${Date.now()}`;
      
      if (formData.driver && formData.customer) {
        await osCategoryService.syncVinculos(formData.category || 'Geral', formData.driver, formData.customer);
      }

      // Prepara o payload final preservando o histórico se for edição
      const payload = {
        ...formData,
        id: tripId,
        dateTime: new Date(formData.dateTime).toISOString(),
        isLate: editTrip?.isLate || false,
        documents: editTrip?.documents || [],
        status: editTrip?.status || 'Pendente',
        statusHistory: editTrip?.statusHistory || [{ status: 'Pendente', dateTime: new Date().toISOString() }],
        advancePayment: editTrip?.advancePayment || { status: 'BLOQUEADO' },
        balancePayment: editTrip?.balancePayment || { status: 'AGUARDANDO_DOCS' },
        ocFormData: {
          ...formData,
          horarioAgendado: new Date(formData.dateTime).toISOString()
        }
      };

      await db.saveTrip(payload as any, currentUser);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Erro ao processar a programação.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 h-[92vh] flex flex-col border border-white/20">
        
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg font-black italic">ALS</div>
             <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-[0.2em]">{editTrip ? 'Edição de Viagem' : 'Nova Programação Operacional'}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Painel de Gerenciamento de Cargas</p>
             </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3"/></svg>
          </button>
        </div>
        
        <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-[#fcfdfe]">
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
  );
};

export default TripModal;
