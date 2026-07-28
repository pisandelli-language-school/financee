---
name: financee-project-conventions
description: "Use when editing any Financee Vue/Nuxt page, layout, shared component, auth shell, dashboard, reports screen, or project-level frontend code. Applies the cross-project conventions for Pug, CSS Modules with module=\"fin\", Daredash tokens/primitives, pt-BR copy quality, DRY decisions, async loading behavior, and when to track accepted follow-up debt as GitHub issues."
---

# Financee Project Conventions

## Overview

This skill holds the conventions that apply across Financee, not only to backoffice screens. Use it before editing pages, layouts, shared components, auth flows, dashboards, reports, and adjacent UI that should stay consistent with the rest of the product.

## Core Rules

1. Prefer `lang="pug"` in Vue SFC templates unless a concrete technical reason prevents it.
2. Use CSS Modules instead of BEM.
3. Prefer `module="fin"` for local styles unless a stronger local reason exists.
4. When using `<style module="fin">`, do not add `useCssModule('fin')` in `<script setup>` unless script logic truly needs the module map.
5. In templates, bind module classes directly with `:class="fin.name"`.
6. Do not create `<style module="fin">` by default. Add local styles only when Daredash primitives or props cannot express the layout cleanly.
7. Avoid helper classes that only restate the default behavior of a component.
8. Prefer Daredash layout and form primitives before custom CSS.
9. Prefer Daredash tokens for spacing, radius, typography, shadows, borders, and colors before inventing raw values.
10. Treat hard-coded visual values as a fallback, not a default.
11. Do not override Daredash internal `--local-*` variables from app code. Prefer documented `--dd-*` tokens and public props.
12. Verify whether a Daredash component forwards `class` before trying to style it directly.
13. Review pt-BR copy for correct accents and spelling before considering the UI work finished.
14. Keep repeated layout and styling patterns DRY. If the same shell or spacing rule repeats, stop and evaluate whether it belongs in a shared component.
15. Prefer field-native labels over external label wrappers when the field API already supports `label`.
16. For required fields, use the field-level `required` attribute and let Daredash own the required marker.
17. In `vee-validate` forms, prefer `dd-form-*` wrappers for simple fields and use lower-level primitives only when masks, nested updates, async lookups, or special event handling truly require direct control.
18. When validation rules grow beyond small inline checks, move them into `app/validators/*`.
19. Keep reusable formatters and masks in shared utils such as `app/utils/contactFormatters.ts` or `app/utils/number-input.ts`.
20. Prefer opening the final shell first and rendering loading inside it rather than delaying the open interaction.
21. If a skeleton is needed, keep it in the same structural footprint as the final component to avoid layout jumps.
22. During async or gated rendering, prefer keeping the information architecture stable instead of reflowing the whole screen after hydration.
23. Before substantial Daredash-specific work, read `https://raw.githubusercontent.com/pisandelli/daredash/refs/heads/main/llms.txt`.
24. When a real limitation or deferred improvement is accepted, register it as a GitHub issue in the repo that owns the fix instead of leaving it only in prose.

## Workflow

1. Read the target file and identify whether the problem is global UI, domain UI, validation, layout, or data-loading related.
2. Reuse the current Daredash structure first; customize only after confirming the design system cannot express the need directly.
3. Remove unnecessary wrappers before adding new CSS.
4. Re-check whether every local class still earns its place after layout cleanup.
5. Replace raw spacing, radius, color, and typography values with existing Daredash tokens whenever a matching token exists.
6. If the same rule or shell appears in multiple places, decide whether it belongs in a shared component or shared utility.
7. Run typecheck after structural edits.
8. When the work leaves a real product or design-system caveat, convert that caveat into a tracked issue before considering the work wrapped.

## Issue Tracking Rule

- Financee product debt goes to `pisandelli-language-school/financee`.
- Daredash design-system debt goes to `pisandelli/daredash`.
- Closure docs explain the caveat; GitHub issues track the execution.

## References

- Read `https://raw.githubusercontent.com/pisandelli/daredash/refs/heads/main/llms.txt` before substantial Daredash-specific refactors.
- Use `backoffice-ui-patterns` in addition to this skill when the work is clearly about admin list panels, CRUD modals, row-action menus, or configuration screens.
