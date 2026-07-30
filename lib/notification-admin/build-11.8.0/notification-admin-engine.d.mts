export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS";
export type NotificationSeverity = "P0" | "P1" | "P2" | "P3";
export type NotificationRole = "ADMIN" | "OWNER" | "KM" | "PITMASTER" | "KC" | "VIEWER";
export type DeliveryStatus = "PENDING" | "DEFERRED" | "SENT" | "DELIVERED" | "FAILED_RETRYABLE" | "FAILED_TERMINAL" | "DEAD_LETTERED" | "SUPPRESSED";

export interface NotificationActor { id: string; name: string; role: NotificationRole; }
export interface NotificationRecipient {
  recipientId: string;
  name: string;
  role: NotificationRole;
  status: string;
  channels: Record<NotificationChannel, boolean>;
  quietHours: { start: string; end: string } | null;
}
export interface NotificationProvider {
  providerId: string;
  channel: NotificationChannel;
  configured: boolean;
  enabled: boolean;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
}
export interface NotificationRule {
  ruleId: string;
  eventTypes: string[];
  minimumSeverity: NotificationSeverity;
  roles: NotificationRole[];
  channels: NotificationChannel[];
  P1BypassesQuietHours: boolean;
  enabled: boolean;
}
export interface NotificationAdminState {
  engineVersion: "PTT_NOTIFICATION_ADMIN_11_8_0";
  notificationStateId: string;
  tenantId: string;
  locationId: string;
  timezone: string;
  recipients: NotificationRecipient[];
  providers: NotificationProvider[];
  rules: NotificationRule[];
  deliveries: Array<Record<string, unknown>>;
  incidents: Array<Record<string, unknown>>;
  deadLetters: Array<Record<string, unknown>>;
  adminSettings: Record<string, unknown>;
  adminAudit: Array<Record<string, unknown>>;
  eventLog: Array<Record<string, unknown>>;
  processedEventIds: string[];
  createdAt: string;
  updatedAt: string;
}
export interface NotificationAdminBoard {
  boardVersion: "PTT_NOTIFICATION_ADMIN_11_8_0";
  tenantId: string;
  locationId: string;
  generatedAt: string;
  providerHealth: Array<Record<string, unknown>>;
  deliverySummary: Record<DeliveryStatus, number>;
  openIncidents: Array<Record<string, unknown>>;
  dueEscalations: Array<Record<string, unknown>>;
  deadLetters: Array<Record<string, unknown>>;
  recentAdminAudit: Array<Record<string, unknown>>;
  activeRecipientCount: number;
  inactiveRecipientCount: number;
}

export const NOTIFICATION_ADMIN_VERSION: "PTT_NOTIFICATION_ADMIN_11_8_0";
export const NOTIFICATION_CHANNELS: ReadonlyArray<NotificationChannel>;
export const NOTIFICATION_SEVERITIES: ReadonlyArray<NotificationSeverity>;
export const DELIVERY_STATUSES: ReadonlyArray<DeliveryStatus>;
export const SUPPORTED_NOTIFICATION_EVENTS: ReadonlyArray<string>;
export class NotificationAdminValidationError extends Error { field: string; constructor(field: string, message: string); }
export function createNotificationAdminState(input: {
  tenantId: string;
  locationId: string;
  timezone: string;
  recipients: NotificationRecipient[];
  providers: NotificationProvider[];
  rules: NotificationRule[];
  adminSettings?: Record<string, unknown>;
  createdAt?: string;
}): NotificationAdminState;
export function routeNotificationEvent(state: NotificationAdminState, event: Record<string, unknown>): { state: NotificationAdminState; result: Record<string, unknown> };
export function recordDeliveryAttempt(state: NotificationAdminState, input: Record<string, unknown>): { state: NotificationAdminState; result: Record<string, unknown> };
export function acknowledgeIncident(state: NotificationAdminState, input: Record<string, unknown>): { state: NotificationAdminState; result: Record<string, unknown> };
export function resolveIncident(state: NotificationAdminState, input: Record<string, unknown>): { state: NotificationAdminState; result: Record<string, unknown> };
export function dueEscalations(state: NotificationAdminState, nowIso: string): Array<Record<string, unknown>>;
export function recordProviderResult(state: NotificationAdminState, input: Record<string, unknown>): { state: NotificationAdminState; result: Record<string, unknown> };
export function applyAdminSettingChange(state: NotificationAdminState, input: Record<string, unknown>): { state: NotificationAdminState; result: Record<string, unknown> };
export function deriveNotificationAdminBoard(state: NotificationAdminState, nowIso: string): NotificationAdminBoard;
export function createSanitizedSupportBundle(state: NotificationAdminState, snapshot: Record<string, unknown>, generatedAt: string): Record<string, unknown>;
