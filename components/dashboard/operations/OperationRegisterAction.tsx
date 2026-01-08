
import React, { useState } from 'react';
import { User, Driver, Customer, Category, Trip } from '../../../types';
import TripModal from './TripModal';

interface OperationRegisterActionProps {
  user: User;
  drivers: Driver[];
  customers: Customer[];
  categories: Category[];
  initialCategory?: string;
  initialCustomer?: Customer;
  onSuccess: () => void;
  variant?: 'primary' | 'outline' | 'dark';
  label?: string;
}

const OperationRegisterAction: React.FC<OperationRegisterActionProps> = ({
  user,
  drivers,
  customers,
  categories,
  initialCategory,
  initialCustomer,
  onSuccess,
  variant = 'dark',
  label = 'Nova Programação'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const buttonClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    dark: "bg-slate-900 text-white hover:bg-blue-600",
    outline: "bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-600"
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center gap-3 active:scale-95 ${buttonClasses[variant]}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 4v16m8-8H4" strokeWidth="3"/>
        </svg>
        {label}
      </button>

      {isOpen && (
        <TripModal 
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSuccess={onSuccess}
          drivers={drivers}
          customers={customers}
          categories={categories}
          initialCategory={initialCategory}
          initialCustomer={initialCustomer}
          editTrip={null}
        />
      )}
    </>
  );
};

export default OperationRegisterAction;
