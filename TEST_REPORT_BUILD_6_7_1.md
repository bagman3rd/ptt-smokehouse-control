# Test Report — Build 6.7.2

## Acceptance criteria

- Sealed/unopened brisket, pork, chicken, and rib entries accept whole numbers only.
- Decimal sealed/unopened counts are rejected in both client and API validation.
- Opened-meat pounds continue to accept decimals.
- Database schema stores sealed/unopened counts as INTEGER.
- Existing Build 6.7.0 POS integration remains intact.
