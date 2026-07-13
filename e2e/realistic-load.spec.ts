import { test, expect } from '@playwright/test';
const users=Number(process.env.LOAD_USERS || 12);
const password=process.env.ADMIN_PASSWORD || 'ci-admin-password';
function percentile(values:number[],p:number){const s=[...values].sort((a,b)=>a-b); return s[Math.min(s.length-1,Math.floor((p/100)*s.length))]||0;}
test(`${users} separate sessions sustain mixed read/write traffic`, async ({ playwright }) => {
 const contexts=await Promise.all(Array.from({length:users},(_,index)=>playwright.request.newContext({baseURL:'http://127.0.0.1:3000',extraHTTPHeaders:{'x-forwarded-for':`10.77.0.${index+10}`}})));
 const latencies:number[]=[]; const statuses:number[]=[];
 await Promise.all(contexts.map(async (ctx,index)=>{
   const loginStart=Date.now(); const login=await ctx.post('/api/login',{form:{username:'admin',password},maxRedirects:0}); latencies.push(Date.now()-loginStart); statuses.push(login.status());
   for (const path of ['/today','/cook-plan','/end-of-day','/reports']) { const start=Date.now(); const r=await ctx.get(path,{timeout:30000}); latencies.push(Date.now()-start); statuses.push(r.status()); }
   const start=Date.now(); const bad=await ctx.post('/api/cook-plan',{data:{serviceDate:'not-a-date',eventMultiplier:1}}); latencies.push(Date.now()-start); statuses.push(bad.status());
 }));
 expect(statuses.filter(s=>s>=500)).toHaveLength(0);
 expect(statuses.filter(s=>s===200).length).toBeGreaterThanOrEqual(users*4);
 expect(statuses.filter(s=>s===400).length).toBe(users);
 const p95=percentile(latencies,95), p99=percentile(latencies,99);
 console.log(JSON.stringify({users,requests:latencies.length,p50:percentile(latencies,50),p95,p99}));
 expect(p95).toBeLessThan(5000); expect(p99).toBeLessThan(10000);
 await Promise.all(contexts.map(c=>c.dispose()));
});
