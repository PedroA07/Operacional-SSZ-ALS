import React, { useMemo } from 'react';
import { validateISO6346, formatContainerInput } from '../../utils/containerValidation';
import { lookupCarrierByContainer } from '../../utils/carrierService';

interface ContainerInputProps {
  value: string;
  onChange: (containerValue: string, carrierName: string) => void;
  className?: string;
  placeholder?: string;
}

const ContainerInput: React.FC<ContainerInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'ABCD1234567',
}) => {
  const validation = useMemo(() => validateISO6346(value), [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatContainerInput(e.target.value);
    const carrier = lookupCarrierByContainer(formatted);
    onChange(formatted, carrier ? carrier.name : '');
  };

  const ringClass =
    value.length === 0
      ? ''
      : validation.isValid
      ? 'ring-2 ring-green-400 border-green-300'
      : validation.isComplete
      ? 'ring-2 ring-red-400 border-red-300'
      : '';

  const errorMessage =
    validation.isComplete && !validation.isValid
      ? validation.errorCode === 'checkDigit'
        ? `Dígito verificador inválido (esperado: ${validation.expectedCheckDigit})`
        : validation.errorCode === 'format'
        ? 'Formato inválido — padrão ISO 6346: OOOODDDDDDDC'
        : 'Container deve ter exatamente 11 caracteres'
      : null;

  return (
    <div className="relative">
      <input
        className={`${className} ${ringClass} pr-9`}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={11}
      />

      {value.length > 0 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {validation.isValid ? (
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : validation.isComplete ? (
            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : null}
        </span>
      )}

      {errorMessage && (
        <p className="text-[9px] font-black text-red-400 uppercase tracking-wide mt-1 ml-1">
          {errorMessage}
        </p>
      )}

      {validation.isValid && (
        <p className="text-[9px] font-black text-green-500 uppercase tracking-wide mt-1 ml-1">
          ✓ ISO 6346 válido
        </p>
      )}
    </div>
  );
};

export default ContainerInput;
