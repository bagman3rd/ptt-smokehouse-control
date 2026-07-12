-- Build 6.2.0 reliability hardening.
-- Catalog cook windows are intentionally cleared because a catalog record is a
-- manufacturer template, not a restaurant operating decision. Every installed
-- smoker must receive an explicit controlled selection in the restaurant UI.
UPDATE "SmokerCatalog" SET "cookWindow" = NULL WHERE "cookWindow" IS NOT NULL;

-- New installed smokers must be reviewed explicitly after data imports or
-- migrations. Existing valid records remain unchanged.
ALTER TABLE "Smoker" ADD COLUMN IF NOT EXISTS "configurationReviewedAt" TIMESTAMP(3);

-- A missing cook window is operationally safe: it cannot be scheduled until a
-- manager selects a controlled code. Existing valid codes remain permitted.
ALTER TABLE "Smoker" ALTER COLUMN "cookWindow" DROP DEFAULT;
