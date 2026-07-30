# Sanitized Support Bundle — Build 11.8.0

## Included

- Build identity
- Service inventory
- Provider health
- Cron inventory
- Database metadata
- Delivery summary
- Recent dead letters
- Recent administration audit
- Configuration presence

## Excluded

- Passwords
- PINs
- Session tokens
- Access tokens
- Authorization headers
- Cookies
- API keys
- Application secrets
- Customer personal data

Sensitive key names are replaced with `[REDACTED]`. The bundle receives a deterministic checksum so unchanged evidence can be verified. A support bundle is diagnostic metadata, not a database backup.
