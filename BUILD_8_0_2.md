# Build 8.0.2

## POS partial-schema repair

Build 8.0.2 repairs production databases where `PosConnection` or another POS table was created by an earlier schema push or interrupted migration but does not contain the complete Build 8.0.0 column set.

The POS foundation migration now:

- creates missing tables;
- adds every missing POS column with `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`;
- performs column repair before creating indexes or foreign keys;
- preserves existing POS rows and tables;
- remains safe for fresh databases and retried failed migrations.

This specifically fixes Render error `42703: column externalLocationId does not exist`.
