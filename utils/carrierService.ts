
import { CARRIERS, Carrier } from '../constants/carriers';

/**
 * Identifica o armador com base nos 4 primeiros caracteres do container (BIC Code).
 * Referência de dados compatível com track-trace.com e BIC (Bureau International des Containers).
 */
export const lookupCarrierByContainer = (containerId: string): Carrier | null => {
  if (!containerId || containerId.length < 4) return null;
  
  const prefix = containerId.substring(0, 4).toUpperCase();
  
  // Busca no mapeamento de constantes
  const carrier = CARRIERS.find(c => c.prefixes.includes(prefix));
  
  return carrier || null;
};

export const getCarrierNameByContainer = (containerId: string): string => {
  const carrier = lookupCarrierByContainer(containerId);
  return carrier ? carrier.name : 'NÃO IDENTIFICADO';
};
