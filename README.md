# AICTE Suraksha

**Security Deposit & FDR Management Portal** — a full-stack portal for the All India Council for Technical Education (AICTE) Regulation Bureau.

AICTE Suraksha replaces spreadsheet-based tracking of institutional security deposits with a single register for FDR instruments, bank verification, renewal succession, release authorisation, and an immutable audit trail. Access requires an authenticated account, and every action is scoped by role and institution.

![Executive dashboard](docs/screenshots/dashboard-head.png)

## At a glance

- **Next.js 16.4 App Router**, React 19.3, TypeScript 7 strict mode
- **PostgreSQL** via Drizzle ORM — local Docker or pooled **Neon**
- Mandatory email/password sign-in with scrypt password hashes
- Three-role RBAC enforced in server components, queries, and server actions
- Ten portal routes plus document, export, health, and scheduled-status APIs
- Representative seeded register: **12 institutions, 15 users, 43 FDRs, 76 documents, 8 release cases, 138 audit events**
- AES-256-GCM encrypted document vault with authenticated streaming
- Append-only audit log enforced by a PostgreSQL trigger
- Recharts analytics, CSV/JSON exports, printable release authorisation receipts
- **34 Vitest unit tests**, clean `tsc --noEmit`, production build verified

## Sign in

Open `/login` and use one of the seeded accounts below.

| Role | Account | Password |
| --- | --- | --- |
| Regulation Bureau Head | `head@aicte.gov.in` | `Aicte@2026` |
| AICTE Scrutiny Officer | `scrutiny@aicte.gov.in` | `Aicte@2026` |
| Institution Administrator (NIET) | `admin@niet.ac.in` | `Aicte@2026` |

Additional institution administrator accounts are seeded for every institution. The password above applies to all seeded accounts unless `SEED_ACCOUNT_PASSWORD` is set before running the seed.

The sign-in page includes a **Demo access** strip. Selecting Bureau Head, Scrutiny, or Institution fills the seeded email and password, then focuses the **Sign in** button so the walkthrough can continue with one keypress.

Passwords are stored as salted scrypt hashes. The signed session cookie carries only the user identifier; the account and role are reloaded from PostgreSQL on every request.

## Route map

| Route | Purpose | Access |
| --- | --- | --- |
| `/login` | Email/password sign-in with inline validation and redirect guards | Public |
| `/` | Redirects to `/dashboard` | Authenticated |
| `/dashboard` | Portfolio value, active/expiring/overdue counts, bank and maturity charts, action centre, recent activity | All roles, scoped by institution for institution admins |
| `/repository` | Dense searchable FDR register with status, verification, state and region filters; CSV/JSON export | All roles, institution-scoped for institution admins |
| `/submit-fdr` | FDR submission with live maturity calculation, drag-and-drop evidence, optional renewal parent | Institution administrators only |
| `/scrutiny/[id]` | Split-screen document preview beside institution/bank particulars; verify, flag discrepancy, add observation or document | All roles; write actions for scrutiny officers, read-only for Bureau Head, own-institution only for institution admins |
| `/renewals` | Succession chains, renewal timeline, 180-day renewal window | All roles, institution-scoped for institution admins |
| `/releases` | Three-stage release approval, eligibility checks, printable authorisation receipt and dispatch reference | All roles with stage-specific actions |
| `/audit` | Immutable event log with action/entity/actor filters and JSON before/after diff viewer | Scrutiny officers and Bureau Head only |
| `/about` | Portal purpose, module map, lifecycle, roles and authority matrix | All authenticated roles |
| `/help` | Role-based workflow guidance, quick-start destinations, FAQs and keyboard shortcuts | All authenticated roles |
| `/security` | Security posture, control domains, evidence pipeline, session model and assurance matrix | All authenticated roles |

