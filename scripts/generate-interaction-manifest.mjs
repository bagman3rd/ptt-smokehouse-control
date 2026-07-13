#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd();
const out='artifacts/interaction-manifest.json';
const files=[];
function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()) walk(p); else if(/\.(tsx|ts)$/.test(ent.name)) files.push(p)}}
for(const dir of ['app','components']) if(fs.existsSync(dir)) walk(dir);
const patterns=[['button',/<button\b[^>]*>/g],['link',/<Link\b[^>]*>|<a\b[^>]*href=/g],['form',/<form\b[^>]*>/g],['select',/<select\b[^>]*>/g],['input',/<input\b[^>]*>/g],['textarea',/<textarea\b[^>]*>/g]];
const controls=[];
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const [type,re] of patterns){for(const m of text.matchAll(re)){const before=text.slice(0,m.index);const line=before.split('\n').length;const snippet=m[0].replace(/\s+/g,' ').slice(0,220);const id=crypto.createHash('sha1').update(`${file}:${line}:${type}:${snippet}`).digest('hex').slice(0,12);controls.push({id,file,line,type,snippet,requiredCoverage:['desktop','mobile'],roles:['ADMIN','OWNER','KITCHEN_MANAGER','KITCHEN_CREW'],test:`e2e/interaction-manifest.spec.ts#${id}`})}}}
const manifest={build:'9.8.0',generatedAt:'SOURCE_DETERMINISTIC',counts:Object.fromEntries(patterns.map(([t])=>[t,controls.filter(c=>c.type===t).length])),controls};
const body=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check')){if(!fs.existsSync(out)) throw new Error(`Missing ${out}; run pnpm interaction:manifest`);const saved=JSON.parse(fs.readFileSync(out,'utf8'));if(JSON.stringify(saved.controls)!==JSON.stringify(manifest.controls)) throw new Error('Interaction manifest is stale. Run pnpm interaction:manifest and commit it.');console.log(`Interaction manifest current: ${controls.length} controls.`)}else{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,body);console.log(`Wrote ${out} with ${controls.length} controls.`)}
