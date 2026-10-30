# AICTE Suraksha

**Security Deposit & FDR Management Portal** — a full-stack prototype for the All India Council for Technical Education (AICTE) Regulation Bureau.

AICTE Suraksha replaces spreadsheet-based tracking of institutional security deposits with a single register for FDR instruments, bank verification, renewal succession, release authorisation, and an immutable audit trail.

> **Demonstration prototype.** Every institution, officer, bank receipt, amount, and document in this repository is synthetic. This is not a Government of India system, not an official AICTE authorisation, and must not be used with real financial or personal data.

![Executive dashboard](docs/screenshots/dashboard-head.png)

## At a glance

- **Next.js 15 App Router**, React 19, TypeScript strict mode
- **PostgreSQL** via Drizzle ORM — local Docker or pooled **Neon**
- Three-role RBAC enforced in server components, queries, and server actions
- Seven required routes plus document, export, health, and scheduled-status APIs
- Realistic seeded register: **12 institutions, 15 users, 43 FDRs, 76 documents, 8 release cases, 138 audit events**
- AES-256-GCM encrypted document vault with authenticated streaming
- Append-only audit log enforced by a PostgreSQL trigger
- Recharts analytics, CSV/JSON exports, printable release authorisation receipts
- **34 Vitest unit tests**, clean `tsc --noEmit`, production build verified

## Route map

| Route | Purpose | Access |
| --- | --- | --- |
| `/` | Redirects to `/dashboard` | Public |
| `/dashboard` | Portfolio value, active/expiring/overdue counts, bank and maturity charts, action centre, recent activity | All roles, scoped by institution for institution admins |
| `/repository` | Dense searchable FDR register with status, verification, state and region filters; CSV/JSON export | All roles, institution-scoped for institution admins |
| `/submit-fdr` | FDR submission with live maturity calculation, drag-and-drop evidence, optional renewal parent | Institution administrators only |
| `/scrutiny/[id]` | Split-screen document preview beside institution/bank particulars; verify, flag discrepancy, add observation or document | All roles; write actions for scrutiny officers, read-only for Bureau Head, own-institution only for institution admins |
| `/renewals` | Succession chains, renewal timeline, 180-day renewal window | All roles, institution-scoped for institution admins |
| `/releases` | Three-stage release approval, eligibility checks, printable authorisation receipt and dispatch reference | All roles with stage-specific actions |
| `/audit` | Immutable event log with action/entity/actor filters and JSON before/after diff viewer | Scrutiny officers and Bureau Head only |

Supporting APIs:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/documents/[id]` | Authenticated, institution-scoped document streaming |
| `GET /api/export/fdrs?format=csv\|json` | Filtered register export with audit logging |
| `GET /api/health` | Database readiness probe |
| `GET /api/cron/refresh-statuses` | Date-derived status refresh; requires `Authorization: Bearer $CRON_SECRET` |

## Roles and demo accounts

The evaluation build intentionally has **no login form**. The portal opens as the Regulation Bureau Head and the top-navigation role switcher exchanges a signed demo identity. Every request still resolves the user from the database and enforces RBAC server-side.

| Role | Demo user | Scope |
| --- | --- | --- |
| `REGULATION_BUREAU_HEAD` | Dr. Rajeshwar S. Chauhan · `head@aicte.gov.in` | Bureau-wide read access; final release approval/rejection; audit access |
| `AICTE_SCRUTINY_OFFICER` | Arjun Mehta · `scrutiny@aicte.gov.in` | Bureau-wide scrutiny; bank verification, discrepancy flagging, release recommendation, audit access |
| `INSTITUTION_ADMIN` | Dr. Kavya Menon · `admin@niet.ac.in` | National Institute of Engineering & Technology only; submit FDRs, upload evidence, request releases |

Additional seeded institution administrators exist for every institution. The role switcher always selects the canonical demo user for the chosen role.

## Workflows

### 1. Submission and bank verification

```
Institution admin                     AICTE scrutiny officer
      |                                        |
      |-- submit FDR + PDF/PNG/JPEG ---------->|
      |   (Zod validation, SHA-256, AES-GCM)   |
      |                                        |-- compare document with declared particulars
      |                                        |-- verify as bank-confirmed
      |                                        |      or flag discrepancy (remark mandatory)
      |<---------------------------------------|
