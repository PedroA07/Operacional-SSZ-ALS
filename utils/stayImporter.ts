
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel preservando a fidelidade total dos dados.
   * Extrai todas as linhas a partir da 2 (índice 1).
   */
  processExcelForStays: async (file: File, sessionId: string): Promise<StayRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // raw: true para capturar os números seriais exatos do Excel
          const workbook = XLSX.read(data, { type: 'array', raw: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // header: 1 retorna um array de arrays (matriz)
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true });
          
          if (!rows || rows.length <= 1) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];

          /**
           * CONVERSÃO MATEMÁTICA PURA
           */
          const excelSerialToLocalString = (serial: any): string => {
            if (serial === undefined || serial === null || serial === '') return '';
            
            const pad = (n: number) => String(n).padStart(2, '0');

            if (typeof serial === 'string') {
              let str = serial.trim();
              if (str === '---' || str === '-' || str.toLowerCase() === 'n/a') return '';
              
              // Handle DD/MM/YYYY
              if (str.match(/^\d{2}\/\d{2}\/\d{4}/)) {
                const parts = str.split(/[\s/:]+/);
                if (parts.length >= 3) {
                  const [day, month, year, hh = '00', mm = '00', ss = '00'] = parts;
                  str = `${year}-${month}-${day}T${hh}:${mm}:${ss}`;
                }
              }

              const d = new Date(str);
              if (isNaN(d.getTime())) return '';
              
              const y = d.getFullYear();
              const m = pad(d.getMonth() + 1);
              const day = pad(d.getDate());
              const h = pad(d.getHours());
              const min = pad(d.getMinutes());
              const s = pad(d.getSeconds());
              return `${y}-${m}-${day}T${h}:${min}:${s}`;
            }
            
            if (typeof serial !== 'number') return '';

            const days = Math.floor(serial);
            const fraction = serial - days;

            let totalSeconds = Math.round(fraction * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            const date = new Date(1899, 11, 30);
            date.setDate(date.getDate() + days);
            
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const day = pad(date.getDate());
            const hh = pad(hours);
            const mm = pad(minutes);
            const ss = pad(seconds);

            return `${y}-${m}-${day}T${hh}:${mm}:${ss}`;
          };

          // Inicia rigorosamente no índice 1 (Linha 2 do Excel)
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            
            if (!row || row.length === 0) continue;
            if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;

            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            const scheduledStart = excelSerialToLocalString(row[6]);
            const arrivalTime = excelSerialToLocalString(row[7]);
            const departureTime = excelSerialToLocalString(row[8]);

            // Cálculo de Pontualidade e Atraso
            let arrivalStatus = '---';
            if (scheduledStart && arrivalTime) {
              const sched = new Date(scheduledStart).getTime();
              const arriv = new Date(arrivalTime).getTime();
              
              if (arriv <= sched) {
                arrivalStatus = 'NO HORÁRIO';
              } else {
                const diffMs = arriv - sched;
                const diffMin = Math.floor(diffMs / 60000);
                const h = Math.floor(diffMin / 60);
                const m = diffMin % 60;
                arrivalStatus = `ATRASADO (+${h}h ${m}m)`;
              }
            }

            records.push({
              id: `rec-${sessionId}-${os || 'SN'}-${Date.now()}-${i}`,
              sessionId,
              type,
              os: os || `LINHA-${i + 1}`,
              location,
              driverName,
              ship,
              container,
              scheduledStart,
              arrivalTime,
              departureTime,
              exceededHours: '---',
              arrivalStatus
            });
          }

          const sortedRecords = records.sort((a, b) => {
            if (!a.scheduledStart) return 1;
            if (!b.scheduledStart) return -1;
            return a.scheduledStart.localeCompare(b.scheduledStart);
          });

          resolve(sortedRecords);
        } catch (err) {
          console.error("Erro importação:", err);
          reject(new Error("Falha ao processar o arquivo."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
