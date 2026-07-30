# Security Model — Build 11.9.0

## Session controls

The production gate requires:

- Absolute session timeout no longer than 12 hours
- Idle timeout no longer than 30 minutes
- Privileged reauthentication within 15 minutes
- No more than five failed authentication attempts before lockout
- At least 15 minutes of lockout
- Privileged 2FA for ADMIN, OWNER, and KM
- Secure and HttpOnly session cookies
- SameSite=Lax or the approved equivalent
- Session rotation after authentication
- Server-side session revocation

## Authorization

Authorization is deny-by-default. Every protected request requires actor role, actor tenant, resource tenant, and action.

Cross-tenant requests are rejected before resource access. Hiding a button is not authorization.

## Request security

Browser mutations require CSRF validation. Webhooks require cryptographic signature validation. JSON mutation bodies require the approved content type and cannot exceed 1,048,576 bytes.

Production responses must include:

- Content-Security-Policy
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security

## Rate limiting

Controlled categories:

- Authentication: 10 requests per 60 seconds
- API reads: 120 requests per 60 seconds
- API mutations: 60 requests per 60 seconds
- Webhooks: 300 requests per 60 seconds

Rate-limit denial must not create a write.

## Audit integrity

Every audit event records tenant, request ID, event type, timestamp, actor, resource, outcome, metadata, previous hash, and event hash. Altering an event or sequence invalidates the chain.
