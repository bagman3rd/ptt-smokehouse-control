-- Build 6.1.1: stable operational codes and protein identity.
-- This migration deliberately normalizes all legacy/free-text values before
-- adding constraints so existing production data cannot block deployment.

ALTER TABLE "Protein" ADD COLUMN IF NOT EXISTS "code" TEXT NOT NULL DEFAULT 'OTHER';
UPDATE "Protein" SET "code" = CASE
  WHEN upper(trim(COALESCE("code", ''))) IN ('BRISKET','PORK','RIBS','CHICKEN','OTHER')
    THEN upper(trim("code"))
  WHEN lower(COALESCE("name", '')) LIKE '%brisket%' THEN 'BRISKET'
  WHEN lower(COALESCE("name", '')) LIKE '%pork%' OR lower(COALESCE("name", '')) LIKE '%butt%' THEN 'PORK'
  WHEN lower(COALESCE("name", '')) LIKE '%rib%' THEN 'RIBS'
  WHEN lower(COALESCE("name", '')) LIKE '%chicken%' OR lower(COALESCE("name", '')) LIKE '%breast%' THEN 'CHICKEN'
  ELSE 'OTHER'
END;

-- Normalize smoker cook windows. Unknown historical values become FLEXIBLE,
-- which keeps the smoker usable without silently deactivating equipment.
UPDATE "Smoker" SET "cookWindow" = CASE
  WHEN "cookWindow" IS NULL OR trim("cookWindow") = '' THEN 'FLEXIBLE'
  WHEN upper(trim("cookWindow")) IN ('OVERNIGHT_ONLY','SAME_DAY_ONLY','FLEXIBLE','BACKUP_OVERFLOW','INACTIVE')
    THEN upper(trim("cookWindow"))
  WHEN lower(trim("cookWindow")) IN ('overnight only','overnight') THEN 'OVERNIGHT_ONLY'
  WHEN lower(trim("cookWindow")) IN ('same-day only','same day only','same-day','same day') THEN 'SAME_DAY_ONLY'
  WHEN lower(trim("cookWindow")) IN ('all day / flexible','all day/flexible','all day','flexible') THEN 'FLEXIBLE'
  WHEN lower(trim("cookWindow")) IN ('backup / overflow only','backup/overflow only','backup only','overflow only','backup','overflow') THEN 'BACKUP_OVERFLOW'
  WHEN lower(trim("cookWindow")) IN ('not currently active','inactive','not active','disabled') THEN 'INACTIVE'
  ELSE 'FLEXIBLE'
END;

-- Catalog records are templates. Unknown historical values also default to
-- FLEXIBLE so every catalog row remains valid and selectable after migration.
UPDATE "SmokerCatalog" SET "cookWindow" = CASE
  WHEN "cookWindow" IS NULL OR trim("cookWindow") = '' THEN 'FLEXIBLE'
  WHEN upper(trim("cookWindow")) IN ('OVERNIGHT_ONLY','SAME_DAY_ONLY','FLEXIBLE','BACKUP_OVERFLOW','INACTIVE')
    THEN upper(trim("cookWindow"))
  WHEN lower(trim("cookWindow")) IN ('overnight only','overnight') THEN 'OVERNIGHT_ONLY'
  WHEN lower(trim("cookWindow")) IN ('same-day only','same day only','same-day','same day') THEN 'SAME_DAY_ONLY'
  WHEN lower(trim("cookWindow")) IN ('all day / flexible','all day/flexible','all day','flexible') THEN 'FLEXIBLE'
  WHEN lower(trim("cookWindow")) IN ('backup / overflow only','backup/overflow only','backup only','overflow only','backup','overflow') THEN 'BACKUP_OVERFLOW'
  WHEN lower(trim("cookWindow")) IN ('not currently active','inactive','not active','disabled') THEN 'INACTIVE'
  ELSE 'FLEXIBLE'
END;

-- Normalize location labels/codes. Unknown legacy free text becomes NULL,
-- which is permitted and can be corrected later through the controlled UI.
UPDATE "Smoker" SET "location" = CASE
  WHEN "location" IS NULL OR trim("location") = '' THEN NULL
  WHEN upper(trim("location")) IN ('OUTDOOR','INDOOR_HOOD','IN_WALL','OUTDOOR_SMOKEHOUSE')
    THEN upper(trim("location"))
  WHEN lower(trim("location")) IN ('outdoor','outdoors','outside') THEN 'OUTDOOR'
  WHEN lower(trim("location")) IN ('indoors under hood','indoor under hood','under hood','indoors') THEN 'INDOOR_HOOD'
  WHEN lower(trim("location")) IN ('in the wall','in wall','wall') THEN 'IN_WALL'
  WHEN lower(trim("location")) IN ('outdoors in smoke house','outdoor in smoke house','outdoors in smokehouse','outdoor smokehouse','smoke house','smokehouse') THEN 'OUTDOOR_SMOKEHOUSE'
  ELSE NULL
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
