# PUCA Finance

PUCA Finance is a finance management web application for a local church designed to replace paper record books with calm, exact, and verifiable accounting records.

This repository represents **Phase 1 of 7: Project Foundation**.

---

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS with custom ledger design tokens
- **Database**: Prisma ORM with MySQL provider (compatible with local MySQL 8 and TiDB Cloud)
- **Validation**: Zod (fail-fast environment and schema parsing)
- **Authentication**: Auth.js v5 (Credentials provider, bcrypt cost 12, 8-hour JWT sessions, Edge route protection)
- **Testing**: Vitest
- **Package Manager**: pnpm
- **Localization**: Timezone `Africa/Accra`, Currency Ghana cedi (`GH₵`) with two decimal places

---

## Architectural Principles

1. **The Ledger Aesthetic**: The user interface follows a paper-and-ink ledger design rather than a consumer dashboard. It avoids cards, gradients, and box shadows in favor of 1px hairline rules, generous white space, and typography (Fraunces serif for headings, IBM Plex Sans for interface text, and IBM Plex Mono with tabular figures for currency amounts).
2. **Strict Currency Arithmetic**: All monetary values are modeled as `Decimal(12, 2)`. JavaScript floating-point numbers are never used for currency calculations. All financial transformations use `src/lib/money.ts` (`parseCedi`, `formatCedi`, `sumCedi`, `toMinorUnits`).
3. **Thin Route Handlers & Server Actions**: Server actions and routes strictly authenticate, authorize, validate with Zod schemas, invoke business logic in `features/<name>/service.ts`, and return a typed `Result<T>`.
4. **Append-Only Audit Trail**: Financial and security state changes are committed in a single interactive database transaction alongside an audit record. Audit log records are append-only; update and delete code paths do not exist.
5. **Portability**: Operates identically on standard local MySQL 8.0 installations and managed TiDB Cloud instances without stored procedures, triggers, or MySQL-proprietary extensions.

---

## The Audited-Transaction Pattern

Every mutation to critical state or financial records must be executed atomically with an audit log row using the `withAudit` helper located in `src/features/audit/service.ts`.

### How It Works

1. `withAudit` opens an interactive Prisma transaction (`prisma.$transaction`).
2. The user-supplied closure performs the business operation (e.g. creating records, changing roles, or registering counts).
3. The closure returns `{ result, audit }` where `audit` defines the `AuditEntry` payload (actor ID, action name, entity type, entity ID, before JSON snapshot, and after JSON snapshot).
4. `withAudit` inserts the audit log row within the same transaction.
5. If either the business logic or the audit write fails, Prisma automatically rolls back both operations, preventing un-audited state changes or orphaned audit entries.

### Implementation Example

```typescript
import { withAudit } from "@/features/audit/service";

export async function changeUserRole(
  input: { userId: string; role: Role },
  actorId: string
): Promise<User> {
  return withAudit(async (tx) => {
    const target = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
    });

    const updated = await tx.user.update({
      where: { id: input.userId },
      data: { role: input.role },
    });

    return {
      result: updated,
      audit: {
        actorId,
        action: "USER_UPDATE_ROLE",
        entityType: "User",
        entityId: updated.id,
        before: { role: target.role },
        after: { role: updated.role },
      },
    };
  });
}
```

---

## Directory Structure

