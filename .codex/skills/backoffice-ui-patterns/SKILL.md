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
3. When using `<style module="fin">`, do not add `useCssModule('fin')` in `<script setup>` unless script logic truly needs it.
4. In templates, bind module classes directly with `:class="fin.name"` because `module="fin"` already exposes `fin` to the template scope.
5. Prefer `Pug` templates in Vue SFCs for this project. When editing or creating backoffice components and pages, keep template syntax aligned with the established `lang="pug"` convention unless there is a strong technical reason not to.
6. Prefer lean layout trees. Start with one `dd-cluster` or `dd-stack` and only nest another layout component if it adds real structure.
7. On list pages, prefer a toolbar-first card: search, filters, and primary action as siblings in the same cluster when possible.
8. Prefer the shared `BackofficeListPanel` component for backoffice CRUD list pages instead of duplicating the card, toolbar, table, and pagination shell.
9. Prefer `BackofficeRowActions` for the standard edit/delete action cell in tables.
10. Prefer `BackofficeEmptyState` for the standard informational empty state inside backoffice tables.
11. Avoid custom CSS when a Daredash layout or form primitive already expresses the layout cleanly enough.
12. Prefer Daredash tokens for spacing, radius, typography, shadows, borders, and colors before inventing raw values. Reach first for `v('space.*')`, `v('font-size.*')`, `v('line-height.*')`, `v('border-radius.*')`, `v('shadow.*')`, `v('color.*')`, and related tokens.
13. Treat hard-coded visual values as a fallback, not a default. If a Daredash token already expresses the intent, use the token.
14. Review all pt-BR copy for correct accents and spelling before considering a UI edit finished.
15. Prefer the semantics and layout primitives of Daredash first; improvise with custom structure or CSS only when the design system cannot express the requirement cleanly.
16. Before substantial Daredash-specific refactors, read the Daredash guidance file at `https://raw.githubusercontent.com/pisandelli/daredash/refs/heads/main/llms.txt`.
17. Preserve existing Daredash patterns unless they are the source of the layout problem.
18. When repeated modal structure emerges, extract a shared shell for the common chrome and interaction pattern, but keep each domain form responsible for its own fields, layout, and business rules.
19. Keep generic components honest. If a shared component starts accumulating flags, conditional branches, or field sets that belong to one domain only, split out a specific component instead of stretching the generic one further.
20. Prefer framework-native semantics when the contract is already clear. For example, if every card is navigational, prefer a single `NuxtLink` contract over branching between multiple root elements.
21. Align TypeScript contracts with actual usage. If the UI assumes a property is always present, reflect that in the type instead of relying on defensive branching.
22. When form validation starts accumulating conditional business rules, move the schema and rule helpers out of the component into `app/validators/*` rather than leaving large `if` trees inside the Vue file.
23. Reusable contact masks and formatters such as phone, CPF, CNPJ, document, and CEP should live in `app/utils/contactFormatters.ts` instead of being redefined inside components.
24. Keep repeated layout and style patterns DRY. If multiple pages share the same outer stack, spacing rule, toolbar shell, or panel structure, prefer a shared component or higher-level wrapper only when it adds real behavior or removes meaningful duplication.
25. Avoid repeating raw spacing values across pages. If the same gap appears in more than one screen, centralize it and express it with Daredash tokens.
26. Do not create `<style module="fin">` by default. Add a local style block only when the page truly needs local styling that Daredash primitives or component props cannot already express.
27. Do not add helper classes such as `fin.field` or `fin.search` unless they solve a concrete layout need. If the layout is already correct without them, omit the class entirely.
28. Before calling a spec complete, run a formal closure review against the spec, the approved layout, the schema, the server rules, and the implemented UI.
29. During closure review, verify that critical business rules are enforced on the server, not only in the form layer.
30. Add focused automated tests for closure-review findings when the rule is critical, conditional, or easy to regress.
31. End every closure review with an explicit verdict: `Implemented`, `Implemented with caveats`, `Not implemented`, or `Divergent from spec`.
32. In app-level layout work, prefer composing the documented Daredash primitives such as `dd-layout`, `dd-sidebar`, `dd-box`, `dd-stack`, and `dd-menu` directly instead of recreating layout behavior with extra wrappers and custom CSS.
33. When customizing a Daredash layout primitive, change the exposed CSS variables or supported props first. Do not fight the component with parallel width, spacing, or positioning rules unless the primitive truly cannot express the need.
34. If a Daredash component exposes controlled state and also has internal behavior, keep both paths aligned. Avoid external toggles that mutate only app state while bypassing the component's own API.
35. For collapse and expand interactions, animate the property that actually changes the layout. Do not add broad transitions blindly; target the real driver such as `flex-basis`, `inline-size`, or tokenized padding.
36. Be careful with selector cleverness in CSS Modules. If a state class should affect the root component, prefer a plain class like `.collapsedState` over fragile selectors such as `:first-child` that may miss the rendered DOM structure.
37. Prefer feeding submenu structure into `dd-menu` through its `children` contract instead of rendering parallel navigation trees outside the component.
38. When a screen depends on small, stable reference data such as roles, permission catalogs, or user preferences, prefer a lightweight client cache or prefetch instead of repeated refetches on every interaction.
39. If you cache auth-adjacent data on the client, pair it with explicit invalidation on sign-out and on mutations that change the current user's effective access or preferences.
40. For async modal flows, prefer opening the modal immediately and rendering a clear in-modal loading state instead of delaying the open transition until every dependency has loaded.
41. If loading placeholders are needed for gated navigation or cards, keep the skeleton in the same structural footprint as the final component to avoid layout jumps.
42. When progressive authorization reveals extra navigation items after bootstrap, prefer keeping the base IA stable and appending/loading the gated items in place instead of reflowing the entire grid or menu.
43. Persist user preferences through a dedicated store and a narrow server contract. Start with the smallest real preference, hydrate it from the authenticated user payload, and expand only when a new preference has clear product value.
44. In auth and RBAC flows, prefer reusing an already trusted identity-mapping strategy from a sibling product or proven implementation rather than inventing a parallel mapping with slightly different rules.
45. When a spec's service list is broader than the agreed MVP, document the accepted scope decision in the spec or closure review instead of letting the code silently diverge from the written contract.
46. Prefer field-native labels over external label wrappers. If `dd-input`, `dd-select`, `dd-textarea`, or a `dd-form-*` wrapper can receive `label`, put the label on the field itself so spacing, invalid state, and alignment stay owned by Daredash.
47. For required fields, use the field-level `required` attribute and let Daredash own the required marker. Do not recreate red asterisks with local `dd-form-label` markup unless there is no field-level API for that interaction yet.
48. In forms powered by `vee-validate`, prefer `dd-form-input`, `dd-form-select`, `dd-form-textarea`, and other `dd-form-*` wrappers for simple fields. Use primitive fields only when masks, lookups, nested updates, or custom event handling genuinely require direct control.

