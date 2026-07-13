import { Prisma } from '@prisma/client';

/**
 * Models whose records belong to one restaurant/tenant.
 * The Prisma extension is a development/CI assertion. It fails loudly when a tenant-owned read or write
 * is missing restaurantId in query or data scope. Production isolation is enforced by database constraints,
 * tenant-scoped query helpers, and browser/API isolation tests. Set TENANT_GUARD_ENABLED=1 to run the assertion
 * in any environment. Controlled maintenance scripts may use DISABLE_TENANT_GUARD=1 explicitly.
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

export function tenantGuardEnabled() {
  if (process.env.DISABLE_TENANT_GUARD === '1') return false;
  if (process.env.TENANT_GUARD_ENABLED === '1') return true;
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}



export const tenantGuardExtension = Prisma.defineExtension({
  name: 'tenantGuard',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (tenantGuardEnabled() && model && TENANT_SCOPED_MODELS.has(model)) {
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
