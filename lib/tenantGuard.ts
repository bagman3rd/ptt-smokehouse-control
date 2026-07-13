import { Prisma } from '@prisma/client';

/**
 * Models whose records belong to one restaurant/tenant.
 * The Prisma extension below fails loudly in every runtime when a tenant-owned
 * read or write is missing restaurantId in either query scope or create/update data.
 * Controlled maintenance scripts may disable the assertion explicitly with
 * DISABLE_TENANT_GUARD=1; normal production traffic may not bypass it.
 */
const TENANT_SCOPED_MODELS = new Set([
  'AuditLog',
  'Protein',
  'SavedReport',
  'ReportRun',
  'ForecastScenario',
  'DayMultiplier',
  'MonthMultiplier',
  'EventModifier',
  'CookPlan',
  'CookPlanItem',
  'EndOfDayLog',
  'EndOfDayProteinLog',
  'Smoker',
  'LearningRecommendation',
  'SystemCheck',
  'Subscription',
  'SupportTicket',
  'CustomerDataRequest',
  'MenuItemMapping',
  'PosImportBatch',
  'PosImportRow'
]);

const READ_OR_WRITE_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert'
]);

const CREATE_OPERATIONS = new Set(['create', 'createMany']);

function hasTenantScope(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, 'restaurantId')) return true;
  // Allow nested tenant scoping through parent relations for child tables.
  // Examples: { cookPlan: { restaurantId } } or { endOfDayLog: { restaurantId } }.
  return Object.values(record).some((child) => {
    if (Array.isArray(child)) return child.some(hasTenantScope);
    return hasTenantScope(child);
  });
}

function shouldThrowTenantGuard() {
  return process.env.DISABLE_TENANT_GUARD !== '1';
}


export const tenantGuardExtension = Prisma.defineExtension({
  name: 'tenantGuard',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (shouldThrowTenantGuard() && model && TENANT_SCOPED_MODELS.has(model)) {
          const anyArgs = args as Record<string, unknown> | undefined;
          const hasScope = CREATE_OPERATIONS.has(operation)
            ? hasTenantScope(anyArgs?.data)
            : READ_OR_WRITE_OPERATIONS.has(operation)
              ? hasTenantScope(anyArgs?.where)
              : true;
          if (!hasScope) {
            throw new Error(
              `Tenant guard: ${model}.${operation} requires restaurantId in query/data scope. Add restaurantId or set DISABLE_TENANT_GUARD=1 only for controlled maintenance scripts.`
            );
          }
        }
        return query(args);
      }
    }
  }
});

export { TENANT_SCOPED_MODELS };
