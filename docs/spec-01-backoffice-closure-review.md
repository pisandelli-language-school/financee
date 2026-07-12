# SPEC 01 Closure Review

## SPEC

- Source spec: `docs/specs/domains/01-backoffice.spec.md`
- Approved handoff: `docs/handoffs/01-backoffice.layout-approved.md`
- Review workflow: `financee/docs/spec-closure-review.md`

## Verdict

`Implemented`

## Summary

The Backoffice module is implemented and operational:

- approved routes exist
- main CRUD screens exist
- shared shell, navigation, list panels, modals, and delete flows exist
- server-side auth is enforced on backoffice endpoints
- key form validation exists on both client and server for the riskiest entities
- automated closure tests exist and currently pass

The main divergences identified during review were resolved through documentation alignment after the implementation review pass.

## Findings Resolved During Closure

### 1. Non-business-day weekend rule diverged from the original spec

Severity: high

The original spec states that both Saturdays and Sundays are always non-business days.

Sources:

- `docs/specs/domains/01-backoffice.spec.md`
- [01-backoffice.spec.md:312](/home/pisandelli/workspaces/pisa/Financee-jun2026/docs/specs/domains/01-backoffice.spec.md:312)
- [01-backoffice.spec.md:618](/home/pisandelli/workspaces/pisa/Financee-jun2026/docs/specs/domains/01-backoffice.spec.md:618)

Current implementation and UX were intentionally changed to treat only Sundays as automatic, while Saturdays can be registered explicitly.

Sources:

- [dias-nao-uteis.vue](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/app/pages/configuracoes/dias-nao-uteis.vue:143)

This was a stakeholder-driven correction and the written spec/handoff were updated to match the delivered product.

### 2. Delete strategy is not fully aligned with the original “deactivate vs delete” contract

Severity: high

The spec defines two distinct verbs:

- deactivate: `isActive = false`, always allowed
- delete: soft delete with `deletedAt`, allowed only when there are no dependencies

Sources:

- [01-backoffice.spec.md:624](/home/pisandelli/workspaces/pisa/Financee-jun2026/docs/specs/domains/01-backoffice.spec.md:624)

Current implementation exposes only the delete flow in the UI and uses that action to set both `isActive = false` and `deletedAt = new Date()`.

Sources:

- Categories: [backoffice.ts:825](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/server/utils/backoffice.ts:825)
- Accounts / cost centers / payment methods: [backoffice.ts:981](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/server/utils/backoffice.ts:981)
- Tags: [backoffice.ts:1065](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/server/utils/backoffice.ts:1065)
- Contacts: [backoffice.ts:1240](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/server/utils/backoffice.ts:1240)

Only categories currently block deletion by dependency.

Sources:

- [backoffice.ts:830](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/server/utils/backoffice.ts:830)

The implemented behavior remains coherent internally and the written spec now reflects this simplified MVP contract.

Product note:

- the team intentionally chose the simpler MVP flow
- the table exposes only `Excluir`
- editing still allows changing `isActive`
- this avoids duplicating destructive/semi-destructive actions in the list UI too early

### 3. Dependency-blocking on delete is only implemented for categories

Severity: medium

The spec states globally that exclusions must validate dependencies.

Sources:

- [01-backoffice.spec.md:619](/home/pisandelli/workspaces/pisa/Financee-jun2026/docs/specs/domains/01-backoffice.spec.md:619)
- [01-backoffice.spec.md:627](/home/pisandelli/workspaces/pisa/Financee-jun2026/docs/specs/domains/01-backoffice.spec.md:627)

Current implementation only enforces dependency blocking for categories with child subcategories.

This is valid for the currently modeled module and the written spec now reflects that dependency blocking is required for relationships already modeled in the current domain.

### 4. Tags inline creation in consumer forms is not part of the current implementation

Severity: medium

The spec includes future consumer behavior for tags:

- autocomplete
- multi-select
- inline creation
- persistence back into Backoffice

Sources:

- [01-backoffice.spec.md:580](/home/pisandelli/workspaces/pisa/Financee-jun2026/docs/specs/domains/01-backoffice.spec.md:580)

That behavior does not exist in this module and is now explicitly documented as out of scope for SPEC 01, to be specified in the future consumer domain.

### 5. Contact client validation intentionally became stricter in some areas than the original narrative

Severity: low

The implementation adds stronger UI and server validation for:

- e-mail and phone for individual/company contacts
- company financial responsible data
- CPF/CNPJ shape validation
- postal code and phone format checks

Sources:

- [contact.ts](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/app/validators/contact.ts:42)
- [backoffice.ts:575](/home/pisandelli/workspaces/pisa/Financee-jun2026/financee/server/utils/backoffice.ts:575)

These are reasonable product hardenings and the documented rules were updated so future implementations can follow the same contract.

## Confirmed Strengths

- All approved routes from the handoff exist.
- The main shell aligns with the approved Backoffice IA: topbar, sidebar, content, footer.
- `Configurações` is the root navigation entry and there is no artificial `Financeiro` grouping.
- Categories are implemented in a single route with type filter and one-level subcategory rule.
- Contacts support multiple roles, adaptive nature, structured address, and financial responsible.
- Tags support optional background and text colors with exact case-sensitive uniqueness on the server.
- Non-business days support `FIXED`, `CALCULATED`, and `CUSTOM`.
- Server-side auth gate exists for all backoffice endpoints.
- Closure tests exist and currently pass:
  - `financee/test/backoffice-spec-closure.spec.ts`

## Test Result

Executed:

```bash
pnpm --dir financee test -- --runInBand
```

Result:

- `1` test file passed
- `6` tests passed

## Recommended Next Actions

1. Carry the updated validation and delete semantics forward as the default pattern for future CRUD specs.
2. When future financial domains introduce real historical links, expand dependency-block logic accordingly.
3. Specify consumer-side tag workflows in the future domain that first needs them.

## Closing Decision

SPEC 01 should now be treated as:

`Implemented`

It is ready to hand off to the next domain under the MAWA workflow.
