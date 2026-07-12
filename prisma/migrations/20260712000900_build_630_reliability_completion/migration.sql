-- Build 6.3.0 reliability completion.
-- Resolve legacy smoker configurations conservatively: anything not explicitly
-- reviewed is disabled and made ineligible until an owner/admin saves it again.
UPDATE "Smoker"
SET "cookWindow" = 'INACTIVE', "active" = false, "configurationReviewedAt" = NULL
WHERE "configurationReviewedAt" IS NULL;

-- Backfill tenant ownership only when one unambiguous restaurant exists. If
-- multiple restaurants exist and orphan records remain, stop instead of guessing.
DO $$
DECLARE
  tenant_count INTEGER;
  fallback_restaurant TEXT;
  orphan_count BIGINT;
BEGIN
  SELECT COUNT(*), MIN("id") INTO tenant_count, fallback_restaurant FROM "Restaurant";
  SELECT
    (SELECT COUNT(*) FROM "Protein" WHERE "restaurantId" IS NULL) +
    (SELECT COUNT(*) FROM "CookPlan" WHERE "restaurantId" IS NULL) +
    (SELECT COUNT(*) FROM "CookPlanItem" WHERE "restaurantId" IS NULL) +
    (SELECT COUNT(*) FROM "EndOfDayLog" WHERE "restaurantId" IS NULL) +
    (SELECT COUNT(*) FROM "EndOfDayProteinLog" WHERE "restaurantId" IS NULL) +
    (SELECT COUNT(*) FROM "Smoker" WHERE "restaurantId" IS NULL) +
    (SELECT COUNT(*) FROM "AuditLog" WHERE "restaurantId" IS NULL)
  INTO orphan_count;

  IF orphan_count > 0 AND tenant_count <> 1 THEN
    RAISE EXCEPTION 'Build 6.3.0 cannot safely assign % orphan tenant records across % restaurants', orphan_count, tenant_count;
  END IF;

  IF orphan_count > 0 THEN
    UPDATE "Protein" SET "restaurantId" = fallback_restaurant WHERE "restaurantId" IS NULL;
    UPDATE "CookPlan" SET "restaurantId" = fallback_restaurant WHERE "restaurantId" IS NULL;
    UPDATE "CookPlanItem" SET "restaurantId" = fallback_restaurant WHERE "restaurantId" IS NULL;
    UPDATE "EndOfDayLog" SET "restaurantId" = fallback_restaurant WHERE "restaurantId" IS NULL;
    UPDATE "EndOfDayProteinLog" SET "restaurantId" = fallback_restaurant WHERE "restaurantId" IS NULL;
    UPDATE "Smoker" SET "restaurantId" = fallback_restaurant WHERE "restaurantId" IS NULL;
    UPDATE "AuditLog" SET "restaurantId" = fallback_restaurant WHERE "restaurantId" IS NULL;
  END IF;
END $$;

ALTER TABLE "Protein" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "CookPlan" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "CookPlanItem" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "EndOfDayLog" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "EndOfDayProteinLog" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "Smoker" ALTER COLUMN "restaurantId" SET NOT NULL;
ALTER TABLE "AuditLog" ALTER COLUMN "restaurantId" SET NOT NULL;
