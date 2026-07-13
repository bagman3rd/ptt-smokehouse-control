import fs from 'node:fs';
const connect = fs.readFileSync('app/api/pos/square/connect/route.ts','utf8');
const callback = fs.readFileSync('app/api/pos/square/callback/route.ts','utf8');
const helper = fs.readFileSync('lib/pos/publicUrl.ts','utf8');
const square = fs.readFileSync('lib/pos/square.ts','utf8');
for (const source of [connect, callback]) {
  if (source.includes("process.env.APP_URL||'http://localhost:3000'")) throw new Error('OAuth route still contains localhost fallback');
  if (!source.includes('requestOrigin(request)')) throw new Error('OAuth route must redirect on the actual request origin');
}
if (!helper.includes('Never let a loopback development callback override a deployed request')) throw new Error('Missing deployed-origin protection');
if (!square.includes("u.searchParams.set('redirect_uri', redirectUri)")) throw new Error('Square authorize URL must include the callback URI');
if (!square.includes('exchangeSquareCode(code: string, redirectUri: string)')) throw new Error('Token exchange must use the same callback URI');
console.log('POS OAuth origin contract passed');
