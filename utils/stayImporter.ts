
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel preservando a hora exata sem deslocamento de fuso horário.
   */
  processExcelForStays: async (file: File, sessionId: string): Promise<StayRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // cellDates: true converte números do Excel em objetos Date JS
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
          if (rows.length < 2) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];
          const startIndex = rows.findIndex((row, idx) => idx > 0 && row && row[1] && String(row[1]).trim().length > 2);
          const effectiveRows = startIndex === -1 ? rows.slice(1) : rows.slice(startIndex);

          /**
           * Converte a data do Excel para uma string ISO Local (YYYY-MM-DDTHH:mm:ss)
           * Ignora o deslocamento UTC para manter "exatamente como veio no doc"
           */
          const toLocalISO = (val: any): string => {
            if (val === undefined || val === null || String(val).trim() === '') return '';
            
            let date: Date;

            if (val instanceof Date) {
              date = val;
            } else if (typeof val === 'number') {
              // Converte número serial do Excel manualmente se necessário
              date = new Date((val - 25569) * 86400 * 1000);
            } else {
              date = new Date(val);
            }

            if (isNaN(date.getTime())) return '';

            // Extrai componentes locais para evitar o shift do toISOString()
            const pad = (n: number) => String(n).padStart(2, '0');
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const d = pad(date.getDate());
            const hh = pad(date.getHours());
            const mm = pad(date.getMinutes());
            const ss = pad(date.getSeconds());

            return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
          };

          for (const row of effectiveRows) {
            if (!row || !row[1] || String(row[1]).trim() === '') continue;

            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Colunas G:6 (Previsão), H:7 (Entrada), I:8 (Saída)
            const scheduledStart = toLocalISO(row[6]);
            const arrivalTime = toLocalISO(row[7]);
            const departureTime = toLocalISO(row[8]);

            // Cálculo inicial de carência para exibição
            let exceededText = '---';
            if (scheduledStart && departureTime) {
               const schedule = new Date(scheduledStart).getTime();
               const departure = new Date(departureTime).getTime();
               const graceMs = 8 * 3600000; 
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
          console.error("Erro importação:", err);
          reject(new Error("Erro ao processar planilha."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
