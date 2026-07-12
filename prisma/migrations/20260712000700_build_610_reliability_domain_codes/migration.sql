-- Build 6.1.0: stable operational codes and protein identity.
ALTER TABLE "Protein" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT 'OTHER';
UPDATE "Protein" SET "code" = CASE
  WHEN lower("name") LIKE '%brisket%' THEN 'BRISKET'
  WHEN lower("name") LIKE '%pork%' THEN 'PORK'
  WHEN lower("name") LIKE '%rib%' THEN 'RIBS'
  WHEN lower("name") LIKE '%chicken%' THEN 'CHICKEN'
  ELSE 'OTHER'
END;

UPDATE "Smoker" SET "cookWindow" = CASE "cookWindow"
  WHEN 'Overnight only' THEN 'OVERNIGHT_ONLY'
  WHEN 'Same-day only' THEN 'SAME_DAY_ONLY'
  WHEN 'All day / flexible' THEN 'FLEXIBLE'
  WHEN 'Backup / overflow only' THEN 'BACKUP_OVERFLOW'
  WHEN 'Not currently active' THEN 'INACTIVE'
  ELSE COALESCE("cookWindow", 'FLEXIBLE')
END;
UPDATE "SmokerCatalog" SET "cookWindow" = CASE "cookWindow"
  WHEN 'Overnight only' THEN 'OVERNIGHT_ONLY'
  WHEN 'Same-day only' THEN 'SAME_DAY_ONLY'
  WHEN 'All day / flexible' THEN 'FLEXIBLE'
  WHEN 'Backup / overflow only' THEN 'BACKUP_OVERFLOW'
  WHEN 'Not currently active' THEN 'INACTIVE'
  ELSE COALESCE("cookWindow", 'FLEXIBLE')
END;
UPDATE "Smoker" SET "location" = CASE "location"
  WHEN 'Outdoor' THEN 'OUTDOOR'
  WHEN 'Indoors under hood' THEN 'INDOOR_HOOD'
  WHEN 'In the wall' THEN 'IN_WALL'
  WHEN 'Outdoors in smoke house' THEN 'OUTDOOR_SMOKEHOUSE'
  ELSE "location"
END;

DO $$ BEGIN
  ALTER TABLE "Smoker" ADD CONSTRAINT "Smoker_cookWindow_code_check" CHECK ("cookWindow" IS NULL OR "cookWindow" IN ('OVERNIGHT_ONLY','SAME_DAY_ONLY','FLEXIBLE','BACKUP_OVERFLOW','INACTIVE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Smoker" ADD CONSTRAINT "Smoker_location_code_check" CHECK ("location" IS NULL OR "location" IN ('OUTDOOR','INDOOR_HOOD','IN_WALL','OUTDOOR_SMOKEHOUSE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SmokerCatalog" ADD CONSTRAINT "SmokerCatalog_cookWindow_code_check" CHECK ("cookWindow" IS NULL OR "cookWindow" IN ('OVERNIGHT_ONLY','SAME_DAY_ONLY','FLEXIBLE','BACKUP_OVERFLOW','INACTIVE'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Protein" ADD CONSTRAINT "Protein_code_check" CHECK ("code" IN ('BRISKET','PORK','RIBS','CHICKEN','OTHER'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "Protein_restaurantId_code_idx" ON "Protein"("restaurantId", "code");
