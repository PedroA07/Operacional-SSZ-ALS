
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
          // cellDates: true converte números do Excel em objetos Date JS
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy hh:mm' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Obtém todas as linhas como matriz de arrays
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
          
          if (rows.length < 2) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];

          // Identifica o início dos dados ignorando cabeçalhos vazios ou informativos
          const startIndex = rows.findIndex((row, idx) => idx > 0 && row && row[1] && String(row[1]).trim().length > 2);
          const effectiveRows = startIndex === -1 ? rows.slice(1) : rows.slice(startIndex);

          const formatDateToISO = (val: any): string => {
            if (val === undefined || val === null || String(val).trim() === '') return '';
            
            // Se já for um Date do JS (via cellDates do XLSX)
            if (val instanceof Date) {
              return val.toISOString();
            }

            // Se for string no formato brasileiro DD/MM/YYYY HH:MM ou similar
            if (typeof val === 'string' && val.includes('/')) {
              try {
                const parts = val.trim().split(/\s+/);
                const dateParts = parts[0].split('/');
                const timeParts = (parts[1] || '00:00').split(':');
                
                const day = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10) - 1;
                let year = parseInt(dateParts[2], 10);
                if (dateParts[2].length === 2) year += 2000;
                
                const hours = parseInt(timeParts[0], 10) || 0;
                const minutes = parseInt(timeParts[1], 10) || 0;

                const parsed = new Date(year, month, day, hours, minutes);
                return isNaN(parsed.getTime()) ? '' : parsed.toISOString();
              } catch (e) {
                return '';
              }
            }

            // Fallback para conversão padrão
            const d = new Date(val);
            return isNaN(d.getTime()) ? '' : d.toISOString();
          };

          for (const row of effectiveRows) {
            // OS é obrigatória (coluna B)
            if (!row || !row[1] || String(row[1]).trim() === '') continue;

            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Datas (G:6, H:7, I:8)
            const scheduledStart = formatDateToISO(row[6]);
            const arrivalTime = formatDateToISO(row[7]);
            const departureTime = formatDateToISO(row[8]);

            // Cálculo de estadia (> 8h) com base em milissegundos absolutos
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
          console.error("Excel processing error:", err);
          reject(new Error("Erro ao processar planilha. Verifique os formatos de data."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
