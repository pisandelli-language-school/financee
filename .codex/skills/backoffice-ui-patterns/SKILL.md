---
name: backoffice-ui-patterns
description: "Use when editing Financee backoffice Vue/Nuxt screens, shared backoffice UI components, CRUD list panels, admin modals, row-action menus, or configuration screens. Focuses on backoffice-specific UI patterns such as list-panel structure, toolbar composition, table actions, admin modals, and configuration card shells. Pair it with financee-project-conventions for the global project rules."
---

# Backoffice UI Patterns

## Overview

This skill keeps Financee backoffice screens visually and structurally consistent. Use it when creating or refactoring pages under `app/pages/configuracoes`, shared backoffice components, or adjacent admin UI that should follow the same conventions.

Use `financee-project-conventions` together with this skill whenever the edit also touches global project rules such as Pug, CSS Modules, Daredash token usage, pt-BR copy quality, async loading conventions, or issue-tracking discipline.

## Use This Skill When

- You touch `app/pages/configuracoes/**/*.vue`
- You edit shared backoffice components such as headers, cards, modals, filters, table actions, or admin shells
- You need to reorganize a CRUD list page with search, filters, pagination, and a primary create action
- You see toolbar alignment problems, over-nested layout trees, or repeated admin UI shells

## Core Rules

1. Prefer lean layout trees. Start with one `dd-cluster` or `dd-stack` and only nest another layout component if it adds real structure.
2. On list pages, prefer a toolbar-first card: search, filters, and primary action as siblings in the same cluster when possible.
3. Prefer the shared `BackofficeListPanel` component for backoffice CRUD list pages instead of duplicating the card, toolbar, table, and pagination shell.
4. Prefer `BackofficeRowActions` for the standard edit/delete action cell in tables.
5. Prefer `BackofficeEmptyState` for the standard informational empty state inside backoffice tables.
6. Preserve existing Daredash backoffice patterns unless they are the source of the layout problem.
7. When repeated modal structure emerges, extract a shared shell for the common chrome and interaction pattern, but keep each domain form responsible for its own fields, layout, and business rules.
8. Keep generic admin components honest. If a shared component starts accumulating branches or field sets that belong to one domain only, split out a specific component instead of stretching the generic one further.
9. Prefer framework-native semantics when the contract is already clear. For example, if every card is navigational, prefer a single `NuxtLink` contract over branching between multiple root elements.
10. Align TypeScript contracts with actual backoffice usage. If the UI assumes a property is always present, reflect that in the type instead of relying on defensive branching.
11. Before calling a spec complete, run a formal closure review against the spec, the approved layout, the schema, the server rules, and the implemented UI.
12. During closure review, verify that critical business rules are enforced on the server, not only in the form layer.
13. Add focused automated tests for closure-review findings when the rule is critical, conditional, or easy to regress.
14. End every closure review with an explicit verdict: `Implemented`, `Implemented with caveats`, `Not implemented`, or `Divergent from spec`.
15. Default backoffice tables should use the regular Daredash table density. Use compact tables only when the screen genuinely has high information density and the smaller line height still preserves readability.
16. For action menus inside click-triggered popovers, prefer the default button size for menu items. Avoid `tiny` in destructive or high-frequency action lists unless space is critically constrained and the text remains clearly readable.
17. For versioned business entities such as renewals, amendments, or chained records, expose the chain in two places: lightweight context in the list and a full read-only history flow in a modal.
18. Hide future integration hooks from the UI when the current product has a single source of truth, but document clearly in the spec and closure review why those fields still exist in the model.
19. Prefer removing risky lifecycle actions from row-action menus when the same outcome can cause accidental state changes; only expose actions that are operationally safe for that screen.

## Workflow

