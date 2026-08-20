# Handoff do Classtime como consumidor da API

O Classtime consome o Financee como sistema externo, sem acesso direto ao banco e
sem regras específicas no core financeiro.

## Acesso inicial

1. Um administrador cria o cliente `classtime` em **Configurações → Integrações**.
2. Concede somente os scopes necessários: `contacts.read`, `contracts.read` e,
   quando aplicável, `financial_status.read`.
3. Emite um JWT e entrega o valor uma única vez ao responsável técnico.
4. O consumidor envia o token em `Authorization: Bearer <token>`.

## Rotas disponíveis

- `GET /api/integrations/v1/contacts`
- `GET /api/integrations/v1/contacts/:id`
- `GET /api/integrations/v1/contracts`
- `GET /api/integrations/v1/contracts/:id`

A API é somente leitura. O Classtime não cria ou altera contatos, contratos ou
lançamentos no Financee. Quando houver necessidade de um provider externo real,
ele será implementado como adapter e webhook isolados.
