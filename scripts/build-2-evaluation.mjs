import fs from 'node:fs';

function assert(name, condition, detail = '') {
  if (!condition) throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`);
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ''}`);
}

const read = (path) => fs.readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
assert('package version', pkg.version === '2.2.0', pkg.version);
assert('render build avoids accept-data-loss', !pkg.scripts['render-build'].includes('accept-data-loss'));
assert('nav badge', read('components/Nav.tsx').includes('Build 2.2.0'));

const schema = read('prisma/schema.prisma');
assert('EOD status fields', schema.includes('status          String   @default("DRAFT")') && schema.includes('lockedAt        DateTime?'));
assert('settings audit fields', schema.includes('updatedBy') && schema.includes('@updatedAt'));

const bootstrap = read('lib/bootstrap.ts');
assert('bootstrap does not overwrite protein settings', bootstrap.includes('prisma.protein.upsert') && bootstrap.includes('update: {}'));
assert('bootstrap does not overwrite scenarios', bootstrap.includes('forecastScenario.upsert') && bootstrap.includes('update: {}'));

const actions = read('app/actions.ts');
assert('legacy createCookPlan disabled', actions.includes('Legacy createCookPlan server action is disabled'));
assert('legacy saveEndOfDayLog disabled', actions.includes('Legacy saveEndOfDayLog server action is disabled'));
assert('approve cook plan retained', actions.includes('export async function approveCookPlan'));

const eodForm = read('app/end-of-day/EndOfDayForm.tsx');
assert('EOD status selector exists', eodForm.includes('EOD Status') && eodForm.includes('Manager Reviewed'));
assert('EOD lock checkbox exists', eodForm.includes('Lock EOD log after saving'));
assert('explicit leftover validation exists', eodForm.includes('usable leftover units are required'));
assert('EOD fallback removed', !eodForm.includes('fallback leftover') && !eodForm.includes('will treat cooked units as usable leftovers'));

const eodRoute = read('app/api/end-of-day/route.ts');
assert('API rejects locked EOD edit', eodRoute.includes('locked and cannot be edited'));
assert('API blocks complete all-zero log', eodRoute.includes('all protein values at zero'));
assert('API requires explicit leftovers before complete', eodRoute.includes('usable leftover units are required'));

const eodStatusRoute = read('app/api/eod-status/route.ts');
assert('prior EOD draft is incomplete', eodStatusRoute.includes("logStatus === 'DRAFT'") && eodStatusRoute.includes('still Draft'));

const cookRoute = read('app/api/cook-plan/route.ts');
assert('cook plan exact prior EOD lookup', cookRoute.includes('const priorEodDate = addUtcDays(loadDate, -1)') && cookRoute.includes('exactEodFor(priorEodDate)'));
assert('cook plan incomplete EOD warning', cookRoute.includes('saved but incomplete'));
assert('cook plan missing prior EOD warning', cookRoute.includes('no data, check hot box'));

const settings = read('app/settings/page.tsx');
assert('settings audit note shown', settings.includes('Last updated') && settings.includes('updatedBy'));
assert('settings pricing fields still shown', settings.includes('Avg Sales $ / Cooked lb') && settings.includes('Sales Price Each'));

console.log('Build 2.2.0 evaluation checks completed.');
