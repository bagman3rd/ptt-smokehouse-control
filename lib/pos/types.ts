import type { PosProvider } from '@prisma/client';

export type PosLocation = { id: string; name: string; merchantId?: string | null };
export type PosMenuItemRecord = { id: string; name: string; categoryName?: string | null; active?: boolean };
export type PosLine = { id: string; itemId?: string | null; name: string; quantity: number; grossCents: number; discountCents: number; netCents: number; taxCents: number; refundCents: number; voided: boolean; modifiers: string[] };
export type PosOrderRecord = { id: string; checkId?: string | null; businessDate: Date; openedAt?: Date | null; closedAt?: Date | null; grossCents: number; discountCents: number; netCents: number; taxCents: number; tipCents: number; refundCents: number; serviceChargeCents: number; voided: boolean; diningOption?: string | null; revenueCenter?: string | null; updatedAt?: Date | null; lines: PosLine[]; raw: unknown };
export type PosOrderPage = { orders: PosOrderRecord[]; cursor?: string | null };
export interface PosConnector {
  provider: PosProvider;
  listLocations(): Promise<PosLocation[]>;
  fetchMenu(): Promise<PosMenuItemRecord[]>;
  fetchOrders(start: Date, end: Date, cursor?: string | null): Promise<PosOrderPage>;
  testConnection(): Promise<{ ok: boolean; message: string }>;
}
