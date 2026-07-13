import { createHmac, timingSafeEqual } from 'crypto';
import { decryptSecret } from '@/lib/secretEncryption';
import type { PosConnection } from '@prisma/client';
import type { PosConnector, PosLocation, PosMenuItemRecord, PosOrderPage, PosOrderRecord } from './types';

function env() { return process.env.POS_SQUARE_ENV === 'production' ? 'production' : 'sandbox'; }
export function squareBase() { return env() === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'; }
export function squareAppId() { return process.env.SQUARE_APPLICATION_ID || ''; }
export function squareAppSecret() { return process.env.SQUARE_APPLICATION_SECRET || ''; }
export function squareWebhookKey() { return process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || ''; }
export function squareOAuthUrl(state: string, redirectUri: string) {
  const u = new URL(`${squareBase()}/oauth2/authorize`);
  u.searchParams.set('client_id', squareAppId());
  u.searchParams.set('scope', 'MERCHANT_PROFILE_READ ITEMS_READ ORDERS_READ PAYMENTS_READ');
  u.searchParams.set('session', 'false');
  u.searchParams.set('state', state);
  u.searchParams.set('redirect_uri', redirectUri);
  return u.toString();
}
export async function exchangeSquareCode(code: string, redirectUri: string) {
  const r = await fetch(`${squareBase()}/oauth2/token`, { method:'POST', headers:{'Content-Type':'application/json','Square-Version':'2025-04-16'}, body:JSON.stringify({client_id:squareAppId(),client_secret:squareAppSecret(),code,grant_type:'authorization_code',redirect_uri:redirectUri}) });
  if (!r.ok) throw new Error('Square authorization could not be completed.');
  return r.json() as Promise<{access_token:string;refresh_token?:string;expires_at?:string;merchant_id?:string}>;
}
function cents(m:any){ return Number(m?.amount || 0); }
export class SquareConnector implements PosConnector {
  provider = 'SQUARE' as const;
  constructor(private connection: PosConnection) {}
  private token(){ const t=decryptSecret(this.connection.encryptedAccessToken); if(!t) throw new Error('Square connection has no access token.'); return t; }
  private async call(path:string, init?:RequestInit){ const r=await fetch(`${squareBase()}/v2${path}`,{...init,headers:{Authorization:`Bearer ${this.token()}`,'Content-Type':'application/json','Square-Version':'2025-04-16',...(init?.headers||{})}}); if(r.status===401) throw new Error('Square authorization expired. Reconnect Square.'); if(!r.ok) throw new Error(`Square request failed (${r.status}).`); return r.json(); }
  async listLocations(): Promise<PosLocation[]> { const j:any=await this.call('/locations'); return (j.locations||[]).map((x:any)=>({id:x.id,name:x.name||x.id,merchantId:x.merchant_id||null})); }
  async fetchMenu(): Promise<PosMenuItemRecord[]> { const out:PosMenuItemRecord[]=[]; let cursor:string|undefined; do { const q=cursor?`?types=ITEM&cursor=${encodeURIComponent(cursor)}`:'?types=ITEM'; const j:any=await this.call(`/catalog/list${q}`); for(const o of j.objects||[]) out.push({id:o.id,name:o.item_data?.name||o.id,categoryName:null,active:!o.is_deleted}); cursor=j.cursor; } while(cursor); return out; }
  async fetchOrders(start:Date,end:Date,cursor?:string|null): Promise<PosOrderPage> { const body:any={location_ids:[this.connection.externalLocationId],query:{filter:{date_time_filter:{closed_at:{start_at:start.toISOString(),end_at:end.toISOString()}},state_filter:{states:['COMPLETED','CANCELED']}}},limit:500}; if(cursor) body.cursor=cursor; const j:any=await this.call('/orders/search',{method:'POST',body:JSON.stringify(body)}); const orders:PosOrderRecord[]=(j.orders||[]).map((o:any)=>{ const lines=(o.line_items||[]).map((l:any)=>({id:l.uid||`${o.id}:${l.catalog_object_id||l.name}`,itemId:l.catalog_object_id||null,name:l.name||'Unnamed item',quantity:Number(l.quantity||0),grossCents:cents(l.gross_sales_money),discountCents:cents(l.total_discount_money),netCents:cents(l.total_money),taxCents:cents(l.total_tax_money),refundCents:0,voided:Boolean(l.voided),modifiers:(l.modifiers||[]).map((m:any)=>m.name).filter(Boolean)})); return {id:o.id,checkId:null,businessDate:new Date(o.closed_at||o.created_at),openedAt:o.created_at?new Date(o.created_at):null,closedAt:o.closed_at?new Date(o.closed_at):null,grossCents:cents(o.gross_amount_money),discountCents:cents(o.total_discount_money),netCents:cents(o.total_money),taxCents:cents(o.total_tax_money),tipCents:cents(o.total_tip_money),refundCents:0,serviceChargeCents:cents(o.total_service_charge_money),voided:o.state==='CANCELED',diningOption:o.fulfillments?.[0]?.type||null,revenueCenter:null,updatedAt:o.updated_at?new Date(o.updated_at):null,lines,raw:o}; }); return {orders,cursor:j.cursor||null}; }
  async testConnection(){ try { const l=await this.listLocations(); return {ok:true,message:`Connected to Square (${l.length} location${l.length===1?'':'s'}).`}; } catch(e){ return {ok:false,message:e instanceof Error?e.message:'Square connection failed.'}; } }
}
export function verifySquareWebhook(body:string, signature:string|null, notificationUrl:string){ const key=squareWebhookKey(); if(!key||!signature) return false; const digest=createHmac('sha256',key).update(notificationUrl+body).digest('base64'); const a=Buffer.from(digest),b=Buffer.from(signature); return a.length===b.length&&timingSafeEqual(a,b); }
