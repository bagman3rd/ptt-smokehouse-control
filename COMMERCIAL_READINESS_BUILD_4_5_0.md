# Build 4.6.0 Commercial Readiness Notes

## Domain proof requirement
The forecast engine is now in "hold and prove" mode. The app exposes trailing 30-day MAPE by protein, but true domain validation requires 60-90 days of live PTT data.

## Operational fit
- `/today` and EOD should be tested on an actual phone before pilot service.
- EOD now stores an unsaved local browser draft to survive failed submits/bad Wi-Fi.
- `/cook-plan/print` has print CSS for large type, high contrast, and one-page pit use.

## Commercial requirements added
- Starter Terms of Service: `/terms`
- Starter Privacy Policy: `/privacy`
- Help/support page: `/help`
- Billing page: `/billing`
- Stripe hosted-checkout handoff using `STRIPE_PAYMENT_LINK` or `STRIPE_CHECKOUT_URL`

## Still required before first paying stranger
- Attorney review of Terms/Privacy.
- Configure support email: `NEXT_PUBLIC_SUPPORT_EMAIL`.
- Configure Stripe payment link with trial/cancellation terms.
- Configure uptime monitoring and alerting.
- Complete one live restore drill and record it in `/admin/system`.