1. Read the target page/component and identify unnecessary wrappers, class naming drift, and toolbar inconsistencies.
2. If the screen is a CRUD list page, start from `BackofficeListPanel` and customize it via `toolbar`, `notice`, and table slots.
3. Use `BackofficeRowActions` unless the row needs non-standard actions.
4. Use `BackofficeEmptyState` unless the empty state needs richer custom content.
5. Make the toolbar the top control surface inside the card.
6. Reuse the project's current backoffice interaction patterns for pagination, empty states, row actions, and primary create actions.
7. Collapse layout wrappers where a single `dd-cluster` or `dd-stack` can express the same intent.
8. If a shared component is starting to encode one feature's special-case layout or fields, stop and decide whether it should become a shell plus domain-specific implementations.
9. If you touch multiple backoffice pages and find the same wrapper or spacing rule repeated, stop and evaluate whether it belongs in a shared backoffice component first.
10. At the end of a module/spec implementation, run the checklist in `docs/spec-closure-review.md` and treat it as the repeatable final-pass workflow.
11. During closure review, explicitly separate implemented investigation capability from future “smart” or aggregated flows. A searchable list plus per-entry detail may satisfy the current spec intent even if a richer timeline is postponed.
12. When a domain has chained lifecycle states such as original contract, renewal, and current version, reflect that relationship in both backend query shape and UI copy. Do not leave the user to infer the chain from dates alone.
13. When an entity supports explicit generation of downstream records, guard the action with server rules and also remove or disable it in the UI once the downstream records already exist.
14. For async edit actions in lists, treat perceived responsiveness as part of correctness. If users can double-click because the UI looks idle, the loading strategy is incomplete even if the fetch logic works.

## Toolbar Pattern

- Put controls and the create action in the same toolbar row when the content fits comfortably.
- Avoid artificial wrapper groups like a `dd-cluster` inside another `dd-cluster` only to hold filters.
- Apply field sizing directly on the controls with module classes such as `fin.field` or `fin.search`.
- Keep the create button in the toolbar unless there is a strong product reason to isolate it.

## Component Boundaries

- Shared components should capture a repeated pattern, not a specific screen's field set.
- A shared modal shell is a good abstraction when multiple forms share the same open/close, title, alert, and footer behavior.
- A domain form should stay domain-owned once its field composition, validation, or layout starts diverging from the other forms.
- Prefer removing dead branches and optional behavior when the current product contract is simpler than the component API suggests.
- Shared page-level shells such as standard CRUD chrome should be centralized once they repeat across screens, but avoid extracting pass-through wrappers that do not carry meaningful behavior or constraints.

## Audit Patterns

### List + detail is a valid first investigation flow

For MVP audit screens, a searchable list plus per-entry detail modal is often enough:

```pug
template(#cell-actions="{ row }")
  dd-button(
    ghost
    tiny
    icon-only
    icon="lucide:eye"
    aria-label="Ver detalhes da auditoria"
    @click="openDetailModal(row)"
  )

backoffice-audit-detail-modal(
  v-if="detailOpen"
  :open="detailOpen"
  :entry="detailEntry"
  :loading="detailLoading"
  @update:open="detailOpen = $event"
)
```

This is preferable to promising a full timeline UI before the product actually needs it.

### Audit detail should show structure, not noise

Prefer surfacing:

- event
- action
- severity
- entity
- actor
- `before`
- `after`
- `metadata`

Avoid exposing only technical IDs or raw backend keys when a human-readable summary is available.

## Actions

- Prefer `BackofficeRowActions` for the standard edit/delete pair instead of re-styling action cells locally.
- When an action cell grows beyond the default pair, prefer a popover menu over stacking many icons vertically in the table.
- Keep action cells narrow, centered, and consistent across screens.

## Example

Prefer this:

```pug
dd-cluster(end :class="fin.toolbar")
  dd-input(:class="fin.search")
  dd-button(primary) Nova categoria
```

Avoid this when the inner group adds no real meaning:

```pug
dd-cluster.toolbar(between)
  dd-cluster.toolbar__filters
    dd-input
    dd-select
  dd-button(primary) Nova categoria
```

## References

Read [spec-closure-review.md](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/docs/spec-closure-review.md) when performing the end-of-spec review pass.