## Workflow

1. Read the target page/component and identify unnecessary wrappers, class naming drift, and toolbar inconsistencies.
2. Preserve or convert Vue templates to `lang="pug"` when working in backoffice files, unless a concrete technical constraint prevents it.
3. Convert local styles to `module="fin"` and replace template class usage accordingly.
3.1. If, after simplification, no local styles are needed, remove the `<style module="fin">` block and any related `fin.*` bindings instead of keeping an empty styling layer.
4. Prefer Daredash primitives such as `dd-grid`, `dd-stack`, and `dd-cluster` before introducing custom layout CSS.
5. Collapse layout wrappers where a single `dd-cluster` or `dd-stack` can express the same intent.
6. If the screen is a CRUD list page, start from `BackofficeListPanel` and customize it via `toolbar`, `notice`, and table slots.
7. Use `BackofficeRowActions` unless the row needs non-standard actions.
8. Use `BackofficeEmptyState` unless the empty state needs richer custom content.
9. Make the toolbar the top control surface inside the card.
10. Reuse the project's current interaction patterns for pagination, empty states, row actions, and primary create actions.
11. Replace raw spacing, radius, typography, shadow, and color values with existing Daredash tokens whenever a matching token already exists.
11.1. Re-check whether every local class still earns its place after layout cleanup; remove classes that only restate the default behavior of the component.
12. If a shared component is starting to encode one feature's special-case layout or fields, stop and decide whether it should become a shell plus domain-specific implementations.
13. Review visible strings for natural pt-BR spelling and accentuation.
14. Before a substantial Daredash-specific refactor, consult `https://raw.githubusercontent.com/pisandelli/daredash/refs/heads/main/llms.txt`.
15. Run typecheck after structural edits.
16. If a form uses `vee-validate` with non-trivial domain rules, keep the Vue component focused on rendering and field wiring while the schema and rule helpers live in `app/validators/*`.
17. If a contact-oriented form needs masks or string formatting, reuse `app/utils/contactFormatters.ts` before creating new local helpers.
18. If you touch multiple backoffice pages and find the same wrapper or spacing rule repeated, stop and evaluate whether it belongs in a shared backoffice component first. If the wrapper becomes a pass-through with no real behavior, prefer the simpler direct markup.
19. At the end of a module/spec implementation, run the checklist in `docs/spec-closure-review.md` and treat it as the repeatable final-pass workflow.
20. In layout refactors, inspect the rendered contract of Daredash primitives before styling around them. Verify which element owns width, collapse state, scrolling, and spacing before writing CSS.
21. If a custom button controls a Daredash widget such as `dd-menu`, prefer calling the widget's exposed methods or using its official `v-model` flow rather than duplicating its behavior outside.
22. When a layout bug appears asymmetric, compare the opening path and the closing path separately. Smooth close and rough open usually means the transition is attached to the wrong property or only one state path is being synchronized.
23. For modals that depend on auxiliary data, decide deliberately between prefetch and inline loading: prefetch when the dataset is small and reused often, inline loading when freshness matters more than instant open.
24. For protected pages and app shells, keep the authenticated payload as the source of truth for permissions and preferences, and mirror that contract in the frontend types instead of inferring fields ad hoc.
25. When adding client cache around auth or admin data, cache only data with low volatility and short dependency chains. Keep lists with active filters server-driven unless there is a concrete performance reason to do more.
26. During closure review, explicitly separate implemented investigation capability from future “smart” or aggregated flows. A searchable list plus per-entry detail may satisfy the current spec intent even if a richer timeline is postponed.
27. When refactoring form fields, remove standalone `dd-form-label` + field stacks if the target field supports `label`; add `required` on the field instead of rendering a local required marker.

