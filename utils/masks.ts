
export const maskCPF = (value?: string | null) => {
  return (value || '')
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskCNPJ = (value?: string | null) => {
  return (value || '')
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

export const maskRG = (value?: string | null) => {
  return (value || '')
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{1})\d+?$/, '$1');
};

export const maskPhone = (value?: string | null) => {
  return (value || '')
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const maskPlate = (value?: string | null) => {
  return (value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^([A-Z]{3})([0-9A-Z]{1,4})$/, '$1-$2')
    .substring(0, 8);
};

export const maskCEP = (value?: string | null) => {
  return (value || '')
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const maskSeal = (value?: string | null) => {
  if (!value) return '';
  // Regra solicitada: Remover qualquer caractere especial, deixar apenas letras e números
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
};

// Remove acentos e caracteres especiais, mantendo apenas letras/números/espaço (para copiar limpo)
export const stripSpecials = (value?: string | null) => {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')       // remove acentos
    .replace(/[^A-Za-z0-9\s]/g, ' ')        // troca especiais por espaço
    .replace(/\s+/g, ' ')                    // colapsa espaços
    .trim()
    .toUpperCase();
};

// Normaliza texto para busca: minúsculo, sem acentos e sem caracteres especiais
export const normalizeSearch = (value?: string | null) => {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')            // remove tudo que não é letra/número
    .toLowerCase();
};

export const formatToBRDate = (date: string | Date) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};