```

- The form validates FDR number, IFSC, positive amount, non-future issue date, and maturity after issue.
- The maturity-days counter updates live and prevents impossible date combinations.
- Each upload is limited to 10 MB, content-sniffed as PDF/PNG/JPEG, hashed with SHA-256, and stored as an AES-256-GCM envelope.
- A renewal successor may reference a predecessor inside the **180-day renewal window**; the parent becomes `RENEWAL_PENDING`.
- Verification records a bank confirmation reference, a JSON snapshot of the authorised particulars, the verifying officer, and a timestamp.

### 2. Renewal succession

Renewals are represented by `fdr_instruments.parent_fdr_id`. The original `fdr_status` enum stays exactly as specified; the UI derives a **Renewed** presentation when a successor exists. Parent records remain visible for audit.

```
FDR-2021-041  (Matured, parent)
      └── renewed by ──>  FDR-2024-119  (Active)
```

Supported presentation:

- Tree/timeline chain with each instrument's status, bank, amount, and maturity
- Chain path label such as `FDR-2021-041 (Matured) → FDR-2024-119 (Active)`
- 180-day renewal-window table with institution-scoped "Renew" actions
- Parents with successors are excluded from release eligibility

### 3. Release authorisation

```
Institution          Scrutiny officer           Regulation Bureau Head
    |                       |                              |
    |-- request release --->|                              |
    |   (bank-confirmed,    |-- recommend / reject ------->|
    |    no successor,      |   (note required to reject)  |-- approve / reject
    |    no active case)    |                              |   (note required to reject)
    |                       |                              |-- dispatch reference + receipt
```

Release eligibility requires all of the following:

- `verification_status = BANK_CONFIRMED`
- instrument is not `RELEASED`
- no successor instrument exists
- no active (`PENDING_SCRUTINY` or `RECOMMENDED_BY_OFFICER`) release case

Approval generates `AICTE/REL/{FY}/{8 hex}` (for example `AICTE/REL/2026-27/56F893DC`), marks the FDR `RELEASED`, writes the dispatch reference to the audit log, and renders a printable authorisation receipt.

### Status semantics

| Status | Meaning |
| --- | --- |
| `ACTIVE` | More than 90 days to maturity |
| `EXPIRING_SOON` | 0–90 days to maturity |
| `MATURED` | Maturity date has passed |
| `RENEWAL_PENDING` | A successor has been filed but not yet cleared |
| `RELEASE_REQUESTED` | A release case is active |
| `RELEASED` | Release authorised and receipt issued |
| `DISCREPANCY_FLAGGED` | Bank evidence does not match the declaration |

Institution and bank verification states are separate: `INSTITUTION_SUBMITTED`, `BANK_CONFIRMED`, `DISCREPANCY_FOUND`. Date-derived statuses are recalculated on read and by the scheduled refresh endpoint.

## Architecture

```
Browser
  │  React 19 / App Router / server actions
  ▼
Next.js server components ── Drizzle ORM ── PostgreSQL (Docker) or Neon
  │                                              │
  │                                              └── append-only audit trigger
  ├── AES-256-GCM encrypted document vault (.data/uploads)
  └── authenticated /api/documents/[id] streaming
```

### Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15.5 App Router, React 19 |
| Language | TypeScript 5.9, strict mode |
| Styling | Tailwind CSS 3, shadcn-style Radix primitives |
| Forms and validation | React Hook Form + Zod 4 (server actions revalidate) |
| Database | PostgreSQL 16, Drizzle ORM 0.45 |
| Drivers | Neon WebSocket Pool for Neon URLs; `pg` Pool locally |
| Charts | Recharts 3 |
| Documents | PDF-lib generated demo documents; AES-256-GCM local vault |
| Tests | Vitest 3 |
| Icons | Lucide React |

### Data model

| Table | Key fields |
| --- | --- |
| `institutions` | `aicte_id`, `name`, `region`, `state`, `institution_type` |
| `users` | `institution_id`, `name`, `email`, `role`, `designation`, `is_active` |
| `fdr_instruments` | institution, FDR number, bank/branch/IFSC, amount, issue/maturity dates, status, verification, `parent_fdr_id`, verification snapshot, `submitted_by`, `verified_by` |
| `fdr_documents` | FDR, document type, file URL/name, MIME, size, SHA-256, storage key, uploader |
| `release_requests` | FDR, requester, reason, status, officer notes, scrutiny/approval actors and timestamps, rejection reason, dispatch reference |
| `audit_logs` | entity type/id, actor, action, JSON details (before/after), timestamp |

Indexes cover institution, status, maturity, parent, release state, audit entity/actor/action/date. CHECK constraints keep deposits positive; partial unique indexes prevent duplicate active release cases and duplicate dispatch references.

### Seeded demo scenarios

The seed is date-relative, so the portal always has live, expiring, overdue, verified, discrepancy, renewal, and release scenarios.

| Record | Use it to demonstrate |
| --- | --- |
| `FDR-2024-118` (NIET) | Active, bank-confirmed, split-screen document preview |
| `FDR-2025-067` (NIET) | Expiring soon, inside the 30-day window |
| `FDR-2025-102` (NIET) | Discrepancy flagged with mandatory scrutiny remark |
| `FDR-2021-041 → FDR-2024-119` | Renewal chain: matured parent to active successor |
| `FDR-2025-088` (NIET) | Release case recommended to the Bureau Head |
| `FDR-2023-777` | Approved release with printable receipt and dispatch reference |
| `FDR-2023-333` | Rejected release case |
| `FDR-2022-333`, `FDR-2023-210` | Release cases pending scrutiny |

## Getting started

### Prerequisites

- Node.js 20+ (Node 22 LTS recommended) and npm
- Docker Desktop (for the local PostgreSQL container) or a Neon database
- Chrome, Edge, or Firefox for the PDF preview

### 1. Start PostgreSQL

```bash
docker run --name aicte-fdr-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aicte_fdr \
  -p 5433:5432 \
  -d postgres:16-alpine
