
export interface ExcelColumnDef {
  header: string;
  key: string;
  width: number;
  format?: string;
}

export const STAY_COLUMNS: ExcelColumnDef[] = [
  { header: 'PROVEDOR', key: 'provedor', width: 25 },
  { header: 'NUMERO DA OS', key: 'os', width: 18 },
  { header: 'CLIENTE', key: 'cliente', width: 35 },
  { header: 'MOTORISTAS', key: 'motorista', width: 30 },
  { header: 'NAVIO/VIAGEM', key: 'navio', width: 30 },
  { header: 'CONTAINER', key: 'container', width: 20 },
  { header: 'HORARIO PROGRAMADO', key: 'programado', width: 22 },
  { header: 'CHEGADA', key: 'chegada', width: 22 },
  { header: 'SAIDA', key: 'saida', width: 22 },
  { header: 'ATENDEU AGENDA', key: 'atendeu', width: 15 },
  { header: 'FREE-TIME', key: 'freetime', width: 12 },
  { header: 'HORAS EXCEDENTES', key: 'excedente', width: 15 },
  { header: 'CUSTO POR HORA OU FRACAO', key: 'custohora', width: 20 },
  { header: 'CUSTO TOTAL', key: 'custototal', width: 18 },
  { header: 'OS AVULSA', key: 'avulsa', width: 12 },
  { header: 'ANÁLISE', key: 'analise', width: 12 },
];
