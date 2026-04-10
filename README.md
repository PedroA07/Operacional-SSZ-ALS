<div align="center">
<img width="200" height="200" alt="ALS Logística" src="public/logo.jpg" />

# ALS Logística — Sistema Operacional SSZ
**Plataforma de gestão operacional para operações portuárias em Santos (SSZ)**

![Version](https://img.shields.io/badge/versão-3.1.0-blue) ![Stack](https://img.shields.io/badge/stack-React%2019%20%7C%20TypeScript%20%7C%20Supabase-informational) ![Build](https://img.shields.io/badge/build-Vite-yellow)
</div>

---

## Sobre o Sistema

O **Sistema Operacional SSZ** é uma aplicação web desenvolvida internamente para a equipe de operações da ALS Logística. Centraliza o controle de viagens, motoristas, clientes, documentos e processos financeiros relacionados às operações de transporte de contêineres no Porto de Santos.

O sistema opera em tempo real via Supabase Realtime, com sincronização automática entre todos os usuários conectados.

---

## Módulos e Funcionalidades

### Início (Overview)
Painel principal com indicadores operacionais do dia:
- Viagens de ontem, hoje, amanhã, semana, mês e ano
- Viagens em atraso com alertas visuais
- Status dos motoristas em tempo real
- KPIs operacionais e gráficos analíticos
- Controle de lacres (disponíveis, em uso e por transportadora)
- Feed de atividades recentes

### Operações
Núcleo do sistema. Gerencia todas as Ordens de Serviço (OS):
- Cadastro e edição de viagens com todos os dados operacionais (OS, booking, navio, contêiner, tipo, categoria, motorista, cliente, destino, datas)
- Filtros avançados por tipo, modalidade, motorista e datas
- Histórico de status com linha do tempo por viagem
- Visualização por categoria de operação ou por cliente
- Gerenciador de documentos por viagem (OS, agendamento, CT-e, NF, CVA, contrato de frete)
- Visualização de documentos do motorista capturados em campo
- Localização do motorista
- Integração com o sistema **SIL** (Sistema de Informações Logísticas do porto) via simulador de portal embutido
- Conexão com sistema **Opentech**
- Geração de Ordem de Coleta e formulários de Pré-Stacking em PDF
- Exportação de dados para Excel

### Organização
Painel de organização de viagens com controle de pendências documentais, facilitando o acompanhamento do fluxo de emissão de CT-e.

### Coleta do Dia
Painel dedicado ao fluxo diário de coleta:
- Listagem das viagens programadas para coleta no dia com filtros por tipo e período
- Controle de envio de e-mail por OS (coluna **E-mail**)
- Controle de geração de documento originário por OS (coluna **Doc. Originário**)
- Envio de e-mails com templates personalizáveis direto pelo sistema
- Botão **Copiar Doc. Orig.** — copia as OS com doc. originário marcado, formatadas para envio via WhatsApp
- Botão **Emissão Solicitada** — finaliza o lote de viagens prontas e remove do painel

### Automações
Gerenciamento de automações e fluxos operacionais automatizados (acesso restrito a administradores).

### Portal Externo
Visualização dedicada para usuários externos (terceiros), com acesso limitado às informações pertinentes à sua operação.

### Documentação
Repositório centralizado de documentos operacionais.

### Financeiro
Controle financeiro das operações:
- **Saldos** — gestão de pagamentos de saldo por viagem
- **Adiantamentos** — controle de adiantamentos a motoristas
- **Contratos de Frete** — armazenamento e consulta de contratos

### Estadias
Controle de estadias de contêineres, com registro de sessões e cálculo de períodos.

### Motoristas
Cadastro completo de motoristas com dados pessoais, documentos, placas e status operacional.

### Formulários
Geração de formulários operacionais em PDF:
- Ordem de Coleta
- Pré-Stacking

### Clientes
Cadastro de clientes com CNPJ, endereço, operações vinculadas e histórico.

### Portos
Gerenciamento de terminais e portos utilizados nas operações.

### Pré-Stacking
Controle de pré-stacking de contêineres com registro e histórico.

### Cofre de Logins
Armazenamento seguro de credenciais de acesso a sistemas externos utilizados pela equipe.

### Controle de Lacres
Gestão de lotes de lacres: entrada, saída, uso por viagem e controle por transportadora.

### Avantida
Registro e acompanhamento de ocorrências Avantida vinculadas às operações.

### Equipe ALS
Gerenciamento de colaboradores internos com perfis, funções e controle de presença online.

### Usuários Externos
Criação e gerenciamento de acessos externos com permissões restritas (acesso admin).

### Configurações
Configurações gerais do sistema: status personalizados, tipos de operação, categorias, integrações e parâmetros operacionais (acesso admin).

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Banco de Dados | Supabase (PostgreSQL + Realtime) |
| Armazenamento de Arquivos | AWS S3 / Cloudflare R2 |
| IA | Google Gemini API |
| PDF | jsPDF + html2canvas |
| Excel | ExcelJS + XLSX |
| OCR | Tesseract.js |
| Código de Barras | JsBarcode |
| UI | Tailwind CSS + Lucide React |

---

## Perfis de Acesso

| Perfil | Descrição |
|---|---|
| `admin` | Acesso total ao sistema, incluindo configurações, automações, usuários externos e equipe |
| `operator` | Acesso às operações, coleta, documentos e módulos operacionais |
| `third_party` | Acesso restrito ao Portal Externo com visão limitada |

---

## Executar Localmente

**Pré-requisitos:** Node.js 18+

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

Configure as variáveis de ambiente no arquivo `.env.local`:

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
GEMINI_API_KEY=sua_chave_gemini
```

---

<div align="center">
  <sub>Desenvolvido para uso interno — ALS Logística · Santos, SP</sub>
</div>
