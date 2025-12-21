
export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

export const maskRG = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{1})\d+?$/, '$1');
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const maskPlate = (value: string) => {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^([A-Z]{3})([0-9A-Z]{1,4})$/, '$1-$2')
    .substring(0, 8);
};

export const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const maskSeal = (value: string, armador: string) => {
  if (!value) return '';
  const armadorUpper = armador.toUpperCase();
  let clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (armadorUpper.includes('MSC')) {
    return clean.replace(/\D/g, '').substring(0, 10);
  }

  if (armadorUpper.includes('MAERSK') || armadorUpper.includes('HAMBURG') || armadorUpper.includes('ALIANÇA') || armadorUpper.includes('MERCOSUL')) {
    if (clean.startsWith('MLBR')) {
      return 'ML-BR' + clean.substring(4, 12);
    }
    if (clean.length > 0 && !clean.startsWith('ML')) {
      return 'ML-BR' + clean.substring(0, 8);
    }
    return clean.substring(0, 15);
  }

  if (armadorUpper.includes('CMA') || armadorUpper.includes('CGM')) {
    if (clean.startsWith('CMA')) {
      return 'CMA-' + clean.substring(3, 11);
    }
    return 'CMA-' + clean.substring(0, 8);
  }

  if (armadorUpper.includes('HAPAG')) {
    return clean.substring(0, 12);
  }

  return clean.substring(0, 15);
};

export const formatToBRDate = (date: string | Date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};
