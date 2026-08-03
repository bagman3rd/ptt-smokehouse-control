# Supplier Cost Model — Build 12.2.0

Supplier rows are tenant- and location-scoped and retain vendor, vendor item, PTT product, purchase unit, pack size, total cost, effective timestamp, and source-file identity.

Duplicate vendor-item/effective-date rows are idempotent. A cost change of at least 10% creates an alert.

Supplier costs never change menu prices automatically.
