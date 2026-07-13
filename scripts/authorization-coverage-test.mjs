import fs from 'fs'; import path from 'path';
const roots=['app/admin']; const files=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?walk(p):/\.(ts|tsx)$/.test(e.name)&&files.push(p)}}; roots.forEach(r=>walk(r));
const protectedFiles=files.filter(f=>/(page|actions|route)\.(ts|tsx)$/.test(f)); const bad=protectedFiles.filter(f=>{const s=fs.readFileSync(f,'utf8'); return !/(requireRole|requireApiRole|requireAuth)/.test(s)});
if(bad.length) throw new Error('Privileged files missing authorization guard: '+bad.join(', ')); console.log('PASS authorization coverage',protectedFiles.length);
