const baseUrl = (process.env.PRODUCTION_URL || 'https://ptt-smokehouse-control.onrender.com').replace(/\/$/, '');
const expectedBuild = process.env.EXPECTED_BUILD || '7.5.0';
const username = process.env.PRODUCTION_SMOKE_USERNAME || '';
const password = process.env.PRODUCTION_SMOKE_PASSWORD || '';
const attempts = Number(process.env.SMOKE_ATTEMPTS || 4);
const delayMs = Number(process.env.SMOKE_DELAY_MS || 15000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await operation(); }
    catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/${attempts} failed for ${label}:`, error instanceof Error ? error.message : error);
      if (attempt < attempts) await sleep(delayMs);
    }
  }
  throw lastError;
}

for (const endpoint of ['/api/health', '/api/health/db']) {
  await retry(endpoint, async () => {
    const response = await fetch(`${baseUrl}${endpoint}`, { headers: { 'user-agent': 'PTT-Build-7.5.0-Monitor' }, signal: AbortSignal.timeout(20000) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`${response.status} health check failed`);
    if (body.build !== expectedBuild) throw new Error(`Expected build ${expectedBuild}, received ${body.build || 'missing'}`);
    if (body.ok !== true) throw new Error('Health payload did not report ok=true');
    console.log(`PASS ${endpoint}: build ${body.build}`);
  });
}

if (!username || !password) throw new Error('PRODUCTION_SMOKE_USERNAME and PRODUCTION_SMOKE_PASSWORD are required.');

await retry('authenticated smoke transaction', async () => {
  const loginBody = new URLSearchParams({ username, password });
  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST', body: loginBody, redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'PTT-Build-7.5.0-Monitor' },
    signal: AbortSignal.timeout(30000)
  });
  const cookie = login.headers.get('set-cookie')?.split(';')[0] || '';
  const location = login.headers.get('location') || '';
  if (![302, 303, 307, 308].includes(login.status) || !cookie || !location.includes('/dashboard')) {
    throw new Error(`Login smoke failed with status ${login.status}`);
  }
  const dashboard = await fetch(`${baseUrl}/dashboard`, { headers: { cookie, 'user-agent': 'PTT-Build-7.5.0-Monitor' }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const html = await dashboard.text();
  if (dashboard.status !== 200 || !html.includes('Smokehouse Control')) throw new Error(`Authenticated dashboard smoke failed with status ${dashboard.status}`);
  console.log('PASS authenticated login and dashboard transaction');
});

console.log(`Production smoke checks passed for ${baseUrl} at build ${expectedBuild}.`);
