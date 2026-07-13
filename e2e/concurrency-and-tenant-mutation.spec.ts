import { test, expect, type APIRequestContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();
const adminPassword=process.env.ADMIN_PASSWORD || 'ci-admin-password';
const tenantBPassword=process.env.CI_TENANT_B_PASSWORD || 'ci-tenant-b-password';
async function login(request: APIRequestContext, username: string, password: string) {
 const r=await request.post('/api/login',{form:{username,password},maxRedirects:0}); expect([302,303,307,308]).toContain(r.status());
}
test.afterAll(async()=>prisma.$disconnect());
test('two simultaneous Quick EOD submissions converge to one tenant-scoped row per protein', async ({ playwright }) => {
 const a=await playwright.request.newContext({baseURL:'http://127.0.0.1:3000'});
 const b=await playwright.request.newContext({baseURL:'http://127.0.0.1:3000'});
 await login(a,'admin',adminPassword); await login(b,'admin',adminPassword);
 const restaurant=await prisma.restaurant.findFirstOrThrow({where:{slug:'pigeon-toed-tavern'}});
 const proteins=await prisma.protein.findMany({where:{restaurantId:restaurant.id,active:true}});
 const serviceDate='2034-07-13';
 const payload={mode:'QUICK',serviceDate,status:'COMPLETE',totalSales:0,bbqSales:0,notes:'concurrency test',lockLog:false,proteins:proteins.map(p=>({proteinId:p.id,sealedUnopenedUnits:1,openedMeatLb:0}))};
 const [r1,r2]=await Promise.all([a.post('/api/end-of-day',{data:payload}),b.post('/api/end-of-day',{data:payload})]);
 expect([200,409]).toContain(r1.status()); expect([200,409]).toContain(r2.status()); expect([r1.status(),r2.status()].filter(s=>s===200).length).toBeGreaterThanOrEqual(1);
 const log=await prisma.endOfDayLog.findUniqueOrThrow({where:{restaurantId_serviceDate:{restaurantId:restaurant.id,serviceDate:new Date(serviceDate+'T00:00:00.000Z')}},include:{proteinLogs:true}});
 expect(new Set(log.proteinLogs.map(x=>x.proteinId)).size).toBe(log.proteinLogs.length);
 await a.dispose(); await b.dispose();
});
test('tenant B cannot mutate tenant A cook plan', async ({ playwright }) => {
 const tenantA=await prisma.restaurant.findFirstOrThrow({where:{slug:'pigeon-toed-tavern'}});
 const plan=await prisma.cookPlan.findFirstOrThrow({where:{restaurantId:tenantA.id},orderBy:{createdAt:'desc'}});
 const ctx=await playwright.request.newContext({baseURL:'http://127.0.0.1:3000'}); await login(ctx,'tenantb',tenantBPassword);
 const response=await ctx.post('/api/admin/tenant/delete',{form:{restaurantId:tenantA.id,confirm:tenantA.name},maxRedirects:0});
 expect([302,303,307,308]).toContain(response.status());
 const unchanged=await prisma.restaurant.findUniqueOrThrow({where:{id:tenantA.id}}); expect(unchanged.active).toBe(true);
 const planStillExists=await prisma.cookPlan.findUnique({where:{id:plan.id}}); expect(planStillExists?.restaurantId).toBe(tenantA.id);
 await ctx.dispose();
});
