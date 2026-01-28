
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
          const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'dd/mm/yyyy hh:mm' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });
          
          if (rows.length < 2) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];
          const startIndex = rows.findIndex((row, idx) => idx > 0 && row && row[1] && String(row[1]).trim().length > 2);
          const effectiveRows = startIndex === -1 ? rows.slice(1) : rows.slice(startIndex);

          const formatDateToISO = (val: any): string => {
            if (val === undefined || val === null || String(val).trim() === '') return '';
            if (val instanceof Date) return val.toISOString();
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
              } catch (e) { return ''; }
            }
            const d = new Date(val);
            return isNaN(d.getTime()) ? '' : d.toISOString();
          };

          for (const row of effectiveRows) {
            if (!row || !row[1] || String(row[1]).trim() === '') continue;

            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            const scheduledStart = formatDateToISO(row[6]);
            const arrivalTime = formatDateToISO(row[7]);
            const departureTime = formatDateToISO(row[8]);

            // Lógica de Estadia: Inicia 8h após a Previsão (Coluna G)
            let exceededText = '---';
            if (scheduledStart && departureTime) {
               const schedule = new Date(scheduledStart).getTime();
               const departure = new Date(departureTime).getTime();
               const graceMs = 8 * 3600000; // 8 horas de carência padrão na importação
               const billableStart = schedule + graceMs;

               if (departure > billableStart) {
                 const diffMs = departure - billableStart;
                 const hours = Math.floor(diffMs / 3600000);
                 const minutes = Math.floor((diffMs % 3600000) / 60000);
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
          reject(new Error("Erro ao processar planilha."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
