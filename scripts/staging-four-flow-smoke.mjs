#!/usr/bin/env node
const base=(process.env.STAGING_URL||'').replace(/\/$/,''); const u=process.env.STAGING_SMOKE_USERNAME,p=process.env.STAGING_SMOKE_PASSWORD;
if(!base||!u||!p) throw new Error('STAGING_URL, STAGING_SMOKE_USERNAME and STAGING_SMOKE_PASSWORD are required.');
const health=await fetch(base+'/api/health'); const hj=await health.json(); if(!health.ok||hj.build!=='8.0.2') throw new Error(`staging build mismatch: ${JSON.stringify(hj)}`);
let cookie='';
const login=await fetch(base+'/api/login',{method:'POST',redirect:'manual',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:u,password:p})});
cookie=login.headers.get('set-cookie')||''; if(!cookie||login.status<300||login.status>=400) throw new Error(`login failed ${login.status}`);
for(const path of ['/today','/cook-plan','/end-of-day','/reports']){const r=await fetch(base+path,{headers:{cookie}}); if(!r.ok) throw new Error(`${path} failed ${r.status}`); const t=await r.text(); if(/Application error|Internal Server Error/.test(t)) throw new Error(`${path} rendered an error`);}
console.log('Staging four-flow smoke passed.');
