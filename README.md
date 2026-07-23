# Financee

A financial operations system for Pisandelli Language School, focused on real-world finance workflows: entries, contracts, reporting, automations, and external integrations, without turning into a generic school ERP.

The product is designed to be the financial source of truth for the operation. The financial core is the product; contracts, permissions, jobs, and integrations exist as pragmatic, decoupled layers around it.

## What the system covers

- Backoffice configuration for contacts, categories, accounts and wallets, cost centers, tags, payment methods, and non-business days.
- Financial entries with income, expenses, transfers, recurrences, installments, and operational statuses.
- Lightweight commercial contracts with chained renewals and manual entry generation with editable preview.
- Reports and dashboards covering cash basis, competence basis, management P&L, delinquency, and projected balance.
- RBAC with Google Workspace + Supabase authentication, granular permissions, and structured audit trails.
- Notifications, automations, and configurable jobs to reduce manual operation.
- A read-only integration API prepared for Classtime and future external consumers.

## Product principles

- The system is not a traditional school product: it does not model classes, semesters, or academic calendars in the core.
- `Settings` is a root navigation module, with no artificial grouping such as `Finance -> Settings`.
- Monetary values must use `Decimal(14,2)`; `Float` in money flows is a defect.
- Due date adjustments always move forward in the calendar, respecting Sundays and configured non-business days.
- The MVP is single-tenant and does not include full CRM features, Brazilian electronic invoicing, or partial payments.

## Modules defined in the specs

- `Backoffice`
- `Financial Entries`
- `Contracts`
- `Reports, Dashboard, and Cash Flow`
- `Auth, Users, Permissions, and Audit`
- `Notifications, Alerts, and Automation`
- `Jobs, Scheduling, and Background Processing`
- `Integration Architecture`

## Stack

- `Nuxt 4`
- `Vue 3`
- `Pinia`
- `Supabase Auth`
- `MySQL`
- `Prisma`
- `pnpm`
- `Pug`
- `@pisandelli/daredash`

## Local development

```bash
pnpm install
pnpm dev
```

The app runs locally at `http://localhost:3000`.

## Useful scripts

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm typecheck
pnpm test
pnpm prisma:generate
pnpm prisma:validate
pnpm prisma:db:push
pnpm prisma:migrate
pnpm seed
pnpm db:setup
```

## Prisma workflow

This repository uses `Supabase` for authentication and `MySQL` for application data. Prisma schema sync in development is based on `prisma db push`.

- `DATABASE_URL`: MySQL connection used by both runtime and Prisma CLI commands
- `pnpm prisma:migrate`: currently mapped to `prisma db push`
- versioned SQL migrations are still kept in `prisma/migrations/` as architectural reference, but the active development workflow is schema-first with `db push`
- `pnpm seed`: resets local QA data and populates roles, permissions, backoffice records and sample financial entries
- `pnpm db:setup`: generates Prisma Client, syncs the schema and runs the local QA seed

## Product references

- High-level briefing: `mawa/specs/briefing/project-briefing.md`
- System map: `docs/specs/00-SYSTEM_MAP.md`
- Specs index: `docs/specs/01-SPECS_INDEX.md`
- Module specs: `mawa/specs/modules/`

## Next steps

- Implement the prioritized modules based on the approved specs.
- Connect the remote repository and establish the versioning workflow.
- Evolve the integration API and analytics modules according to the roadmap.
