
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel preservando a hora exata.
   * Pula apenas a primeira linha (cabeçalho).
   */
  processExcelForStays: async (file: File, sessionId: string): Promise<StayRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // cellDates: false para pegar os números seriais brutos do Excel e evitar conversão automática do fuso
          const workbook = XLSX.read(data, { type: 'array', cellDates: false });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Obtém as linhas como arrays de valores
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true });
          
          if (rows.length < 1) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];
          // Pula apenas a primeira linha (índice 0)
          const effectiveRows = rows.slice(1);

          /**
           * Converte o número serial de data do Excel ou String para ISO Local
           * Sem aplicar deslocamento de Timezone.
           */
          const parseExcelDate = (val: any): string => {
            if (val === undefined || val === null || String(val).trim() === '') return '';
            
            let date: Date;

            if (typeof val === 'number') {
              // Lógica de conversão de data serial do Excel (dias desde 1900)
              // O valor decimal representa a fração do dia (horas/minutos)
              const secondsInDay = 24 * 60 * 60;
              const excelEpoch = new Date(1899, 11, 30); // 30/12/1899 é o ponto zero do Excel
              const totalSeconds = val * secondsInDay;
              date = new Date(excelEpoch.getTime() + totalSeconds * 1000);
            } else {
              // Se vier como string, tenta parsear normalmente
              date = new Date(val);
            }

            if (isNaN(date.getTime())) return '';

            // Extração manual dos componentes locais para garantir "Exatamente como no doc"
            const pad = (n: number) => String(n).padStart(2, '0');
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const d = pad(date.getDate());
            const hh = pad(date.getHours());
            const mm = pad(date.getMinutes());
            const ss = pad(date.getSeconds());

            // Retorna formato ISO Local (Sem o 'Z' de UTC)
            return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
          };

          for (const row of effectiveRows) {
            // Ignora linhas totalmente vazias (onde não há OS nem Tipo)
            if (!row || (!row[0] && !row[1])) continue;

            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Colunas: G(6): Previsão, H(7): Entrada, I(8): Saída
            const scheduledStart = parseExcelDate(row[6]);
            const arrivalTime = parseExcelDate(row[7]);
            const departureTime = parseExcelDate(row[8]);

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
              exceededHours: '---'
            });
          }

          resolve(records);
        } catch (err) {
          console.error("Erro importação:", err);
          reject(new Error("Erro ao processar planilha. Verifique o formato do arquivo."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
