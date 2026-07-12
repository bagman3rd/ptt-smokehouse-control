# Uptime and Support — Build 5.2.0

## Uptime endpoints

- `/api/health` returns basic app/build status.
- `/api/health/db` verifies the app can reach PostgreSQL.

Recommended UptimeRobot monitors:

1. HTTP monitor: `/api/health`
2. HTTP monitor: `/api/health/db`

Alert target: support email plus owner/admin email.

## Support channel

Set `NEXT_PUBLIC_SUPPORT_EMAIL` in Render. The app displays this on `/help` and `/support`.

The support form stores a `SupportTicket` record with tenant context when the user is logged in.
