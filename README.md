# PUCA Finance

PUCA Finance is a local church financial custody and weekly return management application. It tracks cash counts, mobile money collections, disbursements, banking deposits, and weekly returns with tamper-evident audit logging and offline resilience.

## Prerequisites

- Node.js 20+
- pnpm 9+
- MySQL 8.0+ or TiDB Cloud Serverless

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | MySQL or TiDB connection string |
| `AUTH_SECRET` | Secret key for session encryption (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | Application root URL (e.g. `http://localhost:3000` or production URL) |
| `CRON_SECRET` | Secret header required for automated maintenance endpoints |
| `R2_ACCOUNT_ID` | Cloudflare account ID for document storage |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret access key |
| `R2_BUCKET_NAME` | Cloudflare R2 bucket name for receipts and deposit slips |

## Commands

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm prisma migrate deploy

# Seed initial roles and administrative accounts
pnpm prisma db seed

# Type check
pnpm typecheck

# Lint check
pnpm lint

# Verify UI design system and contrast
pnpm verify:ui

# Run unit and integration tests
pnpm test

# Build for production
pnpm build

# Create database backup
pnpm backup
```

## Initial Roles

The bootstrap seed sets up the standard operational roles:
- **Finance Secretary**: Enters collections, counts, and manages categories.
- **Treasurer**: Reviews records, approves expenditures, and confirms deposits.
- **Reviewer**: Read-only oversight access to generated financial reports and returns.

## Deployment

1. **Database**: Provision a TiDB Cloud Serverless cluster or MySQL 8.0 instance. Apply migrations using `pnpm prisma migrate deploy`.
2. **Storage**: Create a Cloudflare R2 bucket and configure CORS for your application domain.
3. **Application**: Deploy to Vercel or any Node.js container host. Configure all environment variables listed above. Set build command to `pnpm build`.
