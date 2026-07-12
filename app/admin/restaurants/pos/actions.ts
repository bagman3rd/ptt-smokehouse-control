'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';
import { buildPosPreviewRows, normalizePosItemName, parsePosCsv, summarizePosPreview } from '@/lib/posImport';

function clean(value: FormDataEntryValue | null) {
  return String(value || '').trim();
}

function numberField(formData: FormData, key: string, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const raw = formData.get(key);
  const n = raw === null || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export async function saveMenuItemMapping(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const posItemName = clean(formData.get('posItemName'));
  if (!posItemName) throw new Error('POS item name is required.');
  const proteinId = clean(formData.get('proteinId')) || null;
  if (proteinId) {
    const protein = await prisma.protein.findFirst({ where: { id: proteinId, restaurantId: restaurant.id, active: true } });
    if (!protein) throw new Error('Protein not found for this restaurant.');
  }
  const normalizedName = normalizePosItemName(posItemName);
  const data = {
    restaurantId: restaurant.id,
    posItemName,
    normalizedName,
    proteinId,
    portionSizeLb: numberField(formData, 'portionSizeLb', 0, 0, 50),
    yieldFactor: numberField(formData, 'yieldFactor', 1, 0.1, 5),
    active: formData.get('active') === 'on',
    source: clean(formData.get('source')) || 'CSV'
  };
  const existing = await prisma.menuItemMapping.findUnique({ where: { restaurantId_normalizedName: { restaurantId: restaurant.id, normalizedName } } });
  const saved = existing
    ? await prisma.menuItemMapping.update({ where: { id: existing.id }, data })
    : await prisma.menuItemMapping.create({ data });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: existing ? 'UPDATE_POS_MENU_MAPPING' : 'CREATE_POS_MENU_MAPPING', entity: 'MenuItemMapping', entityId: saved.id, beforeJson: existing, afterJson: data });
  revalidatePath('/admin/restaurants/pos');
}

export async function importPosItemCsv(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const restaurantId = restaurant.id;
  const csv = clean(formData.get('posCsv'));
  if (!csv) throw new Error('Paste POS item-sales CSV first.');
  const parsed = parsePosCsv(csv);
  const mappingRows = await prisma.menuItemMapping.findMany({ where: { restaurantId, active: true }, include: { protein: true } });
  const mappings = mappingRows.map((row) => ({ normalizedName: row.normalizedName, proteinId: row.proteinId, proteinName: row.protein?.name || null, portionSizeLb: row.portionSizeLb, yieldFactor: row.yieldFactor, active: row.active }));
  const previewRows = buildPosPreviewRows(parsed, mappings);
  const summary = summarizePosPreview(previewRows);
  if (summary.validRowCount < 1) throw new Error('No valid POS item rows found. Required columns: date,itemName,quantity,grossSales.');
  if (summary.invalidRowCount > 0) throw new Error('Fix invalid POS rows before import.');
  const requireMapped = formData.get('requireMapped') === 'on';
  if (requireMapped && summary.unmappedCount > 0) throw new Error('Map all POS items before importing with require-mapped enabled.');

  const batch = await prisma.posImportBatch.create({
    data: {
      restaurantId,
      source: clean(formData.get('source')) || 'CSV',
      status: summary.unmappedCount > 0 ? 'IMPORTED_WITH_UNMAPPED' : 'IMPORTED',
      rowCount: summary.rowCount,
      validRowCount: summary.validRowCount,
      invalidRowCount: summary.invalidRowCount,
      unmappedCount: summary.unmappedCount,
      totalSales: summary.totalSales,
      bbqSales: summary.byProtein.filter((x) => x.proteinId).reduce((sum, x) => sum + x.grossSales, 0),
      importedBy: user.name,
      notes: 'POS item-sales CSV import'
    }
  });

  await prisma.posImportRow.createMany({
    data: previewRows.map((row) => ({
      restaurantId,
      batchId: batch.id,
      serviceDate: new Date(`${row.serviceDate}T00:00:00.000Z`),
      itemName: row.itemName,
      quantity: row.quantity,
      grossSales: row.grossSales,
      mappedProteinId: row.mappedProteinId,
      portionSizeLb: row.portionSizeLb,
      estimatedCookedLb: row.estimatedCookedLb,
      valid: row.valid,
      reason: row.reason || null
    }))
  });

  const daily = new Map<string, { totalSales: number; bbqSales: number }>();
  for (const row of previewRows.filter((x) => x.valid)) {
    const current = daily.get(row.serviceDate) || { totalSales: 0, bbqSales: 0 };
    current.totalSales += row.grossSales;
    if (row.mappedProteinId) current.bbqSales += row.grossSales;
    daily.set(row.serviceDate, current);
  }
  for (const [date, totals] of daily.entries()) {
    const serviceDate = new Date(`${date}T00:00:00.000Z`);
    const existing = await prisma.endOfDayLog.findFirst({ where: { restaurantId, serviceDate } });
    if (existing) {
      await prisma.endOfDayLog.update({ where: { id: existing.id }, data: { totalSales: totals.totalSales, bbqSales: totals.bbqSales, notes: 'Updated from POS item-sales import' } });
    } else {
      await prisma.endOfDayLog.create({ data: { restaurantId, serviceDate, totalSales: totals.totalSales, bbqSales: totals.bbqSales, status: 'DRAFT', enteredBy: user.name, notes: 'Created from POS item-sales import' } });
    }
  }
  await auditLog({ restaurantId, actorUserId: user.id, actorName: user.name, action: 'IMPORT_POS_ITEM_SALES', entity: 'PosImportBatch', entityId: batch.id, afterJson: { rows: summary.rowCount, validRows: summary.validRowCount, unmapped: summary.unmappedCount, byProtein: summary.byProtein } });
  revalidatePath('/admin/restaurants/pos');
  revalidatePath('/learning/proof');
  revalidatePath('/reports');
}
