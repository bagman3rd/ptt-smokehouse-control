export type PosParsedRow = {
  serviceDate: string;
  itemName: string;
  quantity: number;
  grossSales: number;
  valid: boolean;
  reason?: string;
};

export type PosMappingLite = {
  normalizedName: string;
  proteinId: string | null;
  proteinName?: string | null;
  portionSizeLb: number;
  yieldFactor: number;
  active: boolean;
};

export type PosPreviewRow = PosParsedRow & {
  normalizedName: string;
  mappedProteinId: string | null;
  mappedProteinName: string | null;
  portionSizeLb: number;
  estimatedCookedLb: number;
  unmapped: boolean;
};

export function normalizePosItemName(value: string) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parsePosCsv(csv: string): PosParsedRow[] {
  return String(csv || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).flatMap((line): PosParsedRow[] => {
    if (/^(date|serviceDate)\s*,/i.test(line)) return [];
    const [dateRaw = '', itemRaw = '', qtyRaw = '', salesRaw = ''] = line.split(',').map((part) => part.trim());
    const itemName = itemRaw || 'Unlabeled POS item';
    const quantity = qtyRaw === '' ? 1 : Number(qtyRaw);
    const grossSales = Number(salesRaw);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return [{ serviceDate: dateRaw, itemName, quantity: 0, grossSales: 0, valid: false, reason: 'Invalid date. Use YYYY-MM-DD.' }];
    if (!itemRaw) return [{ serviceDate: dateRaw, itemName, quantity: 0, grossSales: 0, valid: false, reason: 'Missing item name.' }];
    if (!Number.isFinite(quantity) || quantity <= 0) return [{ serviceDate: dateRaw, itemName, quantity: 0, grossSales: 0, valid: false, reason: 'Invalid quantity.' }];
    if (!Number.isFinite(grossSales) || grossSales < 0) return [{ serviceDate: dateRaw, itemName, quantity, grossSales: 0, valid: false, reason: 'Invalid gross sales.' }];
    return [{ serviceDate: dateRaw, itemName, quantity, grossSales, valid: true }];
  });
}

export function buildPosPreviewRows(rows: PosParsedRow[], mappings: PosMappingLite[]): PosPreviewRow[] {
  const map = new Map(mappings.filter((m) => m.active).map((m) => [m.normalizedName, m]));
  return rows.map((row) => {
    const normalizedName = normalizePosItemName(row.itemName);
    const mapping = map.get(normalizedName) || null;
    const portionSizeLb = mapping?.portionSizeLb || 0;
    const estimatedCookedLb = row.valid && mapping?.proteinId ? Math.round(row.quantity * portionSizeLb * (mapping.yieldFactor || 1) * 1000) / 1000 : 0;
    return {
      ...row,
      normalizedName,
      mappedProteinId: mapping?.proteinId || null,
      mappedProteinName: mapping?.proteinName || null,
      portionSizeLb,
      estimatedCookedLb,
      unmapped: row.valid && !mapping?.proteinId
    };
  });
}

export function summarizePosPreview(rows: PosPreviewRow[]) {
  const validRows = rows.filter((row) => row.valid);
  const invalidRows = rows.filter((row) => !row.valid);
  const unmappedRows = validRows.filter((row) => row.unmapped);
  const totalSales = validRows.reduce((sum, row) => sum + row.grossSales, 0);
  const estimatedCookedLb = validRows.reduce((sum, row) => sum + row.estimatedCookedLb, 0);
  const byProtein = new Map<string, { proteinId: string | null; proteinName: string; grossSales: number; estimatedCookedLb: number; quantity: number; rows: number }>();
  for (const row of validRows) {
    const key = row.mappedProteinId || 'unmapped';
    const current = byProtein.get(key) || { proteinId: row.mappedProteinId, proteinName: row.mappedProteinName || 'Unmapped', grossSales: 0, estimatedCookedLb: 0, quantity: 0, rows: 0 };
    current.grossSales += row.grossSales;
    current.estimatedCookedLb += row.estimatedCookedLb;
    current.quantity += row.quantity;
    current.rows += 1;
    byProtein.set(key, current);
  }
  return { rowCount: rows.length, validRowCount: validRows.length, invalidRowCount: invalidRows.length, unmappedCount: unmappedRows.length, totalSales, estimatedCookedLb, byProtein: Array.from(byProtein.values()) };
}
