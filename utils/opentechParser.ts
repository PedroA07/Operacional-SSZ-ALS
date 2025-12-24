import { OpentechTrip } from '../types';

/**
 * Utilitário para converter o HTML bruto da Opentech em objetos de viagem
 * Utiliza busca por tags e padrões específicos da plataforma SIL.
 */
export const opentechParser = {
  /**
   * Converte uma string HTML da tabela de Programação Detalhada para OpentechTrip[]
   */
  parseDetailedTable: (html: string): OpentechTrip[] => {
    const trips: OpentechTrip[] = [];
    
    // Padrão simplificado para encontrar linhas (tr) e colunas (td)
    // Em um cenário real, o HTML da Opentech é denso, então buscamos IDs ou Classes comuns
    // Fix: Explicitly type rows to prevent 'never[]' inference
    const rows: string[] = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || [];

    rows.forEach((row, index) => {
      // Ignora o cabeçalho
      // Fix: Ensure row is recognized as string to use toLowerCase()
      if (index === 0 || row.toLowerCase().includes('<th')) return;

      // Fix: Explicitly type cols to prevent 'never[]' inference and enable match()
      const cols: string[] = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      
      if (cols.length >= 8) {
        const clean = (str: string) => str.replace(/<[^>]*>?/gm, '').trim();

        trips.push({
          id: `sm-${Date.now()}-${index}`,
          smNumber: clean(cols[1]) || '000000', // Geralmente a 2ª coluna é a SM
          clientName: clean(cols[2]).toUpperCase(),
          driverName: clean(cols[3]).toUpperCase(),
          driverCpf: clean(cols[4]).replace(/\D/g, ''),
          plateHorse: clean(cols[5]).toUpperCase(),
          origin: clean(cols[6]),
          destination: clean(cols[7]),
          startTime: new Date().toISOString(),
          eta: new Date(Date.now() + 3600000 * 4).toISOString(), // Previsão genérica 4h
          status: 'Em Viagem',
          riskLevel: 'Baixo'
        });
      }
    });

    return trips;
  },

  /**
   * Caso o retorno seja JSON (API interna do SIL)
   */
  parseJsonResponse: (json: any): OpentechTrip[] => {
    if (!Array.isArray(json)) return [];
    
    return json.map((item: any, idx: number) => ({
      id: item.IdSM || `sm-${idx}`,
      smNumber: item.NumeroSM || item.Sm || '---',
      clientName: (item.Cliente || 'GERAL').toUpperCase(),
      driverName: (item.Motorista || 'N/A').toUpperCase(),
      driverCpf: item.CpfMotorista || '',
      plateHorse: item.Placa || '',
      origin: item.CidadeOrigem || '',
      destination: item.CidadeDestino || '',
      startTime: item.DataInicio || new Date().toISOString(),
      eta: item.PrevisaoChegada || new Date().toISOString(),
      status: item.StatusSm === 'Encerrada' ? 'Concluída' : 'Em Viagem',
      riskLevel: item.NivelRisco || 'Baixo'
    }));
  }
};