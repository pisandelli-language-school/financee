# SPEC 08 — Integration Architecture Implementation Note

## Decisão arquitetural consolidada

O Financee deve expor uma **API genérica autenticada para consumidores externos**.

O Classtime continua sendo um caso de uso importante, mas **não deve ser modelado como integração estruturalmente acoplada** dentro do core do Financee.

Em termos práticos:

- o Financee permanece como **fonte de verdade** para contratos, contatos e status financeiros relevantes
- sistemas externos consomem esses dados por uma API autenticada e escopada
- o Classtime, quando integrado, entra como **apenas mais um cliente consumidor**
- o mesmo mecanismo deve servir para futuros CRMs, ERPs, sistemas acadêmicos ou ferramentas internas

## O que entra no MVP

- `IntegrationClient` como entidade de cliente consumidor
- escopos por cliente
- autenticação JWT Bearer emitida pelo Financee
- endpoints somente leitura
- `IntegrationLog` para rastreabilidade operacional
- arquitetura preparada para adapters e webhooks futuros

## O que não entra no MVP

- regras especiais do Classtime dentro do domínio central
- payloads moldados para um sistema consumidor específico
- escrita externa em contratos, contatos ou lançamentos
- sincronização bidirecional
- providers externos completos como PagBank/Open Finance

## Motivação

Essa abordagem preserva:

- baixo acoplamento
- liberdade futura de substituir o Classtime
- reaproveitamento da mesma API por múltiplos consumidores
- governança por escopo, expiração e futura rotação de token
- rastreabilidade centralizada de acessos e integrações

## Contrato de autenticação do MVP

A API exposta usará JWT Bearer assinado pelo Financee com `HS256`. OAuth completo
não entra no MVP; ele poderá substituir o fluxo de emissão sem alterar a validação
dos endpoints consumidores.

Cada JWT terá `iss=financee`, `aud=financee-integrations`, `sub` com o ID do
`IntegrationClient`, `jti` aleatório e `exp`. A validade padrão será de 90 dias.
Os escopos serão sempre resolvidos no banco a partir do cliente ativo, e não serão
confiados apenas como claim do token.

Para tornar expiração e rotação revogáveis imediatamente, cada emissão cria uma
`IntegrationClientCredential`: apenas o hash SHA-256 do JWT é persistido, junto de
`expiresAt`, `revokedAt` e `lastUsedAt`. A rotação cria uma nova credencial e revoga
a anterior depois da janela de transição. O JWT em claro é exibido somente na
emissão e nunca volta a ser armazenado.

O segredo de assinatura fica exclusivamente em `INTEGRATION_JWT_SECRET`; ele não é
um campo de banco nem é enviado ao frontend. O algoritmo, issuer e audience serão
centralizados no `IntegrationService` no próximo bloco.

## Contrato de logs e privacidade do MVP

Antes de gravar `requestSummary`, `responseSummary` ou `rawPayload`, o
`IntegrationService` deverá mascarar CPF/CNPJ, e-mail, telefone, tokens, segredos,
headers `Authorization`/`Cookie` e quaisquer dados de cartão. Dados de cartão nunca
são persistidos. `rawPayload` é opcional e será removido pelo job após 90 dias;
summaries já redigidos permanecem para investigação histórica.

## Tradução para a implementação

O primeiro bloco técnico da SPEC 08 deve construir:

1. o modelo de clientes de integração
2. as credenciais revogáveis, expiráveis e rotacionáveis
3. os escopos
4. a autenticação read-only
5. os endpoints expostos de contratos e contatos
6. o logging de acesso em `IntegrationLog`

Somente depois disso faz sentido adicionar:

- telas administrativas
- logs filtráveis no backoffice
- adapters de providers externos
- webhooks

## Relação com o Classtime

Quando o Classtime passar a consumir dados do Financee, ele deve ser registrado como um `IntegrationClient`, com escopos compatíveis, por exemplo:

- `contacts.read`
- `contracts.read`
- `financial_status.read`

Ou seja, o Classtime não altera a arquitetura. Ele apenas passa a usá-la.
