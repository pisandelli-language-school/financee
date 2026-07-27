# SPEC 04 Closure Review

## SPEC

- Source spec: `docs/specs/domains/04-contratos.spec.md`
- Review workflow: `financee/docs/spec-closure-review.md`

## Verdict

`Implemented with caveats`

## Summary

O módulo de Contratos está implementado e operacional no Financee:

- listagem protegida em `/contratos`
- criação e edição por modal
- renovação encadeada com vínculo histórico
- histórico navegável por cadeia de renovações
- geração controlada de lançamentos a partir do contrato
- prevenção de geração duplicada quando já existem lançamentos vinculados
- contratos tratados como fonte local de verdade
- cobrança estruturada no próprio contrato, sem depender de cadastro global solto

## Scope Decisions Accepted For This Delivery

### 1. O Financee permanece como fonte única de verdade para contratos

Severity: accepted

Embora o modelo preserve `source` e `externalContractId` para compatibilidade futura, a interface atual considera todos os contratos como `LOCAL`.

Isso foi uma decisão explícita de produto para:

- evitar fragmentação entre sistemas
- manter o Financee como base contratual oficial
- deixar integrações futuras como consumo da API do Financee, e não como importação operacional de contratos

### 2. O fluxo de cobrança foi estruturado dentro do contrato

Severity: accepted

O projeto deixou de depender de uma tela separada de “Condições de pagamento” como fonte principal da lógica comercial.

O fluxo oficial passou a usar campos estruturados no contrato:

- `billingModel`
- `billingFrequency`
- `billingOccurrences`
- `firstDueDate`

Isso reduz inconsistência, facilita rastreabilidade e melhora a geração de lançamentos.

### 3. Criação e edição seguem o padrão modal do backoffice

Severity: accepted

A entrega usa modais para:

- criar contrato
- editar contrato
- renovar contrato
- gerar lançamentos
- visualizar histórico

Essa decisão mantém coerência com o restante do backoffice e evita navegação desnecessária para páginas auxiliares.

## Findings Resolved During Closure

### 1. O status operacional “Perdido” foi substituído por “Trancado”

Severity: medium

O status anterior não refletia bem a regra de pausa contratual.

A solução adotada foi:

- renomear a semântica de negócio
- atualizar o enum interno para `LOCKED`
- migrar os dados legados
- refletir a mudança na interface como `Trancado`

Isso elimina alias temporário e reduz débito técnico futuro.

### 2. O histórico de renovação agora mostra a cadeia completa

Severity: medium

Antes, a visualização era mais limitada ao vínculo imediato. A implementação atual percorre:

- contratos anteriores da cadeia
- contrato atual
- renovações posteriores já existentes

Além disso, a lista principal agora sinaliza melhor o contexto:

- contrato que deu origem a uma renovação
- contrato originado de outro
- quantidade de contratos posteriores

### 3. O carregamento assíncrono de edição/renovação foi ajustado para evitar atraso perceptível

Severity: medium

Em vez de esperar todos os dados antes de abrir a interface, o modal abre imediatamente e mostra carregamento interno.

Isso reduz:

- sensação de clique perdido
- risco de duplo clique
- inconsistência perceptiva entre ação e resposta visual

### 4. A geração de lançamentos foi restringida quando já existem lançamentos vinculados

Severity: medium

Para reduzir duplicidade operacional, contratos com lançamentos já gerados deixam de expor a ação de gerar novamente no fluxo principal.

## Confirmed Strengths

- `/contratos` existe e está protegida.
- O contrato pertence a um único cliente e o relacionamento é preservado.
- Renovação cria novo contrato e mantém vínculo com o anterior.
- Apenas contratos `ACTIVE` podem ser renovados.
- Renovação exige coerência cronológica com a cadeia anterior.
- O histórico de renovação é visível em modal dedicado.
- A geração de lançamentos permanece explícita, nunca automática.
- O preview de geração existe e respeita a configuração de cobrança do contrato.
- Datas não úteis seguem a regra atual do produto: domingos automáticos + calendário cadastrado.
- A tabela de contratos exibe datas formatadas em `dd/mm/yyyy`.
- O status `Trancado` já substitui o fluxo anterior de “Perdido”.
- O QA funcional e visual desta entrega foi aprovado pela stakeholder.

## Remaining Caveats

### 1. Campos de integração futura permanecem no modelo, mas não fazem parte do fluxo oficial

Severity: low

`source` e `externalContractId` seguem no schema por compatibilidade futura, porém não têm papel operacional na interface atual.

Isso é intencional e documentado, não um gap acidental.

### 2. O módulo ainda pode evoluir em visualização gerencial de cadeia e em automações futuras

Severity: low

O histórico atual está adequado para auditoria operacional, mas ainda pode crescer futuramente com:

- comparações mais densas entre versões
- resumo financeiro por contrato da cadeia
- integrações externas via API

Esses itens não bloqueiam o fechamento da spec atual.

## Validation

Executed on July 27, 2026:

```bash
pnpm --dir financee lint
pnpm --dir financee typecheck
pnpm --dir financee test
```

Result:

- lint passed
- typecheck passed
- `6` test files passed
- `29` tests passed

## Closing Decision

SPEC 04 should currently be treated as:

`Implemented with caveats`