Supporting APIs:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/documents/[id]` | Authenticated, institution-scoped document streaming |
| `GET /api/export/fdrs?format=csv\|json` | Filtered register export with audit logging |
| `GET /api/health` | Database readiness probe |
| `GET /api/cron/refresh-statuses` | Date-derived status refresh; requires `Authorization: Bearer $CRON_SECRET` |

## Roles and authority

| Role | Scope | Key capabilities |
| --- | --- | --- |
| `REGULATION_BUREAU_HEAD` | Bureau-wide read access | Final release approval or rejection; audit access |
| `AICTE_SCRUTINY_OFFICER` | Bureau-wide scrutiny | Bank verification, discrepancy flagging, release recommendation, audit access |
| `INSTITUTION_ADMIN` | Own institution only | Submit FDRs, upload evidence, raise renewal and release requests |

Permissions are checked on the server. Institution administrators are filtered to their `institution_id` in the repository, renewal, release, dashboard, export, and document queries. Audit access is reserved for scrutiny officers and the Bureau Head.

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

Renewals are represented by `fdr_instruments.parent_fdr_id`. The original `fdr_status` enum stays as specified; the UI derives a **Renewed** presentation when a successor exists. Parent records remain visible for audit.

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
| Framework | Next.js 16.4 App Router, React 19.3 |
| Language | TypeScript 7.0, strict mode |
| Styling | Tailwind CSS 4.3, shadcn-style Radix primitives, tw-animate-css |
| Forms and validation | React Hook Form 7 + Zod 4 (server actions revalidate) |
| Database | PostgreSQL 16, Drizzle ORM 0.45, Drizzle Kit 0.31 |
| Drivers | Neon WebSocket Pool for Neon URLs; `pg` Pool locally |
| Charts | Recharts 3.10 |
| Documents | PDF-lib generated evidence; AES-256-GCM local vault |
| Authentication | Email/password, scrypt hashes, signed HttpOnly session cookie |
| Tests | Vitest 5 |
| Icons | Lucide React |

### Data model

| Table | Key fields |
| --- | --- |
| `institutions` | `aicte_id`, `name`, `region`, `state`, `institution_type` |
| `users` | `institution_id`, `name`, `email`, `role`, `designation`, `is_active`, `password_hash` |
| `fdr_instruments` | institution, FDR number, bank/branch/IFSC, amount, issue/maturity dates, status, verification, `parent_fdr_id`, verification snapshot, `submitted_by`, `verified_by` |
| `fdr_documents` | FDR, document type, file URL/name, MIME, size, SHA-256, storage key, uploader |
| `release_requests` | FDR, requester, reason, status, officer notes, scrutiny/approval actors and timestamps, rejection reason, dispatch reference |
| `audit_logs` | entity type/id, actor, action, JSON details (before/after), timestamp |

Indexes cover institution, status, maturity, parent, release state, audit entity/actor/action/date. CHECK constraints keep deposits positive; partial unique indexes prevent duplicate active release cases and duplicate dispatch references.

### Seeded register

The seed is date-relative, so the portal always has live, expiring, overdue, verified, discrepancy, renewal, and release scenarios.

| Record | What it shows |
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

- Node.js 20.9+ (Node 22 LTS recommended) and npm
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
# SEED_ACCOUNT_PASSWORD=Aicte@2026
```

> Keep `DOCUMENT_ENCRYPTION_KEY` stable. Changing it makes previously stored documents unreadable. In production, load it from a secrets manager, not a committed file.

### 3. Install, migrate, and seed

```bash
npm install
npm run db:setup
```

`db:setup` pushes the Drizzle schema and runs the deterministic seed. Re-running it resets registered records and regenerates the encrypted document vault.

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a seeded account. The root redirects to `/login` when there is no active session.

Production check:

```bash
npm run build
npm run start
```

### Using Neon

