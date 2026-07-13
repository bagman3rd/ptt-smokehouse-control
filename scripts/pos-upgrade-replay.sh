#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL is required}"
DB_NAME="ptt_upgrade_${GITHUB_RUN_ID:-local}_$RANDOM"
BASE_URL="${DATABASE_URL%/*}"
cleanup(){ dropdb --if-exists "$DB_NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
createdb "$DB_NAME"
UPGRADE_URL="$BASE_URL/$DB_NAME"
psql "$UPGRADE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE "Restaurant" ("id" TEXT PRIMARY KEY);
CREATE TABLE "Protein" ("id" TEXT PRIMARY KEY, "restaurantId" TEXT);
DO $$ BEGIN CREATE TYPE "PosProvider" AS ENUM ('SQUARE','TOAST','CLOVER','LIGHTSPEED','TOUCHBISTRO','SPOTON','REVEL','ORACLE_SIMPHONY','NCR_ALOHA','PAR_BRINK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PosConnectionStatus" AS ENUM ('NOT_CONNECTED','CONNECTING','CONNECTED','DEGRADED','REAUTH_REQUIRED','DISCONNECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE "PosConnection" (
  "id" TEXT PRIMARY KEY,
  "restaurantId" TEXT,
  "provider" "PosProvider",
  "status" "PosConnectionStatus" DEFAULT 'NOT_CONNECTED',
  "lastError" TEXT
);
SQL
psql "$UPGRADE_URL" -v ON_ERROR_STOP=1 -f prisma/migrations/20260712001500_build_800_pos_integration_foundation/migration.sql
psql "$UPGRADE_URL" -v ON_ERROR_STOP=1 -Atc "SELECT 1 FROM information_schema.columns WHERE table_name='PosConnection' AND column_name='externalLocationId'" | grep -qx 1
printf 'Build 9.5.0 prior-schema POS upgrade replay passed.\n'
