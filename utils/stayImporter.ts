
import * as XLSX from 'xlsx';
import { Trip, TripStatus, StatusHistoryEntry, User } from '../types';
import { db } from './storage';

export const stayImporter = {
  /**
   * Processa o Excel mantendo a lógica original de mapeamento de colunas
   */
  processExcelAndReturn: async (file: File, user: User, sessionId: string): Promise<{ data: Trip[]; added: number; skipped: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Converte para JSON bruto (array de arrays)
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          // Pula o cabeçalho (linha 1) e filtra linhas vazias na coluna da OS
          const dataRows = rows.slice(1).filter(row => row && row[1]); 
          
          const finalTrips: Trip[] = [];
          let added = 0;

          // Busca a sessão para herdar a categoria correta
          const sessions = await db.getStaySessions();
          const session = sessions.find(s => s.id === sessionId);
          const category = session?.category || 'GERAL';

          for (const row of dataRows) {
            // LÓGICA ORIGINAL DE MAPEAMENTO
            const type = String(row[0] || 'COLETA').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Tratamento de datas original
            const scheduledStart = row[6];
            const arrivalTime = row[7];
            const departureTime = row[8];

            const statusHistory: StatusHistoryEntry[] = [];
            const now = new Date().toISOString();
            
            // Adiciona histórico se as datas existirem (Lógica original)
            if (departureTime) {
              statusHistory.push({ 
                status: 'Saiu do cliente', 
                dateTime: new Date(departureTime).toISOString(), 
                createdAt: now 
              });
            }
            if (arrivalTime) {
              statusHistory.push({ 
                status: 'Chegou no cliente', 
                dateTime: new Date(arrivalTime).toISOString(), 
                createdAt: now 
              });
            }
            
            // Define status atual baseado na última etapa
            let currentStatus: TripStatus = 'Pendente';
            if (departureTime) currentStatus = 'Saiu do cliente';
            else if (arrivalTime) currentStatus = 'Chegou no cliente';

            const tripObj: Trip = {
              id: `stay-${sessionId}-${os}-${Date.now()}-${added}`,
              os,
              booking: '',
              ship,
              dateTime: scheduledStart ? new Date(scheduledStart).toISOString() : new Date().toISOString(),
              isLate: false,
              type: (type as any),
              category,
              container,
              customer: { id: 'import', name: location, city: 'IMPORT', state: 'SP' },
              driver: { id: 'import', name: driverName, plateHorse: '---', plateTrailer: '---', status: 'Ativo' },
              status: currentStatus,
              statusHistory,
              advancePayment: { status: 'BLOQUEADO' },
              balancePayment: { status: 'AGUARDANDO_DOCS' },
              stay_session_id: sessionId, // Vínculo com a pasta
              scheduling: {
                dateTime: scheduledStart ? new Date(scheduledStart).toISOString() : new Date().toISOString(),
                location: location
              }
            };

            await db.saveTrip(tripObj, user);
            finalTrips.push(tripObj);
            added++;
          }

          resolve({ data: finalTrips, added, skipped: 0 });
        } catch (err) {
          console.error("Erro no processamento XLSX:", err);
          reject(new Error("Formato de planilha inválido ou erro de leitura."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
