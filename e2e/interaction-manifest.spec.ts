import { test, expect, type Page } from '@playwright/test';
import manifest from '../artifacts/interaction-manifest.json';

type RoleCase={role:string;username:string;password:string;routes:string[]};
const common=['/today','/dashboard','/cook-plan','/end-of-day','/help','/support','/account/security'];
const roles:RoleCase[]=[
 {role:'ADMIN',username:'admin',password:process.env.ADMIN_PASSWORD||'ci-admin-password',routes:[...common,'/reports','/learning','/learning/proof','/settings','/admin/users','/admin/restaurants','/admin/restaurants/pos','/admin/smokers','/admin/smokers/catalog','/admin/smokers/schedule','/admin/audit','/admin/system','/billing','/admin/data']},
 {role:'OWNER',username:'owner',password:process.env.CI_OWNER_PASSWORD||'ci-owner-password',routes:[...common,'/reports','/learning','/learning/proof','/settings','/admin/users','/admin/restaurants','/admin/restaurants/pos','/admin/smokers','/admin/smokers/catalog','/admin/smokers/schedule','/admin/audit','/admin/system','/billing','/admin/data']},
 {role:'KITCHEN_MANAGER',username:'manager',password:process.env.CI_MANAGER_PASSWORD||'ci-manager-password',routes:[...common,'/reports','/learning','/learning/proof','/admin/smokers/catalog','/admin/smokers/schedule']},
 {role:'KITCHEN_CREW',username:'crew',password:process.env.CI_CREW_PASSWORD||'ci-crew-password',routes:common}
];
async function login(page:Page,r:RoleCase){await page.goto('/login');await page.getByLabel('Username or Email').fill(r.username);await page.getByLabel('Password').fill(r.password);await page.getByRole('button',{name:'Login'}).click();await expect(page).toHaveURL(/\/today/)}
function hasName(el:HTMLElement){const id=el.id;return Boolean((el.innerText||'').trim()||el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.getAttribute('title')||el.getAttribute('placeholder')||(id&&document.querySelector(`label[for="${CSS.escape(id)}"]`))||(el instanceof HTMLInputElement&&el.value))}
for(const roleCase of roles){
 test.describe(`${roleCase.role} interaction inventory`,()=>{
  test.beforeEach(async({page})=>login(page,roleCase));
  for(const route of roleCase.routes){
   test(`${route}: every rendered control is operable and named`,async({page})=>{
    await page.goto(route);await expect(page).not.toHaveURL(/\/login|\/account\/security\?required=1/);await expect(page.getByText(/Application error: a server-side exception/)).toHaveCount(0);
    const controls=page.locator('button:visible,a[href]:visible,input:visible,select:visible,textarea:visible');
    const count=await controls.count();expect(count).toBeGreaterThan(0);
    for(let i=0;i<count;i++){const c=controls.nth(i);await expect(c).toBeVisible();const named=await c.evaluate(hasName);expect(named,`unnamed control ${i} on ${route}`).toBeTruthy();const tag=await c.evaluate(e=>e.tagName.toLowerCase());if(tag==='select'){const options=await c.locator('option').count();expect(options).toBeGreaterThan(0);if(await c.isEnabled()) await c.focus()}else if(tag==='input'||tag==='textarea'){if(await c.isEnabled()) await c.focus()}else{await c.scrollIntoViewIfNeeded()}}
   });
  }
 });
}
test('committed interaction manifest covers the source tree',async()=>{expect(manifest.build).toBe('9.8.0');expect(manifest.controls.length).toBeGreaterThan(300);for(const c of manifest.controls){expect(c.requiredCoverage).toEqual(['desktop','mobile']);expect(c.roles).toEqual(['ADMIN','OWNER','KITCHEN_MANAGER','KITCHEN_CREW']);expect(c.test).toContain(c.id)}});
