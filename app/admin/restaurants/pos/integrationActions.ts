'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { auditLog, currentRestaurantForUser } from '@/lib/tenant';
import { encryptSecret } from '@/lib/posCrypto';
import { connectorCapabilities, demoCatalog, demoOrderLines } from '@/lib/posConnectors';
import { getPosProvider } from '@/lib/posProviders';
import { normalizePosItemName } from '@/lib/posImport';

const text = (fd: FormData, key: string) => String(fd.get(key) || '').trim();

export async function savePosConnection(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const providerId = text(formData, 'provider');
  const provider = getPosProvider(providerId);
  if (!provider) throw new Error('Unsupported POS provider.');
  const mode = text(formData, 'mode') === 'LIVE' ? 'LIVE' : 'DEMO';
  const credential = text(formData, 'credential');
  const merchantId = text(formData, 'merchantExternalId') || null;
  if (mode === 'LIVE' && !credential) throw new Error('Live mode requires an API credential or OAuth token.');
  const existing = await prisma.posConnection.findUnique({ where: { restaurantId_provider: { restaurantId: restaurant.id, provider: providerId } } });
  const data = {
    restaurantId: restaurant.id,
    provider: providerId,
    displayName: provider.name,
    mode,
    merchantExternalId: merchantId,
    encryptedAccessToken: credential ? encryptSecret(credential) : existing?.encryptedAccessToken || null,
    credentialHint: credential ? `••••${credential.slice(-4)}` : existing?.credentialHint || null,
    status: mode === 'DEMO' ? 'CONNECTED_DEMO' : 'CONFIGURED',
    active: true,
    lastError: null
  };
  const saved = existing
    ? await prisma.posConnection.update({ where: { id: existing.id }, data })
    : await prisma.posConnection.create({ data });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: existing ? 'UPDATE_POS_CONNECTION' : 'CREATE_POS_CONNECTION', entity: 'PosConnection', entityId: saved.id, afterJson: { provider: providerId, mode, merchantId, credentialStored: Boolean(credential) } });
  revalidatePath('/admin/restaurants/pos');
}

export async function disconnectPosConnection(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const id = text(formData, 'connectionId');
  const connection = await prisma.posConnection.findFirst({ where: { id, restaurantId: restaurant.id } });
  if (!connection) throw new Error('POS connection not found.');
  await prisma.posConnection.update({ where: { id }, data: { active: false, status: 'DISCONNECTED', encryptedAccessToken: null, encryptedRefreshToken: null } });
  await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'DISCONNECT_POS', entity: 'PosConnection', entityId: id, afterJson: { provider: connection.provider } });
  revalidatePath('/admin/restaurants/pos');
}

export async function syncPosConnection(formData: FormData) {
  const user = await requireRole(['ADMIN', 'OWNER']);
  const restaurant = await currentRestaurantForUser(user);
  const connectionId = text(formData, 'connectionId');
  const connection = await prisma.posConnection.findFirst({ where: { id: connectionId, restaurantId: restaurant.id, active: true } });
  if (!connection) throw new Error('Active POS connection not found.');
  const run = await prisma.posSyncRun.create({ data: { restaurantId: restaurant.id, connectionId, syncType: 'FULL', status: 'RUNNING' } });
  try {
    connectorCapabilities(connection.provider);
    if (connection.mode !== 'DEMO') throw new Error('Live connector is configured but vendor credentials have not been validated. Use the vendor approval/OAuth process before live sync.');
    const locationExternalId = `${connection.provider}-demo-location`;
    await prisma.posLocation.upsert({
      where: { connectionId_externalLocationId: { connectionId, externalLocationId: locationExternalId } },
      update: { name: `${connection.displayName} Demo Location`, active: true, timezone: restaurant.timezone },
      create: { restaurantId: restaurant.id, connectionId, externalLocationId: locationExternalId, name: `${connection.displayName} Demo Location`, timezone: restaurant.timezone }
    });
    for (const item of demoCatalog(connection.provider)) {
      await prisma.posCatalogItem.upsert({
        where: { connectionId_externalItemId_externalVariationId: { connectionId, externalItemId: item.externalItemId, externalVariationId: item.externalVariationId } },
        update: { name: item.name, category: item.category, active: true, lastSyncedAt: new Date() },
        create: { restaurantId: restaurant.id, connectionId, ...item }
      });
    }
    const mappings = await prisma.menuItemMapping.findMany({ where: { restaurantId: restaurant.id, active: true } });
    const byName = new Map(mappings.map((m) => [m.normalizedName, m]));
    const rows = demoOrderLines(connection.provider, 7);
    let written = 0, duplicates = 0, unmapped = 0, grossSales = 0, netSales = 0;
    for (const row of rows) {
      const mapping = byName.get(normalizePosItemName(row.itemName));
      if (!mapping?.proteinId) unmapped++;
      grossSales += row.grossSales; netSales += row.netSales;
      const existing = await prisma.posOrderLine.findUnique({ where: { connectionId_externalOrderId_externalLineId: { connectionId, externalOrderId: row.externalOrderId, externalLineId: row.externalLineId } } });
      const data = {
        restaurantId: restaurant.id, connectionId, externalLocationId: row.externalLocationId, externalOrderId: row.externalOrderId,
        externalLineId: row.externalLineId, externalItemId: row.externalItemId, businessDate: row.businessDate, orderedAt: row.orderedAt,
        itemName: row.itemName, category: row.category, quantity: row.quantity, grossSales: row.grossSales, discounts: row.discounts,
        refunds: row.refunds, netSales: row.netSales, voided: row.voided, orderChannel: row.orderChannel,
        modifiersJson: JSON.stringify(row.modifiers), mappedProteinId: mapping?.proteinId || null, portionSizeLb: mapping?.portionSizeLb || 0,
        estimatedCookedLb: mapping?.proteinId ? row.quantity * mapping.portionSizeLb * mapping.yieldFactor : 0,
        sourceUpdatedAt: new Date()
      };
      if (existing) { duplicates++; await prisma.posOrderLine.update({ where: { id: existing.id }, data }); }
      else { written++; await prisma.posOrderLine.create({ data }); }
    }
    const now = new Date();
    await prisma.posSyncRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', completedAt: now, recordsRead: rows.length, recordsWritten: written, duplicateCount: duplicates, unmappedCount: unmapped, grossSales, netSales, notes: 'Demo-normalized sync completed.' } });
    await prisma.posConnection.update({ where: { id: connectionId }, data: { status: 'CONNECTED_DEMO', lastSuccessfulSyncAt: now, lastAttemptAt: now, lastError: null } });
    await auditLog({ restaurantId: restaurant.id, actorUserId: user.id, actorName: user.name, action: 'SYNC_POS', entity: 'PosSyncRun', entityId: run.id, afterJson: { provider: connection.provider, rows: rows.length, written, duplicates, unmapped } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'POS sync failed.';
    await prisma.posSyncRun.update({ where: { id: run.id }, data: { status: 'FAILED', completedAt: new Date(), errorMessage: message } });
    await prisma.posConnection.update({ where: { id: connectionId }, data: { status: 'ERROR', lastAttemptAt: new Date(), lastError: message } });
    throw error;
  } finally {
    revalidatePath('/admin/restaurants/pos');
  }
}
