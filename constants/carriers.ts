
export interface Carrier {
  name: string;
  prefixes: string[];
  sealPattern: 'MSC' | 'MAERSK' | 'CMA' | 'HAPAG' | 'GENERIC';
}

export const CARRIERS: Carrier[] = [
  {
    name: 'MSC',
    prefixes: ['MEDU', 'MSCU', 'MSCU', 'TCLU', 'TTNU'],
    sealPattern: 'MSC'
  },
  {
    name: 'MAERSK',
    prefixes: ['MAEU', 'MSKU', 'PONU', 'MRKU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'HAMBURG SUD',
    prefixes: ['SUDU', 'HASU'],
    sealPattern: 'MAERSK' // Segue o mesmo padrão de lacre do grupo Maersk
  },
  {
    name: 'CMA CGM',
    prefixes: ['CMAU', 'APZU', 'CNXU', 'CGMU'],
    sealPattern: 'CMA'
  },
  {
    name: 'HAPAG-LLOYD',
    prefixes: ['HLCU', 'HAMU', 'UASC', 'CPPU'],
    sealPattern: 'HAPAG'
  },
  {
    name: 'ONE',
    prefixes: ['ONEU', 'NYKU', 'MOLU', 'KLINE'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'EVERGREEN',
    prefixes: ['EGCU', 'EMCU', 'UGMU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'ZIM',
    prefixes: ['ZIMU', 'ZCSU'],
    sealPattern: 'GENERIC'
  },
  {
    name: 'ALIANÇA',
    prefixes: ['ALXU', 'ALNU'],
    sealPattern: 'MAERSK'
  },
  {
    name: 'MERCOSUL',
    prefixes: ['MNCU'],
    sealPattern: 'MAERSK'
  }
];

export const findCarrierByPrefix = (containerId: string): Carrier | null => {
  if (!containerId || containerId.length < 4) return null;
  const prefix = containerId.substring(0, 4).toUpperCase();
  return CARRIERS.find(c => c.prefixes.includes(prefix)) || null;
};
