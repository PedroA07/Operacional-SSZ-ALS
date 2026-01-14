
import { StayRecord } from '../types';

export const stayValidator = {
  /**
   * Filtra registros novos, ignorando OS que já existem na base atual daquela pasta.
   */
  filterDuplicates: (newRecords: StayRecord[], existingRecords: StayRecord[]) => {
    const existingOSSet = new Set(existingRecords.map(r => r.os.toUpperCase().trim()));
    
    const unique = newRecords.filter(record => {
      const osClean = record.os.toUpperCase().trim();
      return !existingOSSet.has(osClean);
    });

    const duplicates = newRecords.length - unique.length;
    const duplicateList = newRecords
      .filter(record => existingOSSet.has(record.os.toUpperCase().trim()))
      .map(r => r.os);

    return {
      unique,
      duplicateCount: duplicates,
      duplicateList
    };
  }
};
