
import * as XLSX from 'xlsx';
import { StayRecord } from '../types';

export const stayImporter = {
  /**
   * Processa o Excel preservando a fidelidade total dos dados.
   * Pula apenas a primeira linha (A1).
   */
  processExcelForStays: async (file: File, sessionId: string): Promise<StayRecord[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          // raw: true para pegar os números seriais do Excel (ex: 45300.5)
          const workbook = XLSX.read(data, { type: 'array', raw: true });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // header: 1 garante que recebemos um array de arrays, incluindo linhas vazias
          const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: true });
          
          if (rows.length < 1) {
            resolve([]);
            return;
          }

          const records: StayRecord[] = [];
          // Pula EXCLUSIVAMENTE a primeira linha (índice 0)
          const effectiveRows = rows.slice(1);

          /**
           * CONVERSÃO MATEMÁTICA PURA
           * Transforma o serial do Excel (ex: 45666.4166) em String ISO Local
           * SEM usar o motor de data do JS que aplica Timezone.
           */
          const excelSerialToLocalString = (serial: any): string => {
            if (serial === undefined || serial === null || serial === '') return '';
            
            // Se já for uma string vinda do Excel
            if (typeof serial === 'string') {
              return serial.trim();
            }

            if (typeof serial !== 'number') return String(serial);

            // Dias desde 30/12/1899
            const days = Math.floor(serial);
            const fraction = serial - days;

            // Calcula horas, minutos e segundos da fração do dia
            let totalSeconds = Math.round(fraction * 86400);
            const hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;

            // Calcula a data real
            const date = new Date(1899, 11, 30);
            date.setDate(date.getDate() + days);

            const pad = (n: number) => String(n).padStart(2, '0');
            
            const y = date.getFullYear();
            const m = pad(date.getMonth() + 1);
            const d = pad(date.getDate());
            const hh = pad(hours);
            const mm = pad(minutes);
            const ss = pad(seconds);

            // Retorna formato ISO Local (Sem o 'Z') para o navegador não converter fuso
            return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
          };

          for (const row of effectiveRows) {
            // Se a linha for totalmente vazia, pula para a próxima
            if (!row || row.length === 0) continue;

            // Colunas: A(0): Tipo, B(1): OS, C(2): Local, D(3): Motorista, E(4): Navio, F(5): Container
            // G(6): Previsão, H(7): Entrada, I(8): Saída
            const type = String(row[0] || 'GERAL').toUpperCase().trim();
            const os = String(row[1] || '').toUpperCase().trim();
            const location = String(row[2] || '---').toUpperCase().trim();
            const driverName = String(row[3] || '---').toUpperCase().trim();
            const ship = String(row[4] || '').toUpperCase().trim();
            const container = String(row[5] || '').toUpperCase().trim();
            
            const scheduledStart = excelSerialToLocalString(row[6]);
            const arrivalTime = excelSerialToLocalString(row[7]);
            const departureTime = excelSerialToLocalString(row[8]);

            // Se não tiver ao menos um identificador (OS ou Container), ignora lixo da planilha
            if (!os && !container) continue;

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
          reject(new Error("Erro ao processar planilha. Verifique o formato."));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }
};
