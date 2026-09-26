# MobiFlow Uganda

Next.js landing page and Relworx Mobile Money integration prepared for Uganda.

Includes:
- Mobile-friendly glassmorphism captive-portal UI
- Internet bundles: 1 Hour / 3 Hours / 6 Hours / 12 Hours / 1 Day / 3 Days
- UGX 1,000 / 2,000 / 3,000 / 4,000 / 5,000 / 10,000 pricing
- In-page mobile-money checkout modal
- MTN + Airtel Mobile Money checkout
- Server-side Relworx API v2 requests
- Uganda MSISDN normalization and Relworx validation
- Background payment status polling with processing states
- Server-backed portal session cookie with payment revalidation on reconnect
- Browser session countdown, previous-session reconnect UI, and session expiry handling
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


## Captive portal stage

MobiFlow is currently being built as the customer-facing captive-portal/payment experience without a MikroTik or other network-enforcement integration. The browser session countdown is a temporary UI/session layer for this stage; it does not by itself grant or revoke network access.

When a router/hotspot is introduced later, the successful payment event should be connected to the network authorization/session layer rather than trusting localStorage as the source of access.


## Current portal session model

For the current no-router stage, a confirmed Relworx payment can create a signed, HttpOnly portal session cookie. Returning to the portal revalidates that payment with Relworx before restoring the session. This provides reconnect/session continuity without MikroTik.

This session currently represents the portal's access state only. A router/hotspot integration is still required later to enforce real network access, MAC/client authorization, bandwidth/data limits, and forced logout at the network layer.

## Vercel

The repository includes a root `vercel.json` that explicitly selects Next.js and the root build commands. Deploy this repository from its root; the `app` directory is at the repository root.

Production note:
Before granting any purchased package/value, add a persistent database-backed orders table and payment_events table. Use an idempotency check keyed by the Relworx internal/customer reference so repeated webhooks cannot credit the same purchase twice.


Build verification: GitHub Actions runs `npm install` and `npm run build` on pushes to `main`.