Point `DATABASE_URL` at the pooled Neon connection string and set SSL as needed:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<endpoint>-pooler.<region>.aws.neon.tech/<database>?sslmode=require&uselibpqcompat=true
DATABASE_SSL=true
# DATABASE_DRIVER=neon  # optional; auto-detected for neon.tech URLs
```

Then apply and seed from a trusted machine:

```bash
npm run db:push
npm run db:seed
```

The app auto-selects the Neon WebSocket driver for Neon URLs; `pg` is used locally and in CI. Both drivers support Drizzle transactions. `uselibpqcompat=true` keeps current libpq-compatible SSL behaviour for `pg`.

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
| `npm run db:reset` | Reset registered records with the same push-and-seed flow |
| `npm run db:seed` | Truncate and re-seed the register only |
| `npm run db:studio` | Open Drizzle Studio |

## Tests

```bash
npm test
npm run typecheck
npm run build
```

Current coverage: **34 tests across 3 suites**.

- `src/lib/utils.test.ts` — timezone-safe day maths, Indian currency formatting, maturity labels, effective status, CSV escaping, initials
- `src/lib/validation.test.ts` — FDR submission, IFSC, issue/maturity dates, renewal parent UUID, bank verification, discrepancy remarks, release reason, head decision defaults, repository/audit filters, login input
- `src/lib/fdr-status.test.ts` — expiry boundaries, renewal eligibility, 180-day window, financial-year boundaries, dispatch reference format

### Manual acceptance scenarios

| # | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| 1 | Sign in | Open `/login` and enter a seeded account with the wrong password, then the correct password | Inline error on failure; redirect to `/dashboard` on success |
| 2 | Session guard | Sign out, then open `/repository` directly | Redirected to `/login`; protected content is not rendered |
| 3 | Submission validation | As institution admin, open `/submit-fdr`; submit an invalid IFSC and maturity before issue | Field-level errors; no record created |
| 4 | Valid submission | Fill all required fields, attach a PDF, submit | Success toast; record appears in `/repository` as institution-submitted; audit event written |
| 5 | Bank verification | As scrutiny officer, open a pending record and verify with a confirmation reference | Verification becomes bank-confirmed; snapshot and audit diff recorded |
| 6 | Discrepancy | As scrutiny officer, flag a discrepancy with a short remark, then a substantive one | Short remark rejected; substantive remark moves record to discrepancy-flagged |
| 7 | Renewal | As institution admin, open `/renewals` and renew an eligible parent | New FDR with `parent_fdr_id`; chain renders parent → successor; parent is renewal-pending |
| 8 | Release request | As institution admin, request release for an eligible FDR | Case enters pending scrutiny; FDR becomes release-requested |
| 9 | Officer recommendation | As scrutiny officer, recommend or reject the pending case | Status changes to recommended or rejected; note required to reject |
| 10 | Head approval | As Bureau Head, approve the recommended case | FDR becomes released; dispatch reference `AICTE/REL/FY/8HEX`; printable receipt appears |
| 11 | Audit diff | As officer or head, open `/audit`, filter by FDR, inspect an event | Before/after JSON diff; append-only notice |
| 12 | RBAC | Sign in as an institution admin, then open `/audit`; sign in as the Bureau Head and open a scrutiny record | Institution admin sees an access-denied panel; institution data stays scoped; head is read-only on scrutiny |
| 13 | Resource pages | Open `/about`, `/help`, and `/security` from the sidebar, command palette, breadcrumbs, and footer | Pages render for every authenticated role with consistent navigation |

The command palette opens with **Ctrl/Cmd + K** and searches every destination available to the signed-in role. Access-denied pages render an explicit panel rather than redirecting in a loop.

## Security model

### Authentication and session

- Email and password sign-in against a salted scrypt hash (`N=16384`, `r=8`, `p=1`).
- A dummy hash comparison runs for unknown accounts to reduce timing differences.
- Signed HttpOnly cookie (`aicte_portal_session`) using HMAC-SHA256 over the user UUID.
- Constant-time signature comparison.
- `SameSite=Lax`, `Secure` in production, seven-day expiry.
- No credentials or role claims are trusted from the client; the user is reloaded from PostgreSQL on every request.
- Sign-in and sign-out events are recorded in the audit trail.

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

- Zod validation on the server for submissions, verification, release decisions, filters, login input, and account actions.
- Drizzle parameterised SQL; no string-built queries.
- CSV export prefixes dangerous cells to mitigate spreadsheet formula injection.
- `audit_logs` has a `BEFORE UPDATE OR DELETE` trigger that raises an exception; the table is append-only at the database level.
- Audit entries store actor, action, entity, timestamp, and optional before/after JSON.
- CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and same-origin framing headers are set globally.
- `poweredByHeader` is disabled.

### Production hardening checklist

- Federate sign-in with AICTE SSO (OIDC/SAML), MFA, session rotation, and revocation.
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
│   │   ├── about/              # purpose, roles and authority matrix
│   │   ├── help/               # workflow guidance and FAQs
│   │   ├── security/           # controls, pipeline and assurance matrix
│   │   ├── layout.tsx          # portal shell and authenticated session
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── not-found.tsx
│   ├── login/                  # split-screen sign-in
│   ├── api/
│   │   ├── documents/[id]/     # authenticated encrypted streaming
│   │   ├── export/fdrs/        # CSV and JSON export
│   │   ├── cron/refresh-statuses/
│   │   └── health/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # redirects to /dashboard or /login
├── components/
│   ├── audit/                  # audit table, filters, JSON diff viewer
│   ├── dashboard/              # Recharts analytics
│   ├── navigation/             # sidebar, header, search, account menu
│   ├── releases/               # queue, stepper, receipt
│   ├── renewals/               # recursive renewal tree
│   ├── scrutiny/               # split-pane verification panel
│   ├── submission/             # React Hook Form submission
│   ├── repository/             # filter bar
│   └── ui/                     # shadcn-style Radix primitives
├── db/
│   ├── schema.ts               # tables, enums, relations, JSON types
│   ├── index.ts                # Neon + node-postgres Drizzle facade
│   ├── seed.ts                 # date-relative register + audit trigger
│   └── seed-documents.ts       # generated PDF evidence
└── lib/
    ├── actions/                # server actions for FDR, release, session
    ├── audit.ts                # audit writer
    ├── constants.ts            # labels, styles, roles, banks, states
    ├── fdr-status.ts           # maturity status and dispatch references
    ├── password.ts             # scrypt hashing and timing equalisation
    ├── queries.ts              # scoped read models
    ├── session.ts              # signed session and RBAC
    ├── storage.ts              # encrypted local document vault
    ├── utils.ts                # dates, INR, CSV, status helpers
    └── validation.ts           # Zod schemas and upload checks
```

