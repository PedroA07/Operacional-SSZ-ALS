
export interface Carrier {
  name: string;
  prefixes: string[];
  sealPattern: 'MSC' | 'MAERSK' | 'CMA' | 'HAPAG' | 'GENERIC';
}

/**
 * Mapeamento de Armadores e seus respectivos prefixos registrados no BIC (bic-code.org)
 */
export const CARRIERS: Carrier[] = [
  {
    name: 'MSC',
    prefixes: ['MEDU', 'MSCU', 'MSCU', 'TCLU', 'TTNU', 'GLDU'],
    sealPattern: 'MSC'
  },
  {
    name: 'MAERSK',
    prefixes: ['MAEU', 'MSKU', 'PONU', 'MRKU', 'RKLU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'HAMBURG SUD',
    prefixes: ['SUDU', 'HASU', 'SUDU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'CMA CGM',
    prefixes: ['CMAU', 'APZU', 'CNXU', 'CGMU', 'TOLU'],
    sealPattern: 'CMA'
  },
  {
    name: 'HAPAG-LLOYD',
    prefixes: ['HLCU', 'HAMU', 'UASC', 'CPPU', 'HLBU'],
    sealPattern: 'HAPAG'
  },
  {
    name: 'ONE',
    prefixes: ['ONEU', 'NYKU', 'MOLU', 'KKFU', 'KLINE'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'EVERGREEN',
    prefixes: ['EGCU', 'EMCU', 'UGMU', 'EISU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'ZIM',
    prefixes: ['ZIMU', 'ZCSU', 'ZUXU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'COSCO',
    prefixes: ['COSU', 'CHLU', 'CCLU', 'FESU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'ALIANÇA',
    prefixes: ['ALXU', 'ALNU', 'ALBU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'MERCOSUL',
    prefixes: ['MNCU', 'MSRU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'WAN HAI',
    prefixes: ['WHLU', 'WHSU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'YANG MING',
    prefixes: ['YMLU', 'YMMU'],
    sealPattern: 'GENERIC'
  }
];

export const findCarrierByPrefix = (containerId: string): Carrier | null => {
  if (!containerId || containerId.length < 4) return null;
  const prefix = containerId.substring(0, 4).toUpperCase();
  return CARRIERS.find(c => c.prefixes.includes(prefix)) || null;
};
