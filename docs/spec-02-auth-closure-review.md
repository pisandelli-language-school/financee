# SPEC 02 Closure Review

## SPEC

- Source spec: `docs/specs/domains/02-auth-usuarios-permissoes-auditoria.spec.md`
- Review workflow: `financee/docs/spec-closure-review.md`

## Verdict

`Implemented`

## Summary

The Auth, Usuários, Permissões e Auditoria module is implemented and operational in code:

- Google Workspace gating is enforced through the same identity rules used in ClassTime
- internal RBAC is seeded and enforced server-side
- Usuários, Permissões e Auditoria are exposed under `Configurações`
- audit logs support filtered listing and entry-level investigation
- user preferences now persist the sidebar collapsed state
- lightweight client cache reduces repeated bootstrap/auth requests

## Scope Decisions Accepted For This MVP

### 1. Custom role creation/editing is intentionally out of scope

Severity: accepted

The original service list mentioned:

- `createRole()`
- `updateRole()`

The delivered MVP manages only the seeded system roles and allows editing their permission matrix.

This choice is now documented directly in the spec to avoid ambiguity in future passes.

### 2. Audit investigation is implemented as list + detail, not entity timeline aggregation

Severity: accepted

The original service list mentioned `getAuditTimeline(entityId)`.

The delivered flow now supports:

- filtered audit listing
- severity visualization
- modal detail for each entry
- inspection of `before`, `after` and `metadata`

This satisfies the current investigation need raised during QA. A future aggregated timeline per entity can still be added without invalidating the current delivery.

### 3. User preferences are intentionally narrow in the first cut

Severity: accepted

The spec asked for persisted user preferences and a `useUserPreferencesStore`.

The delivered MVP now persists:

- sidebar collapsed / expanded state

This creates the persistence path without inventing preference fields prematurely.

## Findings Resolved During Closure

### 1. Audit screen previously stopped at list + filters

Severity: medium

The screen now exposes an explicit detail action per row and a modal that shows:

- event summary
- actor
- timestamp
- entity reference
- metadata
- before/after payloads

### 2. Preferences existed in the model but were not actually used

Severity: medium

The review found `User.preferences` already modeled but not wired into:

- auth payload
- client state
- UI persistence

This pass connected the full path and introduced a dedicated preferences store.

### 3. The spec text was broader than the delivered MVP in a few places

Severity: low

The spec was updated to record the agreed scope choices so future MAWA implementations do not reopen the same ambiguity.

## Confirmed Strengths

- `/login`, `/acesso-negado`, `/configuracoes/usuarios`, `/configuracoes/permissoes`, and `/configuracoes/auditoria` exist.
- Teacher and unknown roles are blocked by fail-safe rules.
- Internal role assignment remains required for Financee access.
- Permission checks are enforced on server endpoints, not only in the UI.
- Audit logs capture structured payloads with `before`, `after`, `metadata`, actor, entity and severity.
- Permission management UI is grouped by module and no longer exposes noisy internal keys to operators.
- The sidebar preference now has a real persistence path rather than being a client-only state.

## Validation

Executed:

```bash
pnpm typecheck
pnpm lint
pnpm test -- --runInBand
```

Result:

- typecheck passed
- lint passed
- `4` test files passed
- `18` tests passed

## Closing Decision

SPEC 02 should currently be treated as:

`Implemented`
