# Theme Support Best Practices

## Objetivo
Garantir que o Financee acompanhe corretamente qualquer troca de tema disparada pelo Daredash via `data-theme`, sem depender de cores fixas ou tokens inexistentes.

## Princípios
- O `data-theme` no `dd-layout` é o gatilho oficial de tema. O Financee deve reagir a ele por meio de tokens.
- Preferir tokens semânticos do sistema antes de escolher escalas de cor manuais.
- Quando um componente do Daredash expõe tokens próprios, sobrescrever `--dd-*` antes de criar CSS paralelo.
- Evitar valores literais de cor na UI do app.

## Ordem de preferência
1. Tokens semânticos de fundo e texto, com bordas usando apenas tokens confirmados.
2. Tokens próprios do componente, como `--dd-card-*`, `--dd-button-*`, `--dd-sidebar-*`.
3. Escalas de cor (`primary.200`, `gray`, `danger.700`) apenas quando a intenção visual exigir isso.
4. `color-mix(...)` derivado de tokens já existentes.

## Padrões recomendados

### Superfícies
- Fundo principal: `v('color.bg.surface')`
- Fundo secundário: `v('color.bg.subtle')`
- Borda padrão: `v('color.light-gray')`

### Texto
- Texto principal: `v('color.text.default')`
- Texto invertido sobre fundos escuros: `v('color.text.inverted')`
- Texto secundário ou apoio:
  - preferir `v('color.gray')`
  - ou usar `color-mix(...)` derivado de `color.text.inverted` em contextos escuros
- Evitar escalas fixas de cinza (`gray.500`, `gray.700`, `gray.800`) em texto de apoio quando a intenção for apenas contraste secundário. Em troca de tema, isso costuma quebrar antes do token semântico.

### Componentes Daredash
- Card customizado:
  - `--dd-card-background-color`
  - `--dd-card-border-color`
  - `--dd-card-color`
  - `--dd-card-box-shadow`
- Sidebar:
  - `--dd-sidebar-column-size`
- Avatar:
  - `--dd-avatar-background-color`

## O que evitar
- Tokens não confirmados no Daredash, como `color.text.soft` e `color.text.muted`.
- Tokens de borda não confirmados, como `color.border.standard` e `color.border.subtle`.
- Tokens concretos demais para layout, como `dark-gray`, quando a intenção correta é “texto secundário”.
- Hexadecimal em páginas e componentes do app.
- `white`, `black` e `rgba(...)` hardcoded para resolver contraste de tema.
- Aliases inconsistentes, como misturar `var(--dd-color-gray)` com `v('color.gray')` no app sem necessidade. Preferir `v()` no CSS da aplicação.

## Exceções aceitas
- HTML de e-mail pode usar cores inline por limitação do canal e compatibilidade entre clientes.

## Checklist para revisão
- O componente muda corretamente quando `data-theme` troca?
- Existe hexa ou `rgba(...)` evitável?
- O fundo usa token de superfície?
- A borda usa token padrão ou token do componente?
- O texto usa token válido e existente?
- O hover/focus deriva de token em vez de cor fixa?
- O texto secundário realmente precisa de uma escala específica ou `color.gray` já resolve melhor entre temas?
