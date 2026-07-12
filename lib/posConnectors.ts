import { getPosProvider } from '@/lib/posProviders';

export type NormalizedPosLine = {
  externalLocationId: string;
  externalOrderId: string;
  externalLineId: string;
  externalItemId: string;
  businessDate: Date;
  orderedAt: Date;
  itemName: string;
  category: string;
  quantity: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  voided: boolean;
  orderChannel: string;
  modifiers: string[];
};

const demoItems = [
  ['brisket-sandwich', 'Brisket Sandwich', 'Sandwiches', 0.25, 14.5],
  ['pulled-pork-plate', 'Pulled Pork Plate', 'Plates', 0.5, 18.0],
  ['half-rack-ribs', 'Half Rack Ribs', 'Plates', 0.5, 22.0],
  ['chicken-plate', 'Chicken Plate', 'Plates', 1, 17.0],
  ['three-meat-combo', 'Three Meat Combo', 'Combos', 1, 29.0]
] as const;

export function connectorCapabilities(providerId: string) {
  const provider = getPosProvider(providerId);
  if (!provider) throw new Error('Unsupported POS provider.');
  return {
    providerId,
    providerName: provider.name,
    locations: true,
    catalog: true,
    itemMix: true,
    modifiers: true,
    payments: true,
    refunds: true,
    webhooks: provider.supportsWebhooks,
    access: provider.access
  };
}

export function demoCatalog(providerId: string) {
  return demoItems.map(([id, name, category]) => ({ externalItemId: `${providerId}-${id}`, externalVariationId: '', name, category }));
}

export function demoOrderLines(providerId: string, days = 7): NormalizedPosLine[] {
  const now = new Date();
  const rows: NormalizedPosLine[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset));
    demoItems.forEach(([id, name, category, quantityFactor, price], index) => {
      const quantity = Math.max(1, Math.round((12 + ((day.getUTCDate() + index * 7) % 19)) * quantityFactor));
      const gross = Number((quantity * price).toFixed(2));
      const discount = index === 4 ? Number((gross * 0.03).toFixed(2)) : 0;
      rows.push({
        externalLocationId: `${providerId}-demo-location`, externalOrderId: `${providerId}-${day.toISOString().slice(0,10)}-${index}`,
        externalLineId: `line-${index}`, externalItemId: `${providerId}-${id}`, businessDate: day,
        orderedAt: new Date(day.getTime() + (11 + index) * 3600000), itemName: name, category, quantity,
        grossSales: gross, discounts: discount, refunds: 0, netSales: gross - discount, voided: false,
        orderChannel: index % 3 === 0 ? 'TAKEOUT' : 'DINE_IN', modifiers: name.includes('Combo') ? ['Brisket', 'Pulled Pork', 'Ribs'] : []
      });
    });
  }
  return rows;
}
