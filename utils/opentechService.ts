
import { Driver } from '../types';

/**
 * Módulo de Integração SIL Opentech
 * Responsável por formatar os dados operacionais para o padrão exigido pela gerenciadora.
 */
export const opentechService = {
  /**
   * Mapeia um motorista para o layout de cadastro da Opentech
   */
  formatDriverForOpentech: (driver: Driver) => {
    return {
      // Dados Pessoais
      Nome: driver.name.toUpperCase(),
      CPF: driver.cpf.replace(/\D/g, ''),
      RG: driver.rg?.replace(/\D/g, '') || '',
      CNH: driver.cnh || '',
      Celular: driver.phone.replace(/\D/g, ''),
      Email: driver.email?.toLowerCase() || '',
      
      // Veículos
      PlacaCavalo: driver.plateHorse.replace('-', ''),
      AnoCavalo: driver.yearHorse,
      PlacaCarreta: driver.plateTrailer.replace('-', ''),
      AnoCarreta: driver.yearTrailer,
      
      // Classificação
      TipoVinculo: driver.driverType === 'Frota' ? '1' : '2', // 1-Frota, 2-Terceiro
      StatusSistema: driver.status === 'Ativo' ? 'A' : 'I',
      
      // Dados Complementares (Exigidos pela Opentech para Liberação de Carga)
      DataCadastro: driver.registrationDate,
      EmpresaOrigem: "ALS TRANSPORTES",
      CNPJMatriz: "13.841.647/0004-30"
    };
  },

  /**
   * Gera o download de um arquivo JSON formatado para Opentech
   */
  exportSingleDriver: (driver: Driver) => {
    const data = opentechService.formatDriverForOpentech(driver);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OPENTECH_MOTORISTA_${driver.cpf.replace(/\D/g, '')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Gera o download de toda a base de motoristas ativos para Opentech
   */
  exportAllDrivers: (drivers: Driver[]) => {
    const formattedList = drivers
      .filter(d => d.status === 'Ativo')
      .map(d => opentechService.formatDriverForOpentech(d));
      
    const blob = new Blob([JSON.stringify(formattedList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OPENTECH_BASE_TOTAL_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
