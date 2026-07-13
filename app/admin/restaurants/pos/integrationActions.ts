'use server';

/**
 * Build 7.2.1 compatibility shim.
 *
 * Older repository revisions included live POS-connection actions backed by a
 * Prisma `PosConnection` model. That model is not part of the current schema;
 * the supported POS workflow is the CSV import and menu-item mapping flow in
 * ./actions.ts. This file intentionally remains as a harmless module so stale
 * copies in Git-based deployments are overwritten rather than compiled against
 * a nonexistent Prisma delegate.
 */

export async function savePosConnection(): Promise<never> {
  throw new Error('Live POS connections are not enabled. Use the POS CSV import workflow.');
}

export async function testPosConnection(): Promise<never> {
  throw new Error('Live POS connections are not enabled. Use the POS CSV import workflow.');
}

export async function disconnectPosConnection(): Promise<never> {
  throw new Error('Live POS connections are not enabled. Use the POS CSV import workflow.');
}
