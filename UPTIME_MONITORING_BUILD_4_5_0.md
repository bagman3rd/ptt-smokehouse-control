# Uptime Monitoring - Build 4.5.0

Use UptimeRobot, Better Stack, or Render alerts before the first paying customer.

Recommended monitors:

1. Public app health/open page
   - URL: production app root or `/login`
   - Frequency: 5 minutes
   - Alert email: support inbox

2. Authenticated app manual check
   - Weekly: log in and verify `/today`, `/end-of-day`, `/cook-plan`, `/admin/system`

3. Database health
   - `/admin/system` shows DB status after login
   - Record a SystemCheck after any outage investigation

Support promise should be conservative until a real on-call process exists.
