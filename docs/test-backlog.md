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
- `test/jobs-history.spec.ts`
  - último histórico por job na listagem
  - ordenação descendente com limite aplicado
  - último status isolado com fallback nulo
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
- `test/reporting-cashflow.spec.ts`
  - separação de realizados e previstos por regime
  - totais mensais agregados
- `test/reporting-dre.spec.ts`
  - agrupamento DRE excluindo transferências
  - totais finais e validação de intervalo inválido
- `test/reporting-dashboard.spec.ts`
  - composição do dashboard financeiro com fluxo de caixa + inadimplência
  - composição do dashboard operacional com cards de volume e tons neutros/alerta
- `test/reporting-filters.spec.ts`
  - parse de intervalos simples
  - default de data de referência na inadimplência
  - bloqueio de intervalo invertido
- `test/dashboard-ui-smoke.spec.ts`
  - render básico do dashboard financeiro
  - render básico do dashboard operacional
  - validação do carregamento com intervalo mensal persistido
- `test/reporting-ui-smoke.spec.ts`
  - smoke do fluxo de caixa com período persistido
  - smoke do DRE com agrupamentos renderizados
  - validação do carregamento com intervalo mensal persistido
- `test/seed-data.spec.ts`
  - catálogo de instituições financeiras do seed
  - catálogo de automações do MVP
  - catálogo de jobs seeded para QA local
- `test/navigation-ui-smoke.spec.ts`
  - redirecionamento do índice de dashboard para a visão correta
  - render dos hubs de Configurações e Relatórios com links críticos
- `test/backoffice-modal-actions.spec.ts`
  - abertura do modal de categorias em criação e edição
  - abertura do modal de contatos em criação e edição

## Backlog prioritário

### Alta prioridade

- Sem gaps críticos mapeados nesta rodada de cobertura unitária

### Média prioridade

- Sem gaps médios mapeados nesta rodada

### Baixa prioridade

- Sem gaps baixos mapeados nesta rodada

## Estado atual

- Suíte completa: `35` arquivos
- Total de testes: `120`
- Última validação: `pnpm test -- --run`
