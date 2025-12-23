
import { CARRIERS, Carrier } from '../constants/carriers';

/**
 * Consulta o armador proprietário do equipamento com base no BIC Code (Bureau International des Containers).
 * O BIC Code consiste nos 4 primeiros caracteres do container (ex: MSCU, MAEU).
 * Referência: https://www.bic-code.org/bic-codes/
 */
export const lookupCarrierByContainer = (containerId: string): Carrier | null => {
  if (!containerId || containerId.length < 4) return null;
  
  // Extrai o prefixo (4 letras iniciais) conforme o padrão ISO 6346 (BIC Code)
  const prefix = containerId.substring(0, 4).toUpperCase();
  
  // Localiza o armador no mapeamento local de BIC Codes
  const carrier = CARRIERS.find(c => c.prefixes.includes(prefix));
  
  return carrier || null;
};

/**
 * Retorna o nome amigável do armador para preenchimento de formulários.
 */
export const getCarrierNameByContainer = (containerId: string): string => {
  const carrier = lookupCarrierByContainer(containerId);
  return carrier ? carrier.name : '';
};
