# Account Model Notes — Build 3.2.0

Build 3.2.0 removes email as a database-level unique constraint so the schema is no longer tied to a single global email namespace. That avoids tenant onboarding friction when restaurants create local staff accounts.

Current practical login rule:

- Username is the preferred login identifier.
- Email login still works when it resolves to one active user.
- If duplicate emails are created later, operators should use usernames.

Commercial recommendation:

- Add a separate Account model for the login identity.
- Keep User or StaffProfile as restaurant-local employee profile data.
- Keep RestaurantMembership as the role/access bridge.

Target future shape:

```text
Account
  id
  email
  passwordHash
  active

RestaurantMembership
  accountId
  restaurantId
  role
  active

StaffProfile
  restaurantId
  accountId
  displayName
  pinCode / optional pit-mode credential
```
