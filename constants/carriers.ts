
export interface Carrier {
  name: string;
  prefixes: string[];
  sealPattern: 'MSC' | 'MAERSK' | 'CMA' | 'HAPAG' | 'GENERIC';
}

/**
 * Mapeamento exaustivo de Armadores e seus respectivos prefixos BIC (ISO 6346).
 * Referência atualizada conforme Bureau International des Containers.
 */
export const CARRIERS: Carrier[] = [
  {
    name: 'MSC',
    prefixes: ['MEDU', 'MSCU', 'MSCU', 'TCLU', 'TTNU', 'GLDU', 'MCQU'],
    sealPattern: 'MSC'
  },
  {
    name: 'MAERSK',
    prefixes: ['MAEU', 'MSKU', 'PONU', 'MRKU', 'RKLU', 'MCPU', 'MSLU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'HAMBURG SUD',
    prefixes: ['SUDU', 'HASU', 'SUXU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'CMA CGM',
    prefixes: ['CMAU', 'APZU', 'CNXU', 'CGMU', 'TOLU', 'ANXU'],
    sealPattern: 'CMA'
  },
  {
    name: 'HAPAG-LLOYD',
    prefixes: ['HLCU', 'HAMU', 'UASC', 'CPPU', 'HLBU', 'AMFU'],
    sealPattern: 'HAPAG'
  },
  {
    name: 'ONE (OCEAN NETWORK EXPRESS)',
    prefixes: ['ONEU', 'NYKU', 'MOLU', 'KKFU', 'KLINE', 'BSLU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'EVERGREEN',
    prefixes: ['EGCU', 'EMCU', 'UGMU', 'EISU', 'GAOU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'COSCO',
    prefixes: ['COSU', 'CHLU', 'CCLU', 'FESU', 'JKLU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'ALIANÇA',
    prefixes: ['ALXU', 'ALNU', 'ALBU', 'HAMU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'MERCOSUL LINE',
    prefixes: ['MNCU', 'MSRU', 'MERU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'ZIM',
    prefixes: ['ZIMU', 'ZCSU', 'ZUXU', 'ZIAU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'HMM (HYUNDAI)',
    prefixes: ['HDMU', 'HMMU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'YANG MING',
    prefixes: ['YMLU', 'YMMU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'WAN HAI',
    prefixes: ['WHLU', 'WHSU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'LOG-IN',
    prefixes: ['LGIU', 'LOGU'],
    sealPattern: 'GENERIC'
  }
];

export const findCarrierByPrefix = (containerId: string): Carrier | null => {
  if (!containerId || containerId.length < 4) return null;
  const prefix = containerId.substring(0, 4).toUpperCase();
  return CARRIERS.find(c => c.prefixes.includes(prefix)) || null;
};
