# Nota de implementação — contas e carteiras

## Intenção

Esta alteração transforma `contas e carteiras` de um catálogo simples em um cadastro operacional mais rico.

Antes, `Account` era tratado como uma entidade mínima:
- nome
- tipo
- saldo inicial
- ativo/inativo

Agora, a conta passa a carregar contexto visual e operacional:
- instituição financeira opcional persistida
- logo da instituição
- alerta de saldo baixo
- telefone
- e-mail
- observações

## Decisões tomadas

### 1. Instituição financeira persistida em banco

Foi criado um catálogo persistido de instituições financeiras (`FinancialInstitution`) em vez de manter a lista apenas no frontend.

Motivos:
- garantir consistência entre ambientes
- permitir seed de produção
- evitar acoplamento da criação de conta a uma lista hardcoded sem lastro no banco
- preparar o terreno para integrações futuras

### 2. Conta com instituição opcional

Nem toda conta precisa nascer de uma instituição pré-cadastrada.

Por isso, `Account.institutionId` é opcional:
- quando existe, a UI usa a logo e o nome da instituição
- quando não existe, a UI cai para modo manual e usa iniciais da conta

### 3. Contas deixam de usar o fluxo `SimpleCatalog`

`Account` não cabe mais na abstração compartilhada de catálogo simples.

Motivos:
- passou a ter múltiplos campos próprios
- precisa de etapa de escolha de instituição
- precisa de renderização em cards
- precisa de integração visual com lançamentos

Por isso, o backend e o formulário de contas foram especializados.

### 4. Cards na listagem

A tabela foi substituída por cards para aproximar a leitura da conta daquilo que o usuário reconhece como “carteira” ou “conta bancária”.

Motivos:
- melhora de escaneabilidade
- melhor uso de logo, nome e tipo
- mais aderência ao modelo mental do usuário

### 5. Lançamentos mostram só a identidade visual da conta

Na listagem de lançamentos, a coluna de conta passa a mostrar:
- logo da instituição, quando existir
- iniciais da conta manual, quando não existir
- tooltip com o nome da conta

Motivos:
- reduzir ruído horizontal na tabela
- preservar informação completa sob demanda
- alinhar a coluna de conta ao papel de “identificação rápida”

### 6. O card ainda mostra saldo inicial, não saldo dinâmico

Na listagem de contas e carteiras, o valor exibido no card representa apenas o campo persistido de saldo inicial da conta.

Isso significa que:
- se a conta nasce com `R$ 2.000,00`, o card mostra `R$ 2.000,00`
- novos lançamentos não alteram esse valor visualmente nesta etapa

Decisão tomada:
- manter a UI honesta com o dado atual usando o rótulo `Saldo inicial`
- adiar a mudança para `Saldo atual` até existir regra consolidada de cálculo com base em lançamentos, pagamentos, transferências e futura conciliação

## Impactos esperados

- necessidade de sync do Prisma schema
- necessidade de seed do catálogo de instituições
- ajuste no seed local de QA para vincular contas a instituições
- ajuste nas telas que exibem `AccountRecord`

## Fora de escopo desta mudança

- conciliação bancária real
- saldo atual calculado a partir dos lançamentos
- integração com Open Finance
- importação de extrato
- alertas automáticos de saldo baixo

Esses pontos ficam preparados pelo modelo, mas não são implementados agora.
