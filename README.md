# MobiFlow Uganda landing page

A modern glassmorphism Next.js starter for Uganda-focused mobile money payments.

## Included
- Landing page with UGX 1,000 / 2,000 / 3,000 / 4,000 / 5,000 / 10,000 packages
- MTN + Airtel selection UI
- Ugandan mobile number validation
- Payment checkout page at `/payment`
- Payment integration configuration UI at `/admin/integrations`
- Server-side secret placeholders in `.env.example`
- Responsive layout without external icon libraries

## Run
```bash
npm install
npm run dev
```

## Production payment backend
Connect the integration form to an authenticated admin endpoint. Store provider credentials server-side, validate signed webhooks, create payment requests server-side, and expose a small provider adapter so the UI does not depend directly on a gateway.