```
prisma/
  schema.prisma          # Data models: User, AuditLog, Denomination, GivingCategory, ChurchSettings
  migrations/            # Applied database schema migrations
  seed.ts                # Reference denominations, categories, and initial admin seed
src/
  app/
    (auth)/login/        # Login page with ledger aesthetic
    (app)/
      layout.tsx         # Authenticated layout with forced password change & church setup modals
      today/             # Today's service page (honest empty state)
      settings/users/    # User management (Finance Secretary only)
      settings/audit/    # Paginated audit log explorer with before/after diffs
    api/auth/[...nextauth]/ route.ts # Auth.js API route handlers
    globals.css          # Color tokens, typography, and hairline rule definitions
    layout.tsx           # Root layout with Google Fonts
    page.tsx             # Root redirector
  features/
    auth/                # Credentials verification, account lockout, forced password change
    users/               # User creation, role changes, deactivation, password reset
    audit/               # recordAudit, withAudit, paginated audit query filtering
  components/
    ui/                  # Button, TextField, AmountInput, Select, RuleHeading,
                         # LedgerRow, StatusMark, Sheet, Toast, EmptyState, ConfirmDialog
    layout/              # AppShell, DesktopNav (240px rail), MobileNav (bottom tab bar)
  lib/
    money.ts             # Decimal-safe Ghana Cedi arithmetic (parseCedi, formatCedi, sumCedi)
    dates.ts             # Africa/Accra timezone formatting and service date parsing
    errors.ts            # AppError and Result<T> types for safe client communication
    env.ts               # Boot-time Zod environment validation
    format.ts            # Role and status formatting utilities
  server/
    db.ts                # PrismaClient singleton
    session.ts           # Auth.js v5 credentials configuration and 8-hour JWT session
    guards.ts            # requireUser() and requireRole() security guards
tests/
  factories/             # Fixture builders for unit tests
  unit/                  # Vitest suites for money edge cases, lockout, secretary guards, withAudit
.env.example             # Template for required environment variables
```

---

## Setup & Getting Started

### Prerequisites

- **Node.js**: v20 or v22+
- **pnpm**: v9 or v10+
- **MySQL**: 8.0 running locally (or TiDB Cloud connection)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Ezra-creator/Church-Finance.git
cd Church-Finance
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and provide your database credentials:

```bash
cp .env.example .env
```

Ensure the following variables are defined:

```env
DATABASE_URL="mysql://root:password@localhost:3306/puca_finance"
AUTH_SECRET="your-32-character-or-longer-secret"
SEED_ADMIN_EMAIL="secretary@puca.local"
SEED_ADMIN_PASSWORD="TemporaryPassword123#"
NODE_ENV="development"
```

### 3. Run Migrations & Seed Reference Data

Apply the Prisma migrations to create the database tables:

```bash
pnpm prisma:migrate
```

Seed reference denominations (GH₵ 200 down to 0.01), giving categories (Tithe, Freewill offering, Special offering), and the initial `FINANCE_SECRETARY` user:

```bash
pnpm prisma:seed
```

### 4. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Sign in with the seeded credentials (`secretary@puca.local` / `TemporaryPassword123#`).
- You will be immediately prompted to change your temporary password to a permanent one (`mustChangePassword: true`).
- You will then be invited to register the congregation name and presbytery details through the first-run Church Setup modal.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Next.js development server |
| `pnpm build` | Compiles the production build |
| `pnpm start` | Starts the Next.js production server |
| `pnpm test` | Runs the full Vitest unit test suite |
| `pnpm typecheck` | Validates TypeScript types across the codebase |
| `pnpm prisma:migrate` | Runs database migrations with Prisma |
| `pnpm prisma:seed` | Seeds denominations, categories, and initial admin |

---

## Security & Access Invariants

- **Brute-Force Lockout**: 5 consecutive failed login attempts lock the user account for 15 minutes.
- **Forced Password Rotation**: Users flagged with `mustChangePassword` are constrained by an unclosable security modal until their password is updated.
- **Last Secretary Protection**: The system prevents demoting or deactivating the last active `FINANCE_SECRETARY`.
- **Self-Deactivation Guard**: Users cannot deactivate their own active accounts.
- **Role Isolation**:
  - `FINANCE_SECRETARY`: Enter cash counts, initiate reconciliations, manage officers, configure church settings.
  - `TREASURER`: Verify counts, reconcile bankings, sign off on ledger rows.
  - `PRESBYTERY_VIEWER`: Read-only access to final reports, audits, and statements.
