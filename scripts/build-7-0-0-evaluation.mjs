import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
assert.equal(pkg.version, '7.0.0');
assert.match(pkg.scripts.postinstall, /prisma generate/);
assert.match(pkg.scripts.build, /prisma generate/);
assert.match(pkg.scripts.build, /verify:prisma-client/);
assert.match(pkg.scripts['render-build'], /prisma generate/);
assert.match(pkg.scripts['render-build'], /verify:prisma-client/);
assert.ok(existsSync('scripts/verify-prisma-pos-client.mjs'));
assert.match(read('prisma/schema.prisma'), /model PosConnection\s*\{/);
assert.match(read('app/admin/restaurants/pos/integrationActions.ts'), /prisma\.posConnection/);
assert.match(read('render.yaml'), /pnpm run render-build/);
assert.match(read('app/api/health/route.ts'), /7\.0\.0/);
console.log('Build 7.0.0 evaluation passed.');
