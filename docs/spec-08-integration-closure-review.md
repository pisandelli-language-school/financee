# SPEC 08 Closure Review — Integration Architecture

## SPEC

- Source spec: `docs/SPECS/domains/08-integration-architecture.spec.md`
- Review workflow: `financee/docs/spec-closure-review.md`

## Verdict

`Implemented with caveats`

## Delivered MVP

- `IntegrationClient`, scopes, credenciais revogáveis e `IntegrationLog` com migration versionada.
- JWT Bearer HS256 com expiração, escopos verificados no banco, revogação e rotação por credencial hashada.
- API externa read-only de contatos e contratos, protegida por escopo e com log operacional por chamada autorizada.
- Redação de PII, credenciais, cookies e dados de cartão antes da persistência de logs.
- Job diário que remove `rawPayload` após 90 dias, preservando summaries e metadados.
- Backoffice em `/configuracoes/integracoes` para clientes, scopes, ativação e emissão única de token.
- Backoffice de logs em `/configuracoes/integracoes/logs`, com filtros por provider, status, direção, cliente, operação, entidade e período; detalhe sob demanda.
- Contratos de adapter/webhook e endpoint genérico para providers futuros, com falha controlada quando nenhum provider está configurado.
- Coleção Postman/Hoppscotch, script local de emissão de token e handoff do Classtime documentado.

## Security and operational rules verified

- Nenhum token é persistido em claro.
- Tokens expirados, revogados, inválidos ou de clientes inativos são bloqueados.
- Endpoints e logs administrativos exigem `integracoes.manage`.
- A API externa não possui rotas de escrita.
- `rawPayload` é sanitizado na escrita e removido conforme retenção.

## Automated verification

- 40 arquivos de teste e 137 testes passando.
- Cobertura focada em emissão/validação de token, expiração, revogação, scopes, sanitização, API consumidora, administração, logs, retenção e gateway de webhooks.
- `nuxt typecheck` limpo e `git diff --check` sem problemas.

## Accepted caveats

### 1. `financial_status.read` ainda não possui endpoint dedicado

O scope foi reservado no modelo e pode ser concedido, mas o MVP expõe somente as
rotas de contatos e contratos previstas no sitemap da SPEC. Um resumo financeiro
dedicado deve entrar quando seu payload e suas regras de exposição estiverem
formalmente definidos.

### 2. Não há provider externo ativo

PagBank, Open Finance, Resend e webhooks específicos permanecem fora do MVP. A
camada de adapter e o gateway de webhook existem para manter a implementação
futura isolada do domínio financeiro.

### 3. OAuth completo é futuro

O MVP usa JWT emitido pelo Financee; OAuth pode substituir o fluxo de emissão sem
alterar a autorização por scopes nem os endpoints consumidores.