```

If the container already exists:

```bash
docker start aicte-fdr-postgres
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Generate the three 32-byte secrets:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Run it three times and fill in `.env.local`:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/aicte_fdr
DATABASE_SSL=false
SESSION_SECRET=<base64 32 bytes>
DOCUMENT_ENCRYPTION_KEY=<base64 32 bytes>
CRON_SECRET=<base64 32 bytes>

# Optional
# APP_URL=http://localhost:3000
# DATABASE_POOL_MAX=5
# DATABASE_DRIVER=neon
```

> Keep `DOCUMENT_ENCRYPTION_KEY` stable. Changing it makes previously stored documents unreadable. In production, load it from a secrets manager, not a committed file.

### 3. Install, migrate, and seed

```bash
npm install
npm run db:setup
```

`db:setup` pushes the Drizzle schema and runs the deterministic demo seed. Re-running it resets the demo data and regenerates the encrypted document vault.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The root redirects to `/dashboard`.

Production check:

```bash
npm run build
npm run start
```

### Using Neon

Point `DATABASE_URL` at the pooled Neon connection string and set SSL as needed:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<endpoint>-pooler.<region>.aws.neon.tech/<database>?sslmode=require
DATABASE_SSL=true
# DATABASE_DRIVER=neon  # optional; auto-detected for neon.tech URLs
```

Then apply and seed from a trusted machine:

```bash
npm run db:push
npm run db:seed
```

The app auto-selects the Neon WebSocket driver for Neon URLs; `pg` is used locally and in CI. Both drivers support Drizzle transactions.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build with type checking |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run all Vitest suites once |
| `npm run db:generate` | Generate SQL migrations with Drizzle Kit |
| `npm run db:push` | Push the schema directly to PostgreSQL |
| `npm run db:migrate` | Apply generated migrations |
| `npm run db:setup` | Push schema with `--force`, then seed |
| `npm run db:reset` | Reset demo data with the same push-and-seed flow |
| `npm run db:seed` | Truncate and re-seed demo data only |
| `npm run db:studio` | Open Drizzle Studio |

## Tests

```bash
npm test
npm run typecheck
npm run build
```

Current coverage: **34 tests across 3 suites**.

- `src/lib/utils.test.ts` — timezone-safe day maths, Indian currency formatting, maturity labels, effective status, CSV escaping, initials
- `src/lib/validation.test.ts` — FDR submission, IFSC, issue/maturity dates, renewal parent UUID, bank verification, discrepancy remarks, release reason, head decision defaults, repository/audit filters
- `src/lib/fdr-status.test.ts` — expiry boundaries, renewal eligibility, 180-day window, financial-year boundaries, dispatch reference format

### Manual acceptance scenarios

| # | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| 1 | Submission validation | As institution admin, open `/submit-fdr`; submit an invalid IFSC and maturity before issue | Field-level errors; no record created |
| 2 | Valid submission | Fill all required fields, attach a PDF, submit | Success toast; record appears in `/repository` as institution-submitted; audit event written |
| 3 | Bank verification | As scrutiny officer, open a pending record and verify with a confirmation reference | Verification becomes bank-confirmed; snapshot and audit diff recorded |
| 4 | Discrepancy | As scrutiny officer, flag a discrepancy with a short remark, then a substantive one | Short remark rejected; substantive remark moves record to discrepancy-flagged |
| 5 | Renewal | As institution admin, open `/renewals` and renew an eligible parent | New FDR with `parent_fdr_id`; chain renders parent → successor; parent is renewal-pending |
| 6 | Release request | As institution admin, request release for an eligible FDR | Case enters pending scrutiny; FDR becomes release-requested |
| 7 | Officer recommendation | As scrutiny officer, recommend or reject the pending case | Status changes to recommended or rejected; note required to reject |
| 8 | Head approval | As Bureau Head, approve the recommended case | FDR becomes released; dispatch reference `AICTE/REL/FY/8HEX`; printable receipt appears |
| 9 | Audit diff | As officer or head, open `/audit`, filter by FDR, inspect an event | Before/after JSON diff; append-only notice |
| 10 | RBAC | Switch roles and open restricted routes | Institution admin is denied `/audit`; institution data stays scoped; head is read-only on scrutiny |

Role switching is in the top navigation. If a page is denied, the portal renders an explicit access-denied panel rather than a redirect loop.

## Security model

### Authentication and session

- Signed HttpOnly cookie (`aicte_portal_session`) using HMAC-SHA256 over the user UUID.
- Constant-time signature comparison.
- `SameSite=Lax`, `Secure` in production, seven-day expiry.
- No credentials or role claims are trusted from the client; the user is reloaded from PostgreSQL on every request.
- Demo-only identity switcher. Replace `getCurrentUser` with AICTE SSO (OIDC/SAML) for production.

### Authorization

- Role checks in server components and every server action, not only in the UI.
- Institution administrators are filtered to their `institution_id` in repository, renewal, release, dashboard, export, and document queries.
- Audit is restricted to scrutiny officers and the Bureau Head.
- Document streaming re-checks the session and the FDR's institution before decrypting.

### Documents

- 10 MB per-file limit; PDF, PNG, or JPEG only.
- Magic-byte content sniffing, not just the declared MIME type.
- SHA-256 fingerprint stored with each document.
- AES-256-GCM envelope (`AICTE1` magic, 12-byte IV, authentication tag) written with mode `0600`.
- Random UUID storage keys; no user-controlled paths.
- Documents served only through an authenticated portal route with `Content-Disposition: inline`.
- `X-Frame-Options: SAMEORIGIN` and CSP `frame-ancestors 'self'` allow the portal's own split-screen preview while blocking external framing.

### Input, export, and audit

- Zod validation on the server for submissions, verification, release decisions, filters, and role switching.
- Drizzle parameterised SQL; no string-built queries.
- CSV export prefixes dangerous cells to mitigate spreadsheet formula injection.
- `audit_logs` has a `BEFORE UPDATE OR DELETE` trigger that raises an exception; the table is append-only at the database level.
- Audit entries store actor, action, entity, timestamp, and optional before/after JSON.
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and same-origin framing headers are set globally.
- `poweredByHeader` is disabled.

### Production hardening checklist

- Replace the demo role switcher with SSO, MFA, session rotation, and revocation.
- Move documents to S3/R2/Vercel Blob with KMS-managed keys and malware scanning.
- Add rate limiting, request-size limits at the edge, and bot protection.
- Use managed PostgreSQL backups, point-in-time recovery, and least-privilege database roles.
- Send audit events to immutable/WORM storage and define retention per AICTE records policy.
- Add email/SMS notifications for expiries and approvals.
- Add HSTS at the reverse proxy and review the CSP for the production asset origins.
- Run dependency and container scanning, and complete an accessibility audit.

## Screens

### Repository and scrutiny

| FDR repository | Split-screen scrutiny |
| --- | --- |
| ![FDR repository](docs/screenshots/repository-head.png) | ![Scrutiny detail](docs/screenshots/scrutiny-officer.png) |

The scrutiny view embeds the encrypted PDF through the authorised document route. The preview is intentionally read-only; evidence changes are audited actions.

### Renewals and release authorisation

| Renewal chains | Authorisation receipt |
| --- | --- |
| ![Renewal chains](docs/screenshots/renewals-head.png) | ![Release receipt](docs/screenshots/release-receipt-head.png) |

### Audit and submission

| Immutable audit trail | JSON diff viewer |
| --- | --- |
| ![Audit trail](docs/screenshots/audit-head.png) | ![Audit diff](docs/screenshots/audit-diff-head.png) |

| Institution submission |
| --- |
| ![Submission form](docs/screenshots/submit-admin.png) |

