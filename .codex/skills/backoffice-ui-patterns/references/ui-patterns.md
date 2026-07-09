# Financee Backoffice UI Patterns

## Scope

This reference applies to Financee backoffice pages and shared admin components, especially under:

- `app/pages/configuracoes`
- `app/components/backoffice`

## Naming

- Prefer CSS Modules with `module="fin"`
- With `<style module="fin">`, use `fin.*` directly in the template and avoid `useCssModule('fin')` unless script logic actually needs access to the module map
- Do not add a `module="fin"` block unless the file really needs local styles
- Prefer short semantic names like `page`, `toolbar`, `field`, `search`, `action`, `pagination`, `subcopy`
- Do not introduce BEM names such as `toolbar__filters` or `page-header__actions`

## Layout

- Prefer one root `dd-stack` for the page and one toolbar `dd-cluster` inside the list card
- Add nested `dd-stack` or `dd-cluster` only when the nested group has meaning on its own
- If removing a wrapper keeps alignment intact, remove it
- Prefer Daredash primitives like `dd-grid` before writing custom `display: grid`
- Do not add CSS for layout if the same result is already available through Daredash component props or primitives
- If removing a local class keeps the layout correct, remove the class and the style rule instead of preserving it “just in case”
- When custom CSS is still necessary, keep it narrow and complementary to the design system rather than replacing it

## List Pages

Expected flow:

1. Page header
2. `BackofficeListPanel`
3. Toolbar slot
4. Table slots
5. Pagination handled by the panel

Shared component rule:

- Prefer `app/components/backoffice/BackofficeListPanel.vue` for CRUD list pages
- Prefer `app/components/backoffice/BackofficeRowActions.vue` for the default edit/delete action column
- Prefer `app/components/backoffice/BackofficeEmptyState.vue` for standard informative empty states
- Feed it with props for columns, data, loading, error state, and pagination
- Use `#toolbar` for search, filters, and the primary create action
- Use `#notice` only when the page needs an alert above the toolbar
- Keep cell and empty-state customization in table slots like `#cell-status` and `#empty`

Toolbar expectations:

- Search and filters stay close to the create action
- Primary action lives in the same toolbar row when possible
- Width behavior should come from per-field module classes, not extra wrapper clusters
- But if the default field sizing is already adequate, prefer no extra class over a redundant `fin.field`

## Copy

- Review pt-BR strings for accentuation and spelling before finishing UI work
- Avoid shipping placeholder text like `Informacoes`, `Endereco`, or `Numero` when `Informações`, `Endereço`, and `Número` are intended

## Daredash Guidance

- If the installed Daredash package includes `llm.txt`, `llms.txt`, or equivalent guidance docs, read them before substantial component-level refactors
- When Daredash behavior feels surprising, inspect the package implementation before compensating with workaround CSS

## Validation

- Prefer `app/validators/*` for non-trivial form schemas instead of embedding large validation blocks inside Vue components
- Keep conditional business rules in small helper functions such as `validateCompanyRules` or `validateSharedRequiredFields`
- Let the component consume the schema and focus on rendering, formatting, and event wiring

## Shared Formatters

- Reuse `app/utils/contactFormatters.ts` for contact masks and formatting
- Keep helpers like `formatPhone`, `formatCpf`, `formatCnpj`, `formatPostalCode`, `formatDocument`, `onlyDigits`, and `sanitizeCnpj` out of Vue components when they may be reused

## Actions

For row icon actions, keep the current visual pattern:

```css
.action {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #73768c;
  cursor: pointer;
}
```

## Example

Prefer this:

```pug
dd-cluster(end :class="fin.toolbar")
  dd-input(:class="fin.field")
  dd-select(:class="fin.field")
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
