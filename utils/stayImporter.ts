
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel baseado nas colunas da imagem:
   * A: Tipo, B: OS, C: Local, D: Motorista, E: Navio, F: Container, G: Previsão, H: Entrada, I: Saída
   */
  processExcelForStays: async (file: File, sessionId: string): Promise<StayRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          // Filtra linhas que possuem OS na coluna B
          const dataRows = rows.slice(1).filter(row => row && row[1]); 
          
          const records: StayRecord[] = [];

          for (const row of dataRows) {
            const type = String(row[0] || '').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Função interna para tratar data do Excel sem perder o dia pelo fuso horário
            const formatDateForce = (val: any) => {
               if (!val) return '';
               const d = new Date(val);
               if (isNaN(d.getTime())) return '';
               // Adicionamos o offset para garantir que a data lida seja a data visual do Excel
               const userTimezoneOffset = d.getTimezoneOffset() * 60000;
               return new Date(d.getTime() + userTimezoneOffset).toISOString();
            };

            const scheduledStart = formatDateForce(row[6]);
            const arrivalTime = formatDateForce(row[7]);
            const departureTime = formatDateForce(row[8]);

            // Cálculo de estadias (> 8h)
            let exceededText = '---';
            if (arrivalTime && departureTime) {
               const start = new Date(arrivalTime).getTime();
               const end = new Date(departureTime).getTime();
               const totalStayMs = end - start;
               const limit8hMs = 8 * 3600000;
               
               if (totalStayMs > limit8hMs) {
                 const exceededMs = totalStayMs - limit8hMs;
                 const hours = Math.floor(exceededMs / 3600000);
                 const minutes = Math.floor((exceededMs % 3600000) / 60000);
                 exceededText = `${hours}h ${minutes}m`;
               }
            }

            records.push({
              id: `rec-${sessionId}-${os}-${Date.now()}-${records.length}`,
              sessionId,
              type,
              os,
              location,
              driverName,
              ship,
              container,
              scheduledStart,
              arrivalTime,
              departureTime,
              exceededHours: exceededText
            });
          }

          resolve(records);
        } catch (err) {
          reject(new Error("Formato de planilha inválido ou erro na leitura."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
