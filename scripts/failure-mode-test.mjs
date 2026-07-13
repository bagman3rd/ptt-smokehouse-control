import fs from 'fs';
const quick=fs.readFileSync('app/end-of-day/QuickEndOfDayForm.tsx','utf8'); if(!quick.includes('data-testid')) throw new Error('Quick EOD lacks stable selectors');
const health=fs.readFileSync('app/api/health/db/route.ts','utf8'); if(/error\.message/.test(health)) throw new Error('DB health leaks raw errors');
console.log('PASS failure-mode static checks');
