import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('app/api/end-of-day/route.ts', 'utf8');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

assert.doesNotMatch(route, /endOfDayProteinLog\.upsert\(/, 'Quick EOD must not use the compound-key Prisma upsert that caused PostgreSQL 22P03');
assert.match(route, /endOfDayProteinLog\.createMany\([\s\S]*?skipDuplicates:\s*true/, 'Quick EOD must create missing rows with createMany and skipDuplicates');
assert.match(route, /endOfDayProteinLog\.updateMany\([\s\S]*?where:\s*\{[\s\S]*?restaurantId[\s\S]*?endOfDayLogId[\s\S]*?proteinId/, 'Quick EOD updates must be explicitly tenant scoped');
assert.match(schema, /@@unique\(\[restaurantId, endOfDayLogId, proteinId\]\)/, 'Tenant-scoped EOD uniqueness must remain enforced by the database');

console.log('Build 9.8.0 PostgreSQL-safe Quick EOD write strategy passed.');
