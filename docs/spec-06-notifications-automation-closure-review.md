# SPEC 06 Closure Review

## SPEC

- Source spec: `docs/specs/domains/06-notifications-alerts-automation.spec.md`
- Review workflow: `financee/docs/spec-closure-review.md`

## Verdict

`Implemented with caveats`

## Summary

O módulo de Notificações, Alertas e Automações está implementado e operacional no Financee:

- existe central persistente de notificações no topo da aplicação
- existe página dedicada em `/notificacoes`
- existe página administrativa em `/configuracoes/automacoes`
- notificações suportam severidade, prioridade, leitura, exclusão manual e navegação contextual
- regras pré-configuradas de automação podem ser ativadas, desativadas e ajustadas
- o catálogo atual de automações cobre regras de vencimento, contratos, caixa e consistência contratual
- eventos críticos podem disparar e-mail interno por provider abstrato
- a geração evita duplicatas por usuário via `dedupeKey`
- notificações lidas entram em janela de arquivamento de 30 dias

## Scope Decisions Accepted For This Delivery

### 1. O MVP ficou com regras pré-configuradas, sem criação arbitrária de novas automações

Severity: accepted

A spec já restringe o MVP a regras estruturadas e pré-configuradas.

A entrega atual mantém essa decisão:

- admins ajustam severidade
- admins ajustam thresholds
- admins ajustam destinatários por papel
- não existe criação livre de regra pela UI

Isso reduz risco operacional e evita abrir um workflow engine antes da hora.

### 2. A página de notificações foi entregue em tabela, não em feed de cards

Severity: accepted

Durante a implementação, a listagem completa foi estabilizada em cima do `BackofficeListPanel`, com:

- filtros
- paginação
- ações inline
- empty state

Isso diverge da leitura inicial mais “feed-like”, mas melhora consistência com o restante do produto e foi aceito pela stakeholder.

### 3. Realtime/push ficou em modo incremental leve, não websocket/push real

Severity: accepted

A spec fala em realtime/push, badge automático e sincronização incremental.

A entrega atual cobre isso por:

- cache leve na store
- refetch incremental
- atualização de badge
- atualização de preview/lista após ações do usuário

Não há, nesta entrega, um canal realtime dedicado com websocket/SSE.

## Findings Resolved During Closure

### 1. O módulo não tinha persistência real nem expiração operacional fechada

Severity: high

Foi implementado o fluxo completo de persistência:

- `Notification` com `isRead`, `readAt`, `archivedAt`, `deletedAt`
- `Notification` filtrada por usuário
- remoção imediata da central quando `deletedAt` é preenchido
- arquivamento apenas para notificações lidas com mais de 30 dias
- notificações não lidas nunca expiram automaticamente

Isso fecha a regra crítica principal do módulo.

### 2. A central do header foi separada em componentes próprios

Severity: medium

Durante a implementação, o shell autenticado foi refatorado para isolar:

- topbar
- sino de notificações
- dropdown da central
- item individual de notificação

Isso reduziu acoplamento do layout principal e deixou a central mais fácil de evoluir.

### 3. A entrega passou a navegar por contexto e não apenas exibir alertas passivos

Severity: medium

As notificações agora suportam `actionUrl` e navegação contextual.

Na prática, isso permitiu:

- abrir o contexto operacional da notificação
- marcar como lida ao navegar
- usar a central como ponto real de trabalho, não só como inbox visual

### 4. A camada de automação cobre as regras padrão do MVP

Severity: medium

As regras estruturadas previstas pela spec foram entregues:

- contrato próximo do fim
- lançamento vencido
- lançamento próximo do vencimento
- fluxo de caixa negativo
- contrato sem lançamentos gerados
- contrato sem condição de pagamento

Também existe camada de configuração por severidade e destinatários.

### 5. O provider de e-mail foi abstraído com fallback seguro

Severity: medium

O envio interno foi implementado por provider abstrato com suporte a Resend.

Quando o provider não está configurado:

- o sistema falha de forma segura
- não derruba o fluxo principal
- os testes cobrem esse comportamento

## Confirmed Strengths

- `/notificacoes` existe e está protegida.
- `/configuracoes/automacoes` existe e está protegida.
- A central persistente está disponível no header autenticado.
- O badge de não lidas é atualizado pelo store.
- A listagem do usuário suporta filtros por severidade e leitura.
- `markAsRead(id)` define `isRead = true` e `readAt = now()`.
- `markAllAsRead()` está implementado.
- `deleteNotification(id)` é deleção manual com `deletedAt`.
- Notificações deletadas não entram no job de expiração.
- A geração usa `@@unique([userId, dedupeKey])`.
- Regras críticas podem disparar e-mail interno.
- O módulo de automações respeita o escopo de regras pré-configuradas do MVP.
- O catálogo de regras já foi ampliado com casos operacionais úteis sem abrir criação arbitrária de automações.
- Há testes automatizados cobrindo parsing de filtros, clone de formulário e fallback seguro de e-mail.
- O QA funcional foi aprovado.

## Remaining Caveats

### 1. Realtime ainda não é push real

Severity: medium

Apesar do comportamento incremental e do badge funcional, ainda não existe:

- websocket
- SSE
- push channel dedicado

Isso mantém a experiência útil no MVP, mas abaixo do realtime “pleno” descrito de forma aspiracional na spec.

### 2. A tabela de notificações usa workaround local para destacar linhas lidas

Severity: low

O estado visual de leitura hoje depende de workaround local com seletor estrutural na tabela.

O débito já foi mapeado em issues:

- Daredash: token nativo para background de `tr`
- Financee: remover o hack quando a base estiver disponível

Isso não bloqueia a feature, mas ainda não é o acabamento ideal da infraestrutura visual.

### 3. O espaçamento entre toolbar e tabela no painel compartilhado ainda depende do comportamento dos campos

Severity: low

Durante o ajuste de `/notificacoes`, ficou claro que parte do respiro vertical ainda é mascarada pela própria área interna dos campos de formulário, e não por um gap estrutural do `BackofficeListPanel`.

Esse débito também já foi registrado para correção posterior no componente compartilhado.

### 4. A rota administrativa de notificações foi mantida, mas removida da navegação principal

Severity: accepted

Após validação de uso real do módulo, a entrada `Configurações > Notificações` deixou de ser exposta:

- no submenu de `Configurações`
- nos cards da página `/configuracoes`

Motivo:

- a página ainda não oferece configuração operacional suficiente para justificar destaque na IA principal
- as ações realmente úteis já estão distribuídas entre:
  - `/notificacoes`, para leitura, exclusão e navegação contextual
  - `/configuracoes/automacoes`, para thresholds, severidade e destinatários

A rota foi mantida por segurança e por compatibilidade interna, mas deixou de ser promovida como área principal do produto.

## Validation

Executed on July 31, 2026:

```bash
pnpm --dir financee typecheck
pnpm exec vitest run test/notifications.spec.ts
pnpm exec vitest run test/email.spec.ts
```

Expected result for closure:

- typecheck passing
- notification tests passing
- email tests passing

## Closing Decision

SPEC 06 should currently be treated as:

`Implemented with caveats`
