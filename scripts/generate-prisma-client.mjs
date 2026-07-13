import { rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import process from 'node:process';

// Prisma's generated client is build output. Remove the project-local copy first so
// Render cannot reuse a client generated from an older schema through its cache.
await rm('node_modules/.prisma/client', { recursive: true, force: true });

const executable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const child = spawn(executable, ['exec', 'prisma', 'generate', '--schema=prisma/schema.prisma'], {
  stdio: 'inherit',
  env: process.env,
});

const exitCode = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (signal) reject(new Error(`prisma generate terminated by signal ${signal}`));
    else resolve(code ?? 1);
  });
});

if (exitCode !== 0) {
  throw new Error(`prisma generate failed with exit code ${exitCode}`);
}
