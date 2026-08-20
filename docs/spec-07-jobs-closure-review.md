# SPEC 07 Closure Review

## SPEC

- Source spec: `docs/specs/domains/07-jobs-scheduling-background-processing.spec.md`
- Review workflow: `financee/docs/spec-closure-review.md`

## Verdict

`Implemented with caveats`

## Summary

O módulo de Jobs, Scheduling & Background Processing está implementado e operacional no Financee:

- existe página administrativa em `/configuracoes/jobs`
- existe catálogo persistido de jobs com modo, status e agendamento
- admins podem executar jobs manualmente
- jobs podem ser habilitados e desabilitados
- o desligamento de jobs preserva rastreabilidade operacional de quando e por quem ocorreu
- existe histórico simplificado por job
- existem endpoints de cron protegidos por segredo
- os jobs do MVP são idempotentes
- falhas críticas geram observabilidade em execução, auditoria, notificação e e-mail interno
- existe cobertura automatizada para as regras de execução mais sensíveis

## Scope Decisions Accepted For This Delivery

### 1. O MVP ficou em cron simples por endpoint, sem orquestrador distribuído

Severity: accepted

A spec foi escrita sobre uma base simples com Vercel Cron, e a entrega atual preserva essa decisão:

- um endpoint por job
- proteção por segredo
- execução isolada
- reexecução manual via painel administrativo

Isso mantém a arquitetura compreensível e compatível com o estágio atual do produto.

### 2. O histórico de execuções ficou simplificado, sem dashboard analítico dedicado

Severity: accepted

A tela entrega o que a spec pede para o MVP:

- última execução
- status
- duração
- erro contextual
- histórico recente por job

Não existe ainda uma camada analítica mais densa com tendências, comparação entre execuções ou drill-down operacional avançado.

### 3. O job de purge de integrações foi ativado com retenção de 90 dias

Severity: accepted

Com a consolidação da SPEC 08, o job `purge-integration-payloads` remove
`rawPayload` de `IntegrationLog` com mais de 90 dias, preservando summaries e
metadados para investigação histórica. A operação é idempotente e registra a
quantidade removida e a data de corte na execução.

## Findings Resolved During Closure

### 1. A camada de jobs passou a ter persistência real de definição e execução

Severity: high

Foi implementado o modelo persistido com:

- `JobDefinition`
- `JobExecution`
- enums de modo e status

Isso fecha a base de:

- habilitar/desabilitar
- executar manualmente
- observar status
- manter histórico

### 2. A execução respeita as regras de modo e bloqueio automático/manual

Severity: high

As regras críticas da spec agora estão cobertas:

- jobs `AUTOMATIC` não podem ser executados manualmente
- jobs `MANUAL` não entram no fluxo automático
- jobs desabilitados não executam automaticamente

Também foram adicionados testes automatizados para essas regras.

### 3. O Financee agora materializa recorrências indefinidas por job dedicado

Severity: high

Foi implementado o job `extend-recurrence-window`, que:

- verifica a borda da janela materializada
- expande recorrências indefinidas
- preserva idempotência por `recurrenceGroupId + recurrenceIndex`
- recalcula vencimento efetivo

Isso fecha um ponto importante do vínculo entre Jobs e Lançamentos.

### 4. Falhas críticas agora geram observabilidade operacional de verdade

Severity: high

Quando um job falha, a aplicação agora:

- registra `JobExecution` com `FAILED`
- grava `AuditLog`
- cria notificações críticas para papéis internos elegíveis
- envia e-mail interno pelo provider configurado

Isso fecha o principal gap de confiabilidade operacional do módulo.

### 5. A superfície administrativa ficou integrada ao backoffice real

Severity: medium

Foi implementada a UI administrativa com:

- filtros por busca, modo e status
- listagem operacional
- ação de executar agora
- toggle de ativação
- modal de histórico
- integração com RBAC (`jobs.view`, `jobs.run`)

## Confirmed Strengths

- `/configuracoes/jobs` existe e está protegida.
- O catálogo de jobs é persistido no banco.
- O seed cria definições e histórico de exemplo.
- Há endpoints administrativos para listar, executar, alternar e consultar histórico.
- O desligamento de jobs preserva `disabledAt` e `disabledBy`, sem apagar a última atividade útil.
- Há endpoints de cron separados por job.
- O cron é protegido por `JOBS_CRON_SECRET`.
- A execução manual respeita o modo do job.
- A execução automática respeita modo e `isEnabled`.
- Jobs críticos do MVP estão mapeados:
  - contratos
  - inadimplência
  - fluxo de caixa
  - contratos sem lançamentos
  - extensão de recorrência
  - expiração de notificações
  - purge seguro de payloads de integração
- O job de recorrência é idempotente.
- Falhas críticas geram auditoria, notificação e e-mail.
- Os testes automatizados de execução passaram.
- O typecheck passou.

## Remaining Caveats

### 1. O agendamento em produção ainda depende do wiring externo do provider de cron

Severity: medium

A aplicação já entrega:

- os endpoints
- a segurança
- a lógica de execução

Mas a orquestração efetiva em produção ainda depende da configuração do ambiente hospedeiro, como Vercel Cron.

### 2. O purge de payloads de integração segue a política de retenção da SPEC 08

Severity: low

O job remove somente o conteúdo de `rawPayload` em logs com mais de 90 dias. Os
summaries redigidos e os metadados do log são preservados para auditoria.

### 3. A cobertura de testes é focada nas regras de execução, não no módulo inteiro

Severity: low

Os testes adicionados cobrem o trecho mais sensível do contrato de execução:

- bloqueio por modo
- bloqueio por habilitação
- restrição de execução manual

Ainda há espaço futuro para ampliar testes de:

- histórico de execuções
- falha crítica com alerta
- materialização de recorrência
- expiração de notificações

## Validation

Executed on August 3, 2026:

```bash
pnpm test test/jobs.spec.ts
pnpm typecheck
```

Result:

- `test/jobs.spec.ts`: 3 tests passed
- `pnpm typecheck`: passed

## Closing Decision

SPEC 07 should currently be treated as:

`Implemented with caveats`
