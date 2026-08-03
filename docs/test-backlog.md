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
  - bloqueio para contratos fora de `ACTIVE`
- `test/jobs.spec.ts`
  - guard rails de execução manual/automática
  - alerta interno quando um job falha
- `test/contracts-renewal.spec.ts`
  - renovação encadeada com atualização do contrato anterior
  - bloqueio para status inválido
  - validação de sobreposição de datas
- `test/contracts-history.spec.ts`
  - cadeia com contrato anterior, atual e próximo
  - tolerância a elo anterior quebrado
  - erro 404 para contrato inexistente
- `test/contracts-status.spec.ts`
  - troca para status válido com retorno normalizado
  - bloqueio de status inválido
- `test/financial-transfers.spec.ts`
  - criação do par de transferências
  - baixa sincronizada entre origem e destino
  - reabertura sincronizada entre origem e destino
- `test/financial-entry-status.spec.ts`
  - baixa manual de lançamento simples
  - reabertura limpando vínculo de pagamento
  - bloqueio de baixa para lançamento cancelado
- `test/jobs-recurrence.spec.ts`
  - extensão automática da janela de recorrências fixas
  - metadata de execução com contagem criada
- `test/notifications-retention.spec.ts`
  - arquivamento após janela de retenção
  - leitura individual sem arquivamento
  - leitura em massa preservando itens na central
- `test/notifications-context.spec.ts`
  - contrato + cliente
  - descrição + contato
  - fallback simples por descrição
  - contexto por período
  - ausência de contexto conhecido
- `test/reporting-contracts.spec.ts`
  - normalização do relatório contratual
  - totais agregados por status
- `test/reporting-delinquency.spec.ts`
  - normalização de títulos em atraso
  - agregação por temperatura e valor exposto

## Backlog prioritário

### Alta prioridade

- Relatórios
  - DRE
  - fluxo de caixa
  - foco em regras de agregação e filtros de período

### Média prioridade

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

- Suíte completa: `25` arquivos
- Total de testes: `93`
- Última validação: `pnpm test -- --run`
