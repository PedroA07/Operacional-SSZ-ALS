
export interface KpiDetail {
  title: string;
  description: string;
  formula: string;
}

export const KPI_DEFINITIONS: Record<string, KpiDetail> = {
  ASSERTIVIDADE: {
    title: "Taxa de Assertividade",
    description: "Percentual de ordens de serviço concluídas com sucesso em relação ao total de ordens criadas no período selecionado.",
    formula: "(Viagens Concluídas / Total de OS) * 100"
  },
  LEAD_TIME: {
    title: "Lead Time Médio",
    description: "Média de tempo que uma carga leva desde o primeiro registro de status até a conclusão final da viagem.",
    formula: "Σ (Data Conclusão - Data Início) / Quantidade de Viagens"
  },
  PRODUTIVIDADE: {
    title: "Produtividade por Motorista",
    description: "Média de quantas viagens cada motorista ativo realizou dentro do intervalo de tempo filtrado.",
    formula: "Total de Viagens / Quantidade de Motoristas Únicos"
  },
  FILA_ATIVA: {
    title: "Carga na Fila Ativa",
    description: "Quantidade total de veículos que estão atualmente com o status diferente de 'Concluído' ou 'Cancelado'.",
    formula: "Contagem de OS com status em andamento"
  },
  MODALIDADES: {
    title: "Distribuição de Modais",
    description: "Divisão do volume operacional por tipo de contrato (Exportação, Importação, Coleta, etc).",
    formula: "Total por Tipo / Volume Geral"
  },
  PERFORMANCE_ENTIDADES: {
    title: "Ranking de Performance",
    description: "Comparativo entre os maiores volumes (Top) e menores volumes (Bottom) para identificar gargalos ou parceiros estratégicos.",
    formula: "Ordenação simples por volume absoluto de OS"
  }
};
