---
name: backoffice-ui-patterns
description: "Use when editing Financee backoffice Vue/Nuxt screens, shared backoffice UI components, or list-and-form layouts. Applies the project's UI conventions: CSS Modules with module=\"fin\", no BEM, lean Daredash layout composition, and toolbar-first list pages."
---

# Backoffice UI Patterns

## Overview

This skill keeps Financee backoffice screens visually and structurally consistent. Use it when creating or refactoring pages under `app/pages/configuracoes`, shared backoffice components, or adjacent admin UI that should follow the same conventions.

## Use This Skill When

- You touch `app/pages/configuracoes/**/*.vue`
- You edit shared backoffice components such as headers, cards, drawers, filters, or table actions
- You need to reorganize a list page with search, filters, pagination, and a primary create action
- You see BEM classes, deep wrapper nesting, or toolbar alignment problems in the backoffice

## Core Rules

1. Use CSS Modules, not BEM.
2. Prefer `module="fin"` for local styles unless a stronger local reason exists.
3. In `<script setup>`, expose classes with `const fin = useCssModule('fin')`.
4. In templates, bind module classes with `:class="fin.name"` instead of literal scoped class names.
5. Prefer lean layout trees. Start with one `dd-cluster` or `dd-stack` and only nest another layout component if it adds real structure.
6. On list pages, prefer a toolbar-first card: search, filters, and primary action as siblings in the same cluster when possible.
7. Prefer the shared `BackofficeListPanel` component for backoffice CRUD list pages instead of duplicating the card, toolbar, table, and pagination shell.
8. Prefer `BackofficeRowActions` for the standard edit/delete action cell in tables.
9. Prefer `BackofficeEmptyState` for the standard informational empty state inside backoffice tables.
10. Avoid custom CSS when a Daredash layout or form primitive already expresses the layout cleanly enough.
11. Review all pt-BR copy for correct accents and spelling before considering a UI edit finished.
12. Prefer the semantics and layout primitives of Daredash first; improvise with custom structure or CSS only when the design system cannot express the requirement cleanly.
13. If a Daredash `llm.txt` or equivalent package guidance file is present in the installed module, read it before substantial Daredash-specific refactors.
14. Preserve existing Daredash patterns unless they are the source of the layout problem.
15. When form validation starts accumulating conditional business rules, move the schema and rule helpers out of the component into `app/validators/*` rather than leaving large `if` trees inside the Vue file.
16. Reusable contact masks and formatters such as phone, CPF, CNPJ, document, and CEP should live in `app/utils/contactFormatters.ts` instead of being redefined inside components.

## Workflow

1. Read the target page/component and identify unnecessary wrappers, class naming drift, and toolbar inconsistencies.
2. Convert local styles to `module="fin"` and replace template class usage accordingly.
3. Prefer Daredash primitives such as `dd-grid`, `dd-stack`, and `dd-cluster` before introducing custom layout CSS.
4. Collapse layout wrappers where a single `dd-cluster` or `dd-stack` can express the same intent.
5. If the screen is a CRUD list page, start from `BackofficeListPanel` and customize it via `toolbar`, `notice`, and table slots.
6. Use `BackofficeRowActions` unless the row needs non-standard actions.
7. Use `BackofficeEmptyState` unless the empty state needs richer custom content.
8. Make the toolbar the top control surface inside the card.
9. Reuse the project's current interaction patterns for pagination, empty states, row actions, and primary create actions.
10. Review visible strings for natural pt-BR spelling and accentuation.
11. Run typecheck after structural edits.
12. If a form uses `vee-validate` with non-trivial domain rules, keep the Vue component focused on rendering and field wiring while the schema and rule helpers live in `app/validators/*`.
13. If a contact-oriented form needs masks or string formatting, reuse `app/utils/contactFormatters.ts` before creating new local helpers.

## Toolbar Pattern

- Put controls and the create action in the same toolbar row when the content fits comfortably.
- Avoid artificial wrapper groups like a `dd-cluster` inside another `dd-cluster` only to hold filters.
- Apply field sizing directly on the controls with module classes such as `fin.field` or `fin.search`.
- Keep the create button in the toolbar unless there is a strong product reason to isolate it.

## CSS Module Pattern

```vue
<script setup lang="ts">
const fin = useCssModule('fin')
</script>

<template lang="pug">
dd-cluster(end :class="fin.toolbar")
  dd-input(:class="fin.search")
  dd-button(primary) Nova categoria
</template>

<style module="fin">
.toolbar {
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.search {
  flex: 1 1 260px;
}
</style>
```

## References

Read [references/ui-patterns.md](references/ui-patterns.md) when you need concrete examples, do/don't guidance, or the current backoffice conventions snapshot.
