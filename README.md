# MobiFlow Uganda

Next.js captive-portal landing page with Yo! Payments Mobile Money integration for Uganda.

Includes:
- Mobile-friendly glassmorphism captive-portal UI
- Internet bundles: 1 Hour / 3 Hours / 6 Hours / 12 Hours / 1 Day / 3 Days
- UGX 1,000 / 2,000 / 3,000 / 4,000 / 5,000 / 10,000 pricing
- In-page mobile-money checkout modal
- MTN + Airtel Mobile Money checkout
- Server-side Yo! Payments sandbox requests
- Uganda MSISDN normalization
- Background payment status polling with processing states
- Signed HttpOnly portal-session cookie with payment revalidation on reconnect
- Yo! Payments success/failure webhook verification
- Integration status page at /admin/integrations

## Yo! Payments setup

Yo! Payments' developer sandbox endpoint is:

https://sandbox.yo.co.ug/services/yopaymentsdev/task.php

The official Yo! Payments PHP 8 library documents API username/password authentication, the acdepositfunds payment operation, and actransactioncheckstatus for status checks.

Required server environment variables:

YO_ENVIRONMENT=sandbox
YO_API_BASE_URL=https://sandbox.yo.co.ug/services/yopaymentsdev/task.php
YO_API_USERNAME=
YO_API_PASSWORD=
YO_INSTANT_NOTIFICATION_URL=https://YOUR-DOMAIN.com/api/payments/webhook
YO_FAILURE_NOTIFICATION_URL=https://YOUR-DOMAIN.com/api/payments/webhook
PORTAL_SESSION_SECRET=

For production, switch YO_ENVIRONMENT to production and use the production API configuration supplied by Yo!.

Never commit .env.local or payment credentials.

## Captive portal stage

MobiFlow currently provides the customer-facing payment and portal-session layer without MikroTik or another network-enforcement integration. A successful payment creates a temporary application session; it does not by itself grant or revoke network access.

When the hotspot/router is introduced, the successful Yo! payment should trigger the actual network authorization/session layer.

## Important production note

Before granting purchased access at scale, add a persistent database-backed orders/payment-events store and make payment processing idempotent. The network-access decision should be based on a stored, verified payment record rather than only a browser state.
