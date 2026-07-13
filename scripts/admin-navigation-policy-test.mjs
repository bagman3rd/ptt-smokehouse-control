import fs from 'node:fs';
import assert from 'node:assert/strict';
const auth = fs.readFileSync('lib/auth.ts','utf8');
const render = fs.readFileSync('render.yaml','utf8');
const e2e = fs.readFileSync('e2e/all-interactions.spec.ts','utf8');
assert.match(auth, /ENFORCE_PRIVILEGED_2FA === 'true'/, '2FA route blocking must be explicit opt-in');
assert.match(render, /key: ENFORCE_PRIVILEGED_2FA\s+value: "false"/, 'Render must not redirect every Admin route before enrollment');
for (const heading of ['Settings','User Access','Restaurants','POS / Sales Import','Smoker Capacity','Commercial Smoker Catalog','Audit Log','System Health','Billing','Data Export & Cancellation']) {
  assert.ok(e2e.includes(`'${heading}'`), `missing exact Admin destination assertion: ${heading}`);
}
assert.match(e2e, /not\.toHaveURL\(\/\\\/account\\\/security\//, 'Admin navigation test must reject Account Security redirects');
console.log('Build 8.0.1 Admin navigation policy and exact-destination checks passed.');
