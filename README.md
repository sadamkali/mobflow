# MobiFlow Uganda

Next.js landing page and Relworx Mobile Money integration prepared for Uganda.

Includes:
- Glassmorphism landing page
- UGX 1,000 / 2,000 / 3,000 / 4,000 / 5,000 / 10,000 packages
- MTN + Airtel Mobile Money checkout
- Server-side Relworx API v2 requests
- Uganda MSISDN normalization and Relworx validation
- Transaction status polling
- Signed Relworx webhook verification
- Integration status page at /admin/integrations

Local:
npm install
Copy-Item .env.example .env.local
npm run dev

Required server environment variables:
RELWORX_API_BASE_URL=https://payments.relworx.com/api
RELWORX_API_KEY=
RELWORX_ACCOUNT_NO=
RELWORX_WEBHOOK_SECRET=
RELWORX_WEBHOOK_URL=https://YOUR-DOMAIN.com/api/payments/webhook

Never commit .env.local or payment credentials.

## Vercel

The repository includes a root `vercel.json` that explicitly selects Next.js and the root build commands. Deploy this repository from its root; the `app` directory is at the repository root.

Production note:
Before granting any purchased package/value, add a persistent database-backed orders table and payment_events table. Use an idempotency check keyed by the Relworx internal/customer reference so repeated webhooks cannot credit the same purchase twice.
