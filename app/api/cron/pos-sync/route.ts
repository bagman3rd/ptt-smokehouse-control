import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncPosConnection } from '@/lib/pos/sync';
function authorized(r:Request){ const token=process.env.POS_CRON_SECRET||''; return token.length>=24 && r.headers.get('authorization')===`Bearer ${token}`; }
export async function POST(request:Request){ if(!authorized(request)) return NextResponse.json({ok:false},{status:401}); const connections=await prisma.posConnection.findMany({where:{automaticSyncEnabled:true,status:{in:['CONNECTED','DEGRADED']}},take:25,orderBy:{lastSuccessfulSyncAt:'asc'}}); const results=[]; for(const c of connections){ try{ results.push({id:c.id,...await syncPosConnection(c.id,'SCHEDULED')}); }catch(e){ results.push({id:c.id,ok:false,error:e instanceof Error?e.message:'failed'}); } } return NextResponse.json({ok:true,processed:results.length,results}); }
