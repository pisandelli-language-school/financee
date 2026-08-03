# Test Backlog

## Cobertura já adicionada

- `test/notifications-api.spec.ts`
  - listagem
  - unread count
  - marcar uma como lida
  - marcar todas como lidas
  - exclusão
- `test/jobs-api.spec.ts`
  - executar job
  - listar histórico
  - último status
  - toggle
- `test/notifications-store.spec.ts`
  - fetch
  - filtros
  - leitura individual
  - leitura em massa
  - exclusão com ajuste de paginação
- `test/jobs-store.spec.ts`
  - fetch
  - filtros locais
  - toggle preservando último histórico
  - execução com refresh
  - histórico e tratamento de erro
- `test/contracts-generation.spec.ts`
  - geração de lançamentos a partir de contrato parcelado
  - bloqueio de geração duplicada
- `test/jobs.spec.ts`
  - guard rails de execução manual/automática
  - alerta interno quando um job falha

## Backlog prioritário

### Alta prioridade

- Contratos
  - renovação com validação de cadeia e datas
  - bloqueio de geração de lançamentos para status inválidos
- Lançamentos
  - fluxo de baixa manual
  - transferências com reflexo em conta origem/destino
  - recorrência fixa e extensão por job
- Notificações
  - arquivamento após leitura + janela de retenção
  - renderização de contexto por tipo de entidade

### Média prioridade

- Relatórios
  - contratos
  - inadimplência
  - DRE
  - fluxo de caixa
  - foco em regras de agregação e filtros de período
- Jobs
  - histórico retornando ordenação e limite corretos
  - execução bem-sucedida dos jobs com metadata esperada

### Baixa prioridade

- Páginas/UI
  - smoke tests de navegação crítica
  - ações principais dos modais
- Seeds
  - validação do seed principal para ambiente local/QA

## Estado atual

- Suíte completa: `15` arquivos
- Total de testes: `67`
- Última validação: `pnpm test -- --run`
