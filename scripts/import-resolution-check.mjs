// Build 11.0.4 — static import-resolution guard.
//
// Catches "Module not found: Can't resolve './x'" errors BEFORE they reach
// `next build` on Render. This is the class of bug that slips through when the
// production build cannot be run locally (e.g. Prisma engine unavailable in a
// restricted sandbox): a relative import that points at the wrong directory.
//
// Verifies every relative ('./', '../') and alias ('@/') import in the app,
// lib, components, scripts, and e2e trees resolves to a real file.
// Run: node scripts/import-resolution-check.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === '.git') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) files.push(p);
  }
}
for (const d of ['app', 'lib', 'components', 'scripts', 'e2e']) if (fs.existsSync(d)) walk(d);

const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'];

function fileResolves(target) {
  for (const e of ['', ...exts]) {
    if (fs.existsSync(target + e) && fs.statSync(target + e).isFile()) return true;
  }
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    for (const e of exts) if (fs.existsSync(path.join(target, 'index' + e))) return true;
  }
  return false;
}

function resolvesRelative(fromFile, spec) {
  return fileResolves(path.resolve(path.dirname(fromFile), spec));
}
function resolvesAlias(spec) {
  // tsconfig maps "@/*" -> "./*"
  return fileResolves(path.resolve(root, spec.slice(2)));
}

const problems = [];
const importRe =
  /(?:import|export)\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const m of text.matchAll(importRe)) {
    const spec = m[1] || m[2] || m[3];
    if (!spec) continue;
    if (spec.startsWith('.')) {
      if (!resolvesRelative(file, spec)) problems.push(`${file}: unresolved relative import '${spec}'`);
    } else if (spec.startsWith('@/')) {
      if (!resolvesAlias(spec)) problems.push(`${file}: unresolved alias import '${spec}'`);
    }
  }
}

if (problems.length) {
  console.error('import-resolution-check: FAIL — these would break `next build`:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

// ---- Additional build-would-fail structural checks ------------------------
const structural = [];

// Every page.tsx needs a default export.
for (const f of files.filter((f) => /app\/.*\/page\.tsx$/.test(f) || /app\/page\.tsx$/.test(f))) {
  if (!/export\s+default/.test(fs.readFileSync(f, 'utf8'))) {
    structural.push(`${f}: page is missing a default export`);
  }
}
// Every API route needs at least one HTTP handler export.
for (const f of files.filter((f) => /app\/api\/.*route\.ts$/.test(f))) {
  const t = fs.readFileSync(f, 'utf8');
  if (!/export\s+(async\s+)?(function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/.test(t)) {
    structural.push(`${f}: API route exports no HTTP handler`);
  }
}
// Client components must not import server-only modules.
for (const f of files.filter((f) => /\.(tsx|ts)$/.test(f))) {
  const t = fs.readFileSync(f, 'utf8');
  if (/^['"]use client['"]/m.test(t.trimStart().split('\n')[0] || '') || /^\s*['"]use client['"]/.test(t)) {
    if (/from\s+['"]@\/lib\/prisma['"]/.test(t)) {
      structural.push(`${f}: 'use client' component imports @/lib/prisma (server-only)`);
    }
  }
}

if (structural.length) {
  console.error('import-resolution-check: FAIL — structural issues that break `next build`:');
  for (const p of structural) console.error('  ' + p);
  process.exit(1);
}

console.log(`import-resolution-check: PASS — all relative and @/ imports resolve across ${files.length} files.`);
