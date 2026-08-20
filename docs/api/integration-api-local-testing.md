# Teste local da Integration API com Hoppscotch

## 1. Preparar o banco e as variáveis

No `.env`, mantenha valores reais e distintos para `JOBS_CRON_SECRET` e
`INTEGRATION_JWT_SECRET`. A segunda chave deve ter pelo menos 32 caracteres.

Com o banco local em execução, sincronize o schema que inclui as tabelas de
integração:

```bash
pnpm prisma:generate
pnpm prisma:db:push
```

## 2. Emitir um token local de teste

Execute:

```bash
pnpm integration:issue-test-token
```

O script é bloqueado em produção. Ele cria ou atualiza somente o cliente local
`hoppscotch-local`, concede os três scopes iniciais e revoga as credenciais
anteriores desse mesmo cliente antes de emitir uma nova. Copie o JWT exibido: ele
não é persistido em claro e não será mostrado novamente.

## 3. Iniciar a aplicação

```bash
pnpm dev
```

Por padrão, a coleção usa `http://localhost:3000` como `baseUrl`.

## 4. Importar e configurar a coleção

1. No Hoppscotch, use **Import** e escolha o arquivo Postman
   `docs/api/financee-integrations.postman_collection.json`.
2. Abra as variáveis da coleção.
3. Cole o JWT emitido em `integrationToken`.
4. Mantenha `baseUrl` local, ou altere-o se o Nuxt estiver em outra porta.
5. Deixe `contactId` e `contractId` vazios inicialmente.

## 5. Executar as requisições

Execute primeiro **List contacts** e **List contracts**. Copie um `id` retornado
para `contactId` ou `contractId`; então execute as requisições de detalhe.

As listagens aceitam `page` e `pageSize`; o limite é 100 itens por requisição.
Todas usam automaticamente `Authorization: Bearer {{integrationToken}}`.

## Resultado esperado

Uma credencial correta retorna `200`. Casos úteis para validar o comportamento:

- apagar ou alterar `integrationToken`: `401`;
- usar um token revogado ao executar novamente o script: `401`;
- emitir um cliente sem o scope da rota (futuro backoffice): `403`;
- consultar um ID inexistente: `404`.

Os acessos autorizados são registrados em `IntegrationLog`; a visualização desses
logs será entregue no bloco de backoffice da SPEC 08.
