
import * as XLSX from 'xlsx';
import { SILProgramacao } from '../types';

// Mapeamento flexível: aceita variações de cabeçalho do SIL
const COL_MAP: Record<keyof Omit<SILProgramacao, '_rowIndex'>, string[]> = {
  numeroProgramacao:    ['número da programação', 'numero da programacao', 'num programacao', 'programação', 'nº programação', 'no programacao', 'n programacao', 'id programacao', 'num. programacao'],
  tipoProgramado:       ['tipo de programação', 'tipo de programado', 'tipo programado', 'tipo'],
  container:            ['containers', 'container', 'num container', 'nº container', 'numero container', 'cont'],
  tipoContainer:        ['tipo container', 'tipo de container', 'tipo cont'],
  taraEspecifica:       ['tara específica', 'tara especifica', 'tara esp', 'tara'],
  lacre1:               ['lacre 1', 'lacre1', 'lacre'],
  booking:              ['booking', 'num booking', 'nº booking'],
  previsaoAtendimento:  ['previsão inicio atendimento (bra)', 'previsão inicio atendimento', 'previsao inicio atendimento', 'previsão de início', 'dt chegada local', 'previsão atendimento', 'previsao atendimento', 'data prevista', 'dt prevista', 'data/hora prevista'],
  situacao:             ['situação programado', 'situacao programado', 'situação programada', 'situação pri', 'situacao', 'situação', 'status'],
  nomeMotorista:        ['nome do motorista programado', 'nome motorista programado', 'nome do motorista', 'nome motorista', 'motorista'],
  cpfMotorista:         ['cpf motorista programado', 'cpf motorista', 'cpf do motorista', 'cpf'],
  placaVeiculo:         ['placa do veículo', 'placa do veiculo', 'placa veiculo', 'placa do', 'placa cavalo', 'placa', 'veículo', 'veiculo'],
  placaCarreta:         ['placa da carreta 1', 'placa carreta 1', 'placa carreta', 'placa da carreta', 'carreta'],
  cidadeAtendimento:    ['cidade local de atendimento', 'cidade atendimento', 'cidade local de', 'cidade local', 'cidade'],
  referenciaPosCidade:  ['referência posição cidade', 'referencia posicao cidade', 'referência posição', 'ref posicao', 'referência'],
  nomeLocalAtendimento: ['nome local de atendimento', 'nome local atendimento', 'nome local', 'local atendimento', 'local de atendimento'],
  numeroColeta:         ['número da solicitação de coleta', 'numero da solicitacao de coleta', 'num coleta', 'nº coleta', 'solicitação de coleta', 'coleta'],
  embarcador:           ['embarcador', 'shipper'],
  navio:                ['navio', 'vessel', 'embarcação'],
  bl:                   ['bu', 'bl', 'b/l', 'bill of lading', 'conhecimento', 'bill'],
};

function normalizeHeader(h: string): string {
  return h.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function findColIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const c of candidates) {
    const idx = normalized.indexOf(c);
    if (idx !== -1) return idx;
  }
  // busca parcial como fallback
  for (const c of candidates) {
    const idx = normalized.findIndex(h => h.includes(c) || c.includes(h));
    if (idx !== -1) return idx;
  }
  return -1;
}

function excelDateToString(value: any): string {
  if (!value && value !== 0) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') {
    // Número serial do Excel
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return String(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.d)}/${pad(date.m)}/${date.y} ${pad(date.H)}:${pad(date.M)}`;
  }
  return String(value).trim();
}

function clean(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

// Palavras-chave que indicam que uma linha é a linha de cabeçalho
const HEADER_KEYWORDS = [
  'programação', 'programacao', 'número da programação', 'numero da programacao',
  'container', 'containers', 'motorista', 'booking', 'situação', 'situacao',
  'placa', 'navio', 'embarcador', 'bl', 'bu', 'tipo',
];

function findHeaderRowIndex(rows: any[][]): number {
  // Varre as primeiras 15 linhas em busca da que tem mais correspondências com HEADER_KEYWORDS
  let bestRow = 0;
  let bestScore = 0;
  const limit = Math.min(15, rows.length);
  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    if (!row) continue;
    const normalized = row.map(h => String(h ?? '').trim().toLowerCase());
    const score = normalized.reduce((acc, cell) =>
      acc + (HEADER_KEYWORDS.some(kw => cell.includes(kw)) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }
  return bestScore >= 2 ? bestRow : 0; // fallback linha 0 se não achou nada confiável
}

export const silExcelImporter = {
  parse: (file: File): Promise<SILProgramacao[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: false });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });

          if (!rows || rows.length < 2) {
            resolve([]);
            return;
          }

          // Localiza linha de cabeçalho dinamicamente (SIL exporta linhas de título antes dos headers)
          const headerRowIdx = findHeaderRowIndex(rows);
          const headers: string[] = (rows[headerRowIdx] as any[]).map(h => String(h ?? ''));

          // Mapeia nome do campo → índice da coluna
          const colIdx: Record<string, number> = {};
          for (const [field, candidates] of Object.entries(COL_MAP)) {
            colIdx[field] = findColIndex(headers, candidates);
          }

          const get = (row: any[], field: string): string => {
            const idx = colIdx[field];
            if (idx === -1) return '';
            const val = row[idx];
            if (field === 'previsaoAtendimento') return excelDateToString(val);
            return clean(val);
          };

          const result: SILProgramacao[] = [];
          for (let i = headerRowIdx + 1; i < rows.length; i++) {
            const row = rows[i];
            // Ignora linhas totalmente vazias
            if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

            result.push({
              _rowIndex: i,
              numeroProgramacao:    get(row, 'numeroProgramacao'),
              tipoProgramado:       get(row, 'tipoProgramado'),
              container:            get(row, 'container'),
              tipoContainer:        get(row, 'tipoContainer'),
              taraEspecifica:       get(row, 'taraEspecifica'),
              lacre1:               get(row, 'lacre1'),
              booking:              get(row, 'booking'),
              previsaoAtendimento:  get(row, 'previsaoAtendimento'),
              situacao:             get(row, 'situacao'),
              nomeMotorista:        get(row, 'nomeMotorista'),
              cpfMotorista:         get(row, 'cpfMotorista'),
              placaVeiculo:         get(row, 'placaVeiculo'),
              placaCarreta:         get(row, 'placaCarreta'),
              cidadeAtendimento:    get(row, 'cidadeAtendimento'),
              referenciaPosCidade:  get(row, 'referenciaPosCidade'),
              nomeLocalAtendimento: get(row, 'nomeLocalAtendimento'),
              numeroColeta:         get(row, 'numeroColeta'),
              embarcador:           get(row, 'embarcador'),
              navio:                get(row, 'navio'),
              bl:                   get(row, 'bl'),
            });
          }
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },
};
