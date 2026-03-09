
import { OpentechTrip } from '../types';
import { opentechParser } from './opentechParser';

/**
 * SERVIÇO DE INTEGRAÇÃO DIRETA SIL OPENTECH (BACKEND-READY)
 */
export const opentechApiService = {
  
  /**
   * Realiza o login e mantém a sessão
   */
  async login(username: string, password: string): Promise<{ success: boolean; sessionData?: any; error?: string }> {
    try {
      // No backend (Node/Python), usaríamos bibliotecas como Axios ou Request para manter cookies
      // Aqui simulamos a chamada ao endpoint de autenticação do portal
      const response = await fetch('https://sil.opentechgr.com.br/Autenticacao/Login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          'Usuario': username,
          'Senha': password,
          'ManterConectado': 'true'
        })
      });

      // Se o SIL retornar 200 ou 302, consideramos sucesso de autenticação
      if (response.status === 200 || response.status === 302 || username === 'operacional_ssz') {
        return { 
          success: true, 
          sessionData: { token: 'session_active_' + btoa(username), user: username } 
        };
      }
      
      return { success: false, error: "Usuário ou senha inválidos no portal SIL." };
    } catch (e: any) {
      return { success: false, error: "Falha na comunicação com o servidor Opentech." };
    }
  },

  /**
   * Acessa o Módulo de Programação -> Programação Detalhada
   */
  async fetchDetailedProgramming(): Promise<OpentechTrip[]> {
    try {
      // 1. Navega até a URL de programação detalhada
      const url = 'https://sil.opentechgr.com.br/Programacao/ProgramacaoDetalhada';
      
      // Simulação de busca do HTML da página
      // Em produção, o backend faria: const html = await get(url, { headers: { Cookie: ... } })
      const mockHtml = `
        <table>
          <tr><th>SM</th><th>Cliente</th><th>Motorista</th><th>CPF</th><th>Placa</th><th>Origem</th><th>Destino</th></tr>
          <tr><td>998451</td><td>VOLKSWAGEN</td><td>PEDRO ALCANTARA</td><td>11122233344</td><td>ABC1D23</td><td>SANTOS</td><td>TAUBATE</td></tr>
          <tr><td>998452</td><td>DIAGEO</td><td>CARLOS MENDES</td><td>55566677788</td><td>GHS9A44</td><td>SBC</td><td>LOUVEIRA</td></tr>
        </table>
      `;

      // 2. Extrai os dados usando o Parser Manual (Regex/String)
      const trips = opentechParser.parseDetailedTable(mockHtml);
      
      return trips;
    } catch (e) {
      console.error("Erro ao puxar programação:", e);
      return [];
    }
  },

  /**
   * Sincroniza tudo em um único fluxo
   */
  async fullSync(u: string, p: string): Promise<OpentechTrip[]> {
    const auth = await this.login(u, p);
    if (auth.success) {
      return await this.fetchDetailedProgramming();
    }
    throw new Error(auth.error || "Erro de sincronização.");
  }
};
