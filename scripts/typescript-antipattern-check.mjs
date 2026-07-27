// Build 11.0.2 — TypeScript anti-pattern guard.
//
// Catches build-breaking TS *syntax/semantic* errors that do NOT depend on the
// generated Prisma client, so they can be caught offline in environments where
// `next build` / `tsc` cannot run (Prisma engine unavailable).
//
// These are the errors that have actually broken deploys:
//   * `as const` applied to a ternary/expression (only literals/arrays/objects
//     may take `as const`).  -> TS1355 "A 'const' assertions can only be applied
//     to references to enum members, or string, number, boolean, array, or
//     object literals."
//
// The guard is deliberately conservative (few, well-understood patterns) to
// avoid false positives. It complements — does not replace — a real `tsc`/
// `next build` in a Prisma-enabled CI runner.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', '.typecheck'].includes(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx?|mts|cts)$/.test(ent.name)) files.push(p);
  }
}
for (const d of ['app', 'lib', 'components', 'scripts']) if (fs.existsSync(d)) walk(d);

const problems = [];

// Strip line/block comments and string/template contents so patterns don't match
// inside comments or string literals (which is where they're legitimately named,
// e.g. in this file's own documentation or in test assertions).
function stripNonCode(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let state = 'code'; // code | line | block | sq | dq | tpl
  while (i < n) {
    const c = src[i];
    const c2 = src[i + 1];
    if (state === 'code') {
      if (c === '/' && c2 === '/') { state = 'line'; i += 2; continue; }
      if (c === '/' && c2 === '*') { state = 'block'; i += 2; continue; }
      if (c === "'") { state = 'sq'; out += ' '; i++; continue; }
      if (c === '"') { state = 'dq'; out += ' '; i++; continue; }
      if (c === '`') { state = 'tpl'; out += ' '; i++; continue; }
      out += c; i++; continue;
    }
    if (state === 'line') { if (c === '\n') { state = 'code'; out += '\n'; } i++; continue; }
    if (state === 'block') { if (c === '*' && c2 === '/') { state = 'code'; i += 2; } else i++; continue; }
    if (state === 'sq') { if (c === '\\') { i += 2; continue; } if (c === "'") state = 'code'; i++; continue; }
    if (state === 'dq') { if (c === '\\') { i += 2; continue; } if (c === '"') state = 'code'; i++; continue; }
    if (state === 'tpl') { if (c === '\\') { i += 2; continue; } if (c === '`') state = 'code'; i++; continue; }
  }
  return out;
}

// Pattern: `) as const` where the thing before the `)` group is a ternary or
// other expression. Legal `as const` targets end with a literal, identifier
// member, `]` (array literal) or `}` (object literal). A `)` immediately before
// `as const` that closes a parenthesized *expression* (esp. containing `?`/`:`)
// is the illegal form (TS1355).
function checkAsConst(codeOnly, file) {
  const re = /\)\s*as\s+const/g;
  let m;
  while ((m = re.exec(codeOnly))) {
    // Find the matching opening paren for this ')'.
    let depth = 0;
    let j = m.index;
    for (; j >= 0; j--) {
      if (codeOnly[j] === ')') depth++;
      else if (codeOnly[j] === '(') { depth--; if (depth === 0) break; }
    }
    if (j < 0) continue;
    const inner = codeOnly.slice(j + 1, m.index);
    // Ternary inside the parens => illegal `as const` target.
    if (/\?[^?]*:/.test(inner)) {
      const line = codeOnly.slice(0, m.index).split('\n').length;
      problems.push(`${file}:${line}: 'as const' applied to a parenthesized ternary/expression (TS1355). Use an explicit return type or annotate the literal instead.`);
    }
  }
}

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const codeOnly = stripNonCode(src);
  checkAsConst(codeOnly, file);
}

if (problems.length) {
  console.error('typescript-antipattern-check: FAIL — build-breaking TS patterns found:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`typescript-antipattern-check: PASS — no build-breaking TS anti-patterns across ${files.length} files.`);
