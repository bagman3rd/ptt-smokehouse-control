import { Prisma } from '@prisma/client';

const TENANT_SCOPED_MODELS = new Set([
  'Protein',
  'SavedReport',
  'ReportRun',
  'ForecastScenario',
  'DayMultiplier',
  'MonthMultiplier',
  'EventModifier',
  'CookPlan',
  'EndOfDayLog',
  'Smoker',
  'LearningRecommendation',
  'SystemCheck'
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

function hasRestaurantId(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(value, 'restaurantId')) return true;
  return Object.values(value as Record<string, unknown>).some((child) => {
    if (Array.isArray(child)) return child.some(hasRestaurantId);
    return hasRestaurantId(child);
  });
}

function createHasRestaurantId(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(value, 'restaurantId')) return true;
  return Object.values(value as Record<string, unknown>).some((child) => {
    if (Array.isArray(child)) return child.some(createHasRestaurantId);
    return createHasRestaurantId(child);
  });
}

function shouldThrowTenantGuard() {
  return process.env.NODE_ENV !== 'production' && process.env.DISABLE_TENANT_GUARD !== '1';
}

export const tenantGuardExtension = Prisma.defineExtension({
  name: 'tenantGuard',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (shouldThrowTenantGuard() && model && TENANT_SCOPED_MODELS.has(model)) {
          const anyArgs = args as any;
          const hasScope = operation === 'create' || operation === 'createMany'
            ? createHasRestaurantId(anyArgs?.data)
            : READ_OR_WRITE_OPERATIONS.has(operation)
              ? hasRestaurantId(anyArgs?.where)
              : true;
          if (!hasScope) {
            throw new Error(`Tenant guard: ${model}.${operation} requires restaurantId in the query/data scope. Add restaurantId or explicitly set DISABLE_TENANT_GUARD=1 for a controlled maintenance script.`);
          }
        }
        return query(args);
      }
    }
  }
});

export { TENANT_SCOPED_MODELS };
