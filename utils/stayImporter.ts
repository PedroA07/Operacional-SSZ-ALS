
import * as XLSX from 'xlsx';
import { Trip, TripStatus, StatusHistoryEntry, Driver, Customer, User } from '../types';
import { db } from './storage';

export const stayImporter = {
  /**
   * Processa o arquivo Excel e retorna um resumo da operação
   */
  processExcel: async (file: File, activeCategory: string, user: User): Promise<{ added: number; skipped: number; total: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Converte para JSON ignorando o cabeçalho (pula a primeira linha)
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          // Pula o cabeçalho e filtra linhas vazias
          const dataRows = rows.slice(1).filter(row => row && row[1]); // row[1] é a OS
          
          const existingTrips = await db.getTrips();
          const existingOSs = new Set(existingTrips.map(t => t.os.toUpperCase().trim()));
          
          let added = 0;
          let skipped = 0;

          for (const row of dataRows) {
            const os = String(row[1] || '').toUpperCase().trim();
            
            // Regra: Se a OS já existe, ignora
            if (existingOSs.has(os)) {
              skipped++;
              continue;
            }

            // Mapeamento baseado na imagem enviada
            const type = String(row[0] || 'EXPORTAÇÃO').toUpperCase();
            const location = String(row[2] || 'A DEFINIR').toUpperCase();
            const driverName = String(row[3] || 'MOTORISTA NÃO INFORMADO').toUpperCase();
            const ship = String(row[4] || '').toUpperCase();
            const container = String(row[5] || '').toUpperCase();
            const scheduledStart = row[6]; // DateTime
            const arrivalTime = row[7];   // DateTime
            const departureTime = row[8]; // DateTime

            // Criar histórico de status inicial
            const statusHistory: StatusHistoryEntry[] = [];
            const now = new Date().toISOString();
            
            // Adiciona marcos de tempo se existirem na planilha
            if (departureTime) {
              statusHistory.push({ status: 'Saiu do cliente', dateTime: new Date(departureTime).toISOString(), createdAt: now });
            }
            if (arrivalTime) {
              statusHistory.push({ status: 'Chegou no cliente', dateTime: new Date(arrivalTime).toISOString(), createdAt: now });
            }
            
            // Status principal da viagem baseada no Excel
            let currentStatus: TripStatus = 'Pendente';
            if (departureTime) currentStatus = 'Saiu do cliente';
            else if (arrivalTime) currentStatus = 'Chegou no cliente';

            // Monta objeto de viagem (Trip)
            const newTrip: Partial<Trip> = {
              id: `imp-${Date.now()}-${added}`,
              os: os,
              type: (type.includes('ENTREGA') ? 'ENTREGA' : type.includes('COLETA') ? 'COLETA' : 'EXPORTAÇÃO') as any,
              category: activeCategory,
              container: container,
              ship: ship,
              dateTime: scheduledStart ? new Date(scheduledStart).toISOString() : new Date().toISOString(),
              status: currentStatus,
              statusHistory: statusHistory.length > 0 ? statusHistory : [{ status: 'Pendente', dateTime: new Date().toISOString(), createdAt: now }],
              customer: { id: 'import', name: location, city: 'IMPORTADO', state: 'SP' },
              driver: { id: 'import', name: driverName, plateHorse: '---', plateTrailer: '---', status: 'Ativo' },
              advancePayment: { status: 'BLOQUEADO' },
              balancePayment: { status: 'AGUARDANDO_DOCS' },
              scheduling: {
                dateTime: scheduledStart ? new Date(scheduledStart).toISOString() : new Date().toISOString(),
                location: location
              }
            };

            await db.saveTrip(newTrip as Trip, user);
            existingOSs.add(os);
            added++;
          }

          resolve({ added, skipped, total: dataRows.length });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
