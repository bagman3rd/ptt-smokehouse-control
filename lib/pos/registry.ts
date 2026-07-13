import type { PosProvider } from '@prisma/client';
export const POS_PROVIDERS: Array<{ provider: PosProvider; name: string; wave: number; connectMode: 'oauth'|'partner'|'enterprise'; enabled: boolean }> = [
  { provider: 'SQUARE', name: 'Square', wave: 1, connectMode: 'oauth', enabled: true },
  { provider: 'TOAST', name: 'Toast', wave: 1, connectMode: 'partner', enabled: false },
  { provider: 'CLOVER', name: 'Clover', wave: 2, connectMode: 'oauth', enabled: false },
  { provider: 'LIGHTSPEED', name: 'Lightspeed Restaurant', wave: 2, connectMode: 'oauth', enabled: false },
  { provider: 'TOUCHBISTRO', name: 'TouchBistro', wave: 3, connectMode: 'partner', enabled: false },
  { provider: 'SPOTON', name: 'SpotOn', wave: 3, connectMode: 'partner', enabled: false },
  { provider: 'REVEL', name: 'Revel', wave: 3, connectMode: 'partner', enabled: false },
  { provider: 'ORACLE_SIMPHONY', name: 'Oracle Simphony', wave: 4, connectMode: 'enterprise', enabled: false },
  { provider: 'NCR_ALOHA', name: 'NCR Aloha', wave: 4, connectMode: 'enterprise', enabled: false },
  { provider: 'PAR_BRINK', name: 'PAR Brink', wave: 4, connectMode: 'enterprise', enabled: false }
];
