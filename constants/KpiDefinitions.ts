
export interface KpiDetail {
  title: string;
  description: string;
  formula: string;
}

export const KPI_DEFINITIONS: Record<string, KpiDetail> = {
  ASSERTIVIDADE: {
    title: "Taxa de Assertividade",
    description: "Mede a eficácia da operação comparando viagens finalizadas com o total programado. Indica o sucesso real de entrega da frota.",
    formula: "(Concluídas / (Total - Canceladas)) * 100"
  },
  LEAD_TIME: {
    title: "Lead Time Médio",
    description: "Tempo total de ciclo da carga. Desde a primeira retirada do equipamento até a baixa final no sistema ALS.",
    formula: "Σ(Data Baixa - Data Retirada) / Qtd Viagens"
  },
  PRODUTIVIDADE: {
    title: "Produtividade da Frota",
    description: "Média de movimentações por recurso ativo. Ajuda a identificar se a frota está sendo bem aproveitada ou se há ociosidade.",
    formula: "Total de Viagens / Motoristas Únicos no Período"
  },
  FILA_ATIVA: {
    title: "Carga em Trânsito",
    description: "Volume de ordens de serviço que já saíram do estado pendente mas ainda não foram finalizadas.",
    formula: "Contagem de OS com status ativo (Em Viagem, No Cliente, etc)"
  },
  MODALIDADES: {
    title: "Mix de Operações",
    description: "Distribuição percentual do volume entre Exportação, Importação e outras modalidades contratadas.",
    formula: "(Total Modalidade / Volume Total) * 100"
  },
  PERFORMANCE_ENTIDADES: {
    title: "Ranking de Performance",
    description: "Identificação volumétrica de parceiros. Os maiores indicam faturamento e os menores indicam potencial de crescimento ou risco de inatividade.",
    formula: "Contagem absoluta de OS vinculadas por ID"
  },
  TERMINAIS: {
    title: "Fluxo por Terminal",
    description: "Ranking dos destinos finais ou locais de entrega/devolução com maior e menor volume de movimentação.",
    formula: "Soma de OS agrupadas por nome do terminal de destino"
  },
  CIDADES_CLIENTES: {
    title: "Origem Comercial",
    description: "Distribuição geográfica dos clientes contratantes. Ajuda a entender onde a base de faturamento está concentrada.",
    formula: "Agrupamento de OS pela cidade sede do cliente"
  }
};
