
import * as XLSX from 'xlsx';
import { Trip, TripStatus, StatusHistoryEntry, User } from '../types';
import { db } from './storage';

export const stayImporter = {
  /**
   * Processa o Excel e retorna a lista estruturada de objetos Trip para visualização imediata
   */
  processExcelAndReturn: async (file: File, user: User): Promise<{ data: Trip[]; added: number; skipped: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Header 1 pula a linha 1 do Excel
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          const dataRows = rows.slice(1).filter(row => row && row[1]); // Filtra se tiver OS na col 2
          
          const existingTrips = await db.getTrips();
          const existingOSs = new Set(existingTrips.map(t => t.os.toUpperCase().trim()));
          
          const finalTrips: Trip[] = [];
          let added = 0;
          let skipped = 0;

          for (const row of dataRows) {
            const type = String(row[0] || '').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            const scheduledStart = row[6];
            const arrivalTime = row[7];
            const departureTime = row[8];

            // Detecção Automática de Categoria baseada no padrão da OS (Aliança, Mercosul)
            let category = 'INDÚSTRIA';
            if (os.includes('ALC')) category = 'ALIANÇA';
            else if (os.includes('SP')) category = 'MERCOSUL';

            const statusHistory: StatusHistoryEntry[] = [];
            const now = new Date().toISOString();
            
            if (departureTime) statusHistory.push({ status: 'Saiu do cliente', dateTime: new Date(departureTime).toISOString(), createdAt: now });
            if (arrivalTime) statusHistory.push({ status: 'Chegou no cliente', dateTime: new Date(arrivalTime).toISOString(), createdAt: now });
            
            let currentStatus: TripStatus = 'Pendente';
            if (departureTime) currentStatus = 'Saiu do cliente';
            else if (arrivalTime) currentStatus = 'Chegou no cliente';

            const tripObj: Trip = {
              id: `stay-${Date.now()}-${added}`,
              os,
              booking: '',
              ship,
              dateTime: scheduledStart ? new Date(scheduledStart).toISOString() : new Date().toISOString(),
              isLate: false,
              type: type as any,
              category,
              container,
              customer: { id: 'import', name: location, city: 'IMPORT', state: 'SP' },
              driver: { id: 'import', name: driverName, plateHorse: '---', plateTrailer: '---', status: 'Ativo' },
              status: currentStatus,
              statusHistory,
              advancePayment: { status: 'BLOQUEADO' },
              balancePayment: { status: 'AGUARDANDO_DOCS' },
              scheduling: {
                dateTime: scheduledStart ? new Date(scheduledStart).toISOString() : new Date().toISOString(),
                location: location
              }
            };

            finalTrips.push(tripObj);

            // Tenta salvar no banco de dados se não existir, para persistência de longo prazo
            if (!existingOSs.has(os)) {
              await db.saveTrip(tripObj, user);
              added++;
            } else {
              skipped++;
            }
          }

          resolve({ data: finalTrips, added, skipped });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
