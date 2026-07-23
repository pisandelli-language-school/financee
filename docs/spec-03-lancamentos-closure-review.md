# SPEC 03 Closure Review

## SPEC

- Source spec: `docs/specs/domains/03-lancamentos.spec.md`
- Review workflow: `financee/docs/spec-closure-review.md`

## Verdict

`Implemented with caveats`

## Summary

The Lançamentos module is implemented and operational in code:

- financial entries support `INCOME`, `EXPENSE`, and `TRANSFER`
- creation and editing happen through modal flows
- payment, reopen, cancel, and delete actions are available
- recurrence and installment rules are implemented
- transfer consistency rules are enforced on the server
- effective due date respects the current business calendar rule where only Sundays are automatically non-business days, plus configured holidays
- the listing supports monthly navigation, summary cards, filters, pagination, and quick actions
- account identity is visually integrated with the redesigned `contas e carteiras` flow

## Scope Decisions Accepted For This Delivery

### 1. Modal flows replaced dedicated create/detail pages

Severity: accepted

The original spec listed:

- `/lancamentos/novo`
- `/lancamentos/:id`

The delivered UX uses modal flows instead:

- create by modal
- edit by modal
- detail inspection through inline actions / modal-oriented interactions

This was an explicit product decision during implementation to avoid unnecessary back-and-forth navigation and stay aligned with the backoffice interaction pattern already established in the project.

### 2. Account cards still display `Saldo inicial`, not calculated `Saldo atual`

Severity: accepted

The redesigned account cards now show the persisted initial balance only.

This means:

- the UI is honest about the current data source
- the displayed amount does not yet react to posted entries

The future move to `Saldo atual` depends on a consolidated rule for:

- paid entries
- transfers
- reopening/cancel transitions
- future reconciliation logic

This decision is documented in:

- `financee/docs/spec-03-accounts-redesign-note.md`

## Findings Resolved During Closure

### 1. Launchments filters were initially incomplete versus the spec

Severity: medium

The spec required filters for:

- period
- status
- type
- category
- account
- contact
- payment method
- tags

The delivered screen now exposes those filters in the compact popover flow.

### 2. Transfer handling previously behaved like a special “type” without full status parity

Severity: medium

The review pass aligned transfers with the main list behavior so transfer entries can participate in the same operational status flow instead of remaining visually stuck in an “open” state with no useful action.

### 3. Accounts and wallets outgrew the simple catalog treatment

Severity: medium

The module now uses:

- card-based account listing
- persisted financial institutions
- institution-aware account creation
- account avatars/logos in lançamentos

This better matches the operational model required by the screen and removes the mismatch between financial entries and account identity.

## Confirmed Strengths

- `/lancamentos` exists and is protected.
- Creation, editing, payment, reopen, cancel, and deletion flows exist.
- Category is enforced server-side for non-transfer entries.
- Transfer entries do not require category and are validated server-side.
- Origin and target accounts for transfers must differ.
- Contact compatibility is enforced server-side according to entry direction.
- Tags reuse the global backoffice registry and can be linked to entries.
- Soft delete and cancel remain distinct behaviors.
- Effective due date is derived server-side from the business-calendar rule.
- Visual QA for the current screen and account redesign was approved by the stakeholder.

## Remaining Caveats

### 1. The route map diverges from the original written spec

Severity: low

The written spec expected dedicated `/novo` and `/:id` routes, but the accepted product direction moved those flows into modals.

This is not an accidental gap; it is an intentional divergence accepted during implementation.

### 2. The test plan is partially implemented, not fully exhaustive

Severity: low

The spec mentioned broader component and integration coverage. The current automated coverage focuses on the highest-risk business rules:

- financial calendar
- financial entry validation
- transfer/category invariants

This is sufficient for the current closure, but broader component/integration coverage can still be expanded later.

## Validation

Executed on July 23, 2026:

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

SPEC 03 should currently be treated as:

`Implemented with caveats`
