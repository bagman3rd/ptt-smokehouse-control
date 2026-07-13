import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schema = fs.readFileSync(path.join(root, 'prisma', 'schema.prisma'), 'utf8');
const modelNames = [...schema.matchAll(/^model\s+([A-Za-z0-9_]+)\s*\{/gm)].map((m) => m[1]);
const delegates = new Set(modelNames.map((name) => name[0].toLowerCase() + name.slice(1)));
const ignored = new Set(['$connect', '$disconnect', '$executeRaw', '$executeRawUnsafe', '$queryRaw', '$queryRawUnsafe', '$transaction', '$extends']);
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs']);
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) {
      const text = fs.readFileSync(full, 'utf8');
      for (const match of text.matchAll(/\bprisma\.([A-Za-z_$][A-Za-z0-9_$]*)/g)) {
        const delegate = match[1];
        if (!delegates.has(delegate) && !ignored.has(delegate)) {
          violations.push(`${path.relative(root, full)}: prisma.${delegate}`);
        }
      }
    }
  }
}

walk(path.join(root, 'app'));
walk(path.join(root, 'lib'));
walk(path.join(root, 'prisma'));
if (violations.length) {
  console.error('Unsupported Prisma delegates found:\n' + violations.join('\n'));
  process.exit(1);
}
console.log(`Unsupported Prisma delegate check passed (${delegates.size} schema models).`);
