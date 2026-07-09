# Spec Closure Review Workflow

Use this workflow at the end of each implemented spec before calling it `100% complete`.

## Goal

Create a repeatable final pass that checks:

- spec adherence
- regression status
- UI consistency
- schema/API/domain alignment
- remaining technical risks

## Inputs

- the approved module spec
- the approved layout handoff, when it exists
- the implemented code for the module
- QA notes and manual regression notes

## Output

One of these final statuses:

- `Implemented`
- `Implemented with caveats`
- `Not implemented`
- `Divergent from spec`

## Review Steps

1. Read the module spec again from top to bottom.
2. Extract explicit business rules, required routes, required CRUD flows, and non-obvious constraints.
3. Cross-check schema, server utilities, API handlers, stores, pages, and shared components against those rules.
4. Separate findings into:
   - missing implementation
   - implemented but divergent
   - implemented with risk
   - intentionally out of scope
5. Confirm whether QA regression already covered the user-facing flows.
6. Confirm whether the UI matches the approved behavior and the project conventions.
7. Verify persistence rules:
   - active vs inactive semantics
   - delete strategy
   - uniqueness rules
   - dependency blocking
8. Verify validation rules on both layers:
   - client form validation
   - server-side normalization/guard rails
9. Check whether any rule is enforced only in the UI and can still be bypassed through the API.
10. Add or update automated tests for the highest-risk rules discovered in the review.

## Minimum Checklist

- Routes from the spec exist.
- CRUD flows from the spec exist.
- Required fields and conditional fields match the spec.
- Business rules are enforced on the server, not only on the client.
- Deletion behavior matches the spec.
- Status/activation behavior matches the spec.
- Dependency blocking matches the spec.
- List filters, pagination, and empty states work.
- Shared UI patterns follow the project skill.
- The final verdict is explicit and justified.

## Test Guidance

Prefer automated tests for:

- conditional validation rules
- uniqueness rules
- soft delete / dependency block behavior
- payload normalization with business constraints

When the Vitest/Nuxt test harness is unstable, still write the tests and record the bootstrap issue separately from the spec verdict.

## Closing Rule

Do not call a spec `100% implemented` until all critical findings are either:

- fixed, or
- explicitly accepted by the stakeholder as a known caveat.
