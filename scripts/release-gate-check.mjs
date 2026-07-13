#!/usr/bin/env node
import fs from 'node:fs';
const required=['CI','GITHUB_RUN_ID','GITHUB_SHA'];
const missing=required.filter(k=>!process.env[k]);
if(missing.length) throw new Error(`Release packaging is CI-only. Missing: ${missing.join(', ')}`);
if(process.env.CI!=='true') throw new Error('CI must equal true.');
const evidence={build:'7.8.3',runId:process.env.GITHUB_RUN_ID,sha:process.env.GITHUB_SHA,createdAt:new Date().toISOString()};
fs.writeFileSync('RELEASE_EVIDENCE.json',JSON.stringify(evidence,null,2)+'\n');
console.log(`Release gate passed for GitHub run ${evidence.runId}.`);