## Toolbar Pattern

- Put controls and the create action in the same toolbar row when the content fits comfortably.
- Avoid artificial wrapper groups like a `dd-cluster` inside another `dd-cluster` only to hold filters.
- Apply field sizing directly on the controls with module classes such as `fin.field` or `fin.search`.
- Keep the create button in the toolbar unless there is a strong product reason to isolate it.

## CSS Module Pattern

```vue
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

## Token Guidance

- Prefer semantic Daredash tokens over raw CSS values.
- Use tokenized spacing, radius, typography, and shadow scales to keep components visually related to the rest of the system.
- Before introducing a literal like `16px`, `12px`, `#e3e4e8`, or a custom shadow, check whether a Daredash token already expresses that role.
- When custom CSS is still necessary, combine as little raw styling as possible with Daredash tokens instead of building a parallel design language.

## Component Boundaries

- Shared components should capture a repeated pattern, not a specific screen's field set.
- A shared modal shell is a good abstraction when multiple forms share the same open/close, title, alert, and footer behavior.
- A domain form should stay domain-owned once its field composition, validation, or layout starts diverging from the other forms.
- Prefer removing dead branches and optional behavior when the current product contract is simpler than the component API suggests.
- Shared page-level shells such as standard CRUD chrome should be centralized once they repeat across screens, but avoid extracting pass-through wrappers that do not carry meaningful behavior or constraints.

## Layout Lessons

- App layout refactors should stay close to the Daredash docs, especially for `dd-layout`, `dd-sidebar`, and `dd-menu`.
- Sidebar width should be treated as a layout token or CSS variable concern, not as an ad hoc hard-coded width on child elements.
- Menu collapse is not only visual. Treat it as interaction state with route persistence and reopening behavior in mind.
- Before declaring a collapse bug fixed, test four flows: collapse, expand, navigate while collapsed, and reopen after navigation.

## Async UI Lessons

- Open the shell first, load the heavy or auxiliary content second, and keep the loading feedback inside the final interaction surface.
- Prefer native `dd-skeleton` and `dd-loading` before inventing custom loaders.
- A skeleton should mimic the final information architecture closely enough that the user does not perceive a second layout pass when data arrives.
- If a list or dashboard mixes always-visible cards with permission-gated cards, avoid pushing the whole grid around while access resolves; preserve the final placement as much as possible.

## Auth and Preference Lessons

- Authenticated UI contracts should expose both permissions and user preferences when the shell depends on them.
- When the current user payload changes, keep the shared auth state, local preference store, and any client cache in sync together.
- Preference persistence should feel like part of the shell, not a special-case API call scattered through random components.
- Server-side permission changes that affect the current operator should invalidate the current-user cache, not only the edited record or list.

## References

Read [references/ui-patterns.md](references/ui-patterns.md) when you need concrete examples, do/don't guidance, or the current backoffice conventions snapshot.
Read `https://raw.githubusercontent.com/pisandelli/daredash/refs/heads/main/llms.txt` before substantial Daredash-specific refactors.
Read [docs/spec-closure-review.md](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/docs/spec-closure-review.md) when performing the end-of-spec review pass.
