
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel baseado nas colunas:
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
          
          // Obtém todas as linhas
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
          
          if (rows.length < 2) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];

          // Tenta identificar onde começam os dados de fato (procurando o primeiro valor numérico ou OS na col B)
          // Ignora as primeiras linhas que podem ser títulos ou vazias
          const startIndex = rows.findIndex((row, idx) => idx > 0 && row && row[1] && String(row[1]).length > 2);
          const effectiveRows = startIndex === -1 ? rows.slice(1) : rows.slice(startIndex);

          const formatDateForce = (val: any) => {
            if (!val) return '';
            const d = new Date(val);
            if (isNaN(d.getTime())) {
              // Tenta parse manual se for string no formato brasileiro DD/MM/YYYY HH:MM
              if (typeof val === 'string' && val.includes('/')) {
                const parts = val.split(' ');
                const dateParts = parts[0].split('/');
                const timeParts = (parts[1] || '00:00').split(':');
                const parsed = new Date(
                  parseInt(dateParts[2]), 
                  parseInt(dateParts[1]) - 1, 
                  parseInt(dateParts[0]),
                  parseInt(timeParts[0]),
                  parseInt(timeParts[1])
                );
                return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
              }
              return '';
            }
            return d.toISOString();
          };

          for (const row of effectiveRows) {
            // Se a coluna B (OS) estiver vazia, ignora a linha
            if (!row || !row[1]) continue;

            const type = String(row[0] || '').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Datas (G:6, H:7, I:8)
            const scheduledStart = formatDateForce(row[6]);
            const arrivalTime = formatDateForce(row[7]);
            const departureTime = formatDateForce(row[8]);

            // Cálculo de estadia (> 8h)
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
                 exceededText = `${hours}h ${String(minutes).padStart(2, '0')}m`;
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
          reject(new Error("Erro ao ler planilha. Verifique se o arquivo está no padrão correto."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
