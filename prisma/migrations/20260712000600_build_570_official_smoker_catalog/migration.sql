-- Build 5.7.0 official smoker catalog audit
-- Catalog capacity fields are nullable because the app now refuses to fabricate missing manufacturer-published capacities.
ALTER TABLE "SmokerCatalog" ALTER COLUMN "rackCount" DROP DEFAULT;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "rackCount" DROP NOT NULL;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "brisketCapacity" DROP DEFAULT;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "brisketCapacity" DROP NOT NULL;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "porkCapacity" DROP DEFAULT;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "porkCapacity" DROP NOT NULL;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "ribCapacity" DROP DEFAULT;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "ribCapacity" DROP NOT NULL;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "chickenCapacity" DROP DEFAULT;
ALTER TABLE "SmokerCatalog" ALTER COLUMN "chickenCapacity" DROP NOT NULL;
