import { createHash, randomBytes, timingSafeEqual } from 'crypto';
export function generateRecoveryCodes(count = 10) { return Array.from({length:count},()=>randomBytes(5).toString('hex').toUpperCase().match(/.{1,5}/g)!.join('-')); }
export function hashRecoveryCode(code: string) { return createHash('sha256').update(code.replace(/[^A-Z0-9]/gi,'').toUpperCase()).digest('hex'); }
export function serializeRecoveryCodes(codes: string[]) { return JSON.stringify(codes.map(hashRecoveryCode)); }
export function consumeRecoveryCode(serialized: string | null | undefined, submitted: string) {
 const hashes: string[] = serialized ? JSON.parse(serialized) : []; const target=Buffer.from(hashRecoveryCode(submitted));
 const index=hashes.findIndex(h=>{const b=Buffer.from(h); return b.length===target.length && timingSafeEqual(b,target)});
 if(index<0) return null; hashes.splice(index,1); return JSON.stringify(hashes);
}