## Project structure

```text
src/
├── app/
│   ├── (portal)/
│   │   ├── dashboard/          # KPI cards, charts, action centre
│   │   ├── repository/         # searchable register + exports
│   │   ├── submit-fdr/         # institution submission page
│   │   ├── scrutiny/[id]/      # record review and verification
│   │   ├── renewals/           # succession chains and renewal window
│   │   ├── releases/           # three-stage release workflow
│   │   ├── audit/              # filtered immutable event log
│   │   ├── layout.tsx          # portal shell and RBAC identity
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── api/
│   │   ├── documents/[id]/     # authenticated encrypted streaming
│   │   ├── export/fdrs/        # CSV and JSON export
│   │   ├── cron/refresh-statuses/
│   │   └── health/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # redirects to /dashboard
├── components/
│   ├── audit/                  # audit table, filters, JSON diff viewer
│   ├── dashboard/              # Recharts analytics
│   ├── navigation/             # sidebar, header, role switcher
│   ├── releases/               # queue, stepper, receipt
│   ├── renewals/               # recursive renewal tree
│   ├── scrutiny/               # split-pane verification panel
│   ├── submission/             # React Hook Form submission
│   ├── repository/             # filter bar
│   └── ui/                     # shadcn-style Radix primitives
├── db/
│   ├── schema.ts               # tables, enums, relations, JSON types
│   ├── index.ts                # Neon + node-postgres Drizzle facade
│   ├── seed.ts                 # synthetic demo dataset + audit trigger
│   └── seed-documents.ts       # generated PDF evidence
└── lib/
    ├── actions/                # server actions for FDR, release, session
    ├── audit.ts                # audit writer
    ├── constants.ts            # labels, styles, roles, banks, states
    ├── fdr-status.ts           # maturity status and dispatch references
    ├── queries.ts              # scoped read models
    ├── session.ts              # signed demo session and RBAC
    ├── storage.ts              # encrypted local document vault
    ├── utils.ts                # dates, INR, CSV, status helpers
    └── validation.ts           # Zod schemas and upload checks
```

## Deployment notes

- Deploy the Next.js app to a Node.js runtime (Vercel, containers, or a VM). Edge-only runtimes cannot use `pg` or the filesystem-backed vault.
- Set `DATABASE_URL`, `DATABASE_SSL`, `SESSION_SECRET`, `DOCUMENT_ENCRYPTION_KEY`, and `CRON_SECRET` as platform secrets.
- Run `npm run db:push` (or apply generated migrations) and `npm run db:seed` once against the target database. Do not seed a real production register with synthetic records.
- The node-postgres driver works with any managed PostgreSQL. The Neon WebSocket driver is selected automatically for Neon URLs and supports Drizzle transactions.
- Local document storage under `.data/` is **not durable** on serverless platforms. Replace `src/lib/storage.ts` with an object-store adapter before deployment.
- Schedule `GET /api/cron/refresh-statuses` with `Authorization: Bearer $CRON_SECRET`. Vercel Cron can supply this header when `CRON_SECRET` is configured, or use an external scheduler.
- Keep the encryption key stable across deploys; rotating it requires re-encrypting the vault.
- Put the app behind HTTPS and add HSTS at the proxy.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Database connection refused on `127.0.0.1:5433` | Start Docker Desktop, then `docker start aicte-fdr-postgres` |
| “Connect and seed the database” fallback | Confirm `DATABASE_URL`, run `npm run db:push`, then `npm run db:seed` |
| Empty repository or dashboard | Run `npm run db:seed` |
| `SESSION_SECRET` or `DOCUMENT_ENCRYPTION_KEY` error | Fill both base64 32-byte values in `.env.local` |
| Documents fail to open after a config change | The encryption key changed; restore the original key or re-seed |
| Port 5433 already in use | Change the Docker port mapping and `DATABASE_URL` together |
| PDF preview is blank | Use a browser with a PDF viewer; framing headers must permit same-origin preview (`SAMEORIGIN` / `frame-ancestors 'self'`) |
| Want a clean demo | `npm run db:seed` resets records, documents, and audit events |

## Data and disclaimer

All names, institutions, AICTE IDs, bank branches, FDR numbers, amounts, and evidence documents are **fictional and generated for evaluation**. The demo seed creates PDFs that resemble bank receipts but carry no legal validity.

This prototype is provided for evaluation and learning. It has not undergone a government security certification, accessibility audit, or production load test. Do not use it to store real security deposits, bank confirmations, or personal data without a full security, legal, and procurement review.
