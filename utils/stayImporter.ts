
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel preservando a hora exata sem deslocamento de fuso horário.
   * Pula apenas a primeira linha (A1).
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
          
          if (rows.length < 1) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];
          // Ignora apenas a primeira linha (cabeçalho)
          const effectiveRows = rows.slice(1);

          /**
           * Converte a data do Excel para uma string ISO Local (YYYY-MM-DDTHH:mm:ss)
           * Mantém exatamente o que está escrito na célula, sem converter para UTC.
           */
          const toLocalISO = (val: any): string => {
            if (val === undefined || val === null || String(val).trim() === '') return '';
            
            let date: Date;

            if (val instanceof Date) {
              date = val;
            } else if (typeof val === 'number') {
              date = new Date((val - 25569) * 86400 * 1000);
            } else {
              date = new Date(val);
            }

            if (isNaN(date.getTime())) return '';

            const pad = (n: number) => String(n).padStart(2, '0');
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const d = pad(date.getDate());
            const hh = pad(date.getHours());
            const mm = pad(date.getMinutes());
            const ss = pad(date.getSeconds());

            // String sem "Z" no final é tratada como local pelo navegador
            return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
          };

          for (const row of effectiveRows) {
            // Se a linha for vazia ou não tiver OS, pula
            if (!row || (!row[1] && !row[0])) continue;

            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Colunas: G(6): Previsão, H(7): Entrada, I(8): Saída
            const scheduledStart = toLocalISO(row[6]);
            const arrivalTime = toLocalISO(row[7]);
            const departureTime = toLocalISO(row[8]);

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
              exceededHours: '---' // Será calculado no componente com base na carência da pasta
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
