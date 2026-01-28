
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel preservando a fidelidade total dos dados.
   * Não utiliza conversão de fuso horário do sistema.
   */
  processExcelForStays: async (file: File, sessionId: string): Promise<StayRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // raw: true para pegar os números seriais do Excel sem processamento da lib
          const workbook = XLSX.read(data, { type: 'array', raw: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true });
          
          if (rows.length < 1) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];
          // Pula EXCLUSIVAMENTE a primeira linha (cabeçalho)
          // Linhas 2 e 3 agora são processadas normalmente
          const effectiveRows = rows.slice(1);

          /**
           * Calcula Data/Hora a partir do Serial do Excel sem usar o motor de data do JS.
           * Isso garante que 10:00 na planilha continue sendo 10:00 no sistema.
           */
          const serialToLocalString = (serial: any): string => {
            if (serial === undefined || serial === null || serial === '') return '';
            
            // Se já for string (ex: digitado como texto no Excel)
            if (typeof serial === 'string') {
               // Se for formato ISO parcial (YYYY-MM-DDTHH:mm), completa
               if (serial.includes('T')) return serial.length === 16 ? `${serial}:00` : serial;
               return serial;
            }

            if (typeof serial !== 'number') return String(serial);

            // Parte inteira = Dias / Parte decimal = Horas
            const totalSeconds = Math.round(serial * 86400);
            const date = new Date(1899, 11, 30); // Base Excel
            date.setSeconds(date.getSeconds() + totalSeconds);

            const pad = (n: number) => String(n).padStart(2, '0');
            
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const d = pad(date.getDate());
            const hh = pad(date.getHours());
            const mm = pad(date.getMinutes());
            const ss = pad(date.getSeconds());

            // Retorna string local pura (ISO sem Z)
            return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
          };

          for (const row of effectiveRows) {
            // Só ignora se a linha for realmente nula/indefinida
            if (!row) continue;

            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            
            // Se não tem OS, não é um registro válido
            if (!os) continue;

            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            // Colunas: G(6): Previsão, H(7): Entrada, I(8): Saída
            const scheduledStart = serialToLocalString(row[6]);
            const arrivalTime = serialToLocalString(row[7]);
            const departureTime = serialToLocalString(row[8]);

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
          reject(new Error("Erro ao processar planilha."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
