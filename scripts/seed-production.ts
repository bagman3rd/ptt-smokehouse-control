import { execFileSync } from 'node:child_process';
if (process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('Production seed blocked. Set ALLOW_PRODUCTION_SEED=true for a deliberate one-time seed operation.');
  process.exit(1);
}
execFileSync('pnpm', ['exec', 'tsx', 'prisma/seed.ts'], { stdio: 'inherit' });
