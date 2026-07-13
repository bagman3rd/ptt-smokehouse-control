import { spawnSync } from 'node:child_process';

const migration = '20260712001500_build_800_pos_integration_foundation';
const result = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'resolve', '--rolled-back', migration], {
  encoding: 'utf8',
  stdio: 'pipe',
  env: process.env,
});

const output = `${result.stdout || ''}\n${result.stderr || ''}`;
if (result.status === 0) {
  console.log(`Recovered failed partial migration ${migration}; migrate deploy will retry it safely.`);
  process.exit(0);
}

const expectedNoop = [
  'not found in the database',
  'is not in a failed state',
  'was not found',
  'already applied',
].some((needle) => output.toLowerCase().includes(needle.toLowerCase()));

if (expectedNoop) {
  console.log(`No failed ${migration} record required recovery.`);
  process.exit(0);
}

console.error(output.trim());
console.error(`Unable to determine whether ${migration} can be recovered safely.`);
process.exit(result.status || 1);
