const baseUrl = (process.env.PRODUCTION_URL || 'https://ptt-smokehouse-control.onrender.com').replace(/\/$/, '');
const attempts = Number(process.env.SMOKE_ATTEMPTS || 4);
const delayMs = Number(process.env.SMOKE_DELAY_MS || 15000);
const endpoints = ['/api/health', '/api/health/db'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const endpoint of endpoints) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, { headers: { 'user-agent': 'PTT-Build-6.3.1-Monitor' }, signal: AbortSignal.timeout(20000) });
      const body = await response.text();
      if (!response.ok) throw new Error(`${response.status} ${body.slice(0, 250)}`);
      console.log(`PASS ${endpoint}: ${response.status}`);
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt}/${attempts} failed for ${endpoint}:`, error instanceof Error ? error.message : error);
      if (attempt < attempts) await sleep(delayMs);
    }
  }
  if (lastError) throw lastError;
}
console.log(`Production smoke checks passed for ${baseUrl}.`);