## Deployment notes

- Deploy the Next.js app to a Node.js runtime (Vercel, containers, or a VM). Edge-only runtimes cannot use `pg` or the filesystem-backed vault.
- Set `DATABASE_URL`, `DATABASE_SSL`, `SESSION_SECRET`, `DOCUMENT_ENCRYPTION_KEY`, and `CRON_SECRET` as platform secrets.
- Run `npm run db:push` (or apply generated migrations) and then `npm run db:seed` once against the target database. Set `SEED_ACCOUNT_PASSWORD` before seeding a shared environment.
- The node-postgres driver works with any managed PostgreSQL. The Neon WebSocket driver is selected automatically for Neon URLs and supports Drizzle transactions.
- Local document storage under `.data/` is **not durable** on serverless platforms. Replace `src/lib/storage.ts` with an object-store adapter before deployment.
- Schedule `GET /api/cron/refresh-statuses` with `Authorization: Bearer $CRON_SECRET`. Vercel Cron can supply this header when `CRON_SECRET` is configured, or use an external scheduler.
- Keep the encryption key stable across deploys; rotating it requires re-encrypting the vault.
- Put the app behind HTTPS and add HSTS at the proxy.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Database connection refused on `127.0.0.1:5433` | Start Docker Desktop, then `docker start aicte-fdr-postgres` |
| Sign-in returns “The email address or password is incorrect” | Confirm the seeded email, run `npm run db:seed`, and use the password printed by the seed |
| Empty repository or dashboard | Run `npm run db:seed` |
| `SESSION_SECRET` or `DOCUMENT_ENCRYPTION_KEY` error | Fill both base64 32-byte values in `.env.local` |
| Documents fail to open after a config change | The encryption key changed; restore the original key or re-seed |
| Port 5433 already in use | Change the Docker port mapping and `DATABASE_URL` together |
| PDF preview is blank | Use a browser with a PDF viewer; framing headers must permit same-origin preview (`SAMEORIGIN` / `frame-ancestors 'self'`) |
| Want a clean register | `npm run db:seed` resets records, documents, and audit events |

## Seeded data notice

The seed creates a representative register with fictional institutions, users, FDR numbers, bank branches, amounts, and generated evidence documents. These records exist to exercise the workflow and carry no legal validity.

The portal has not undergone a government security certification, accessibility audit, or production load test. Do not use it to store real security deposits, bank confirmations, or personal data without a full security, legal, and procurement review.
