export type ProductionEvidenceDecision = "GO" | "HOLD";
export type ProductionAuthorization =
  | "PENDING_DEPLOYED_SIGN_OFF"
  | "AUTHORIZED"
  | "REJECTED";

export interface ProductionReleaseControl {
  domain: string;
  control: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
  message: string;
  evidenceIds: string[];
}

export interface ProductionReleaseAssessment {
  assessmentVersion: "PTT_PRODUCTION_RELEASE_12_0_0";
  assessmentId: string;
  buildVersion: "12.0.0";
  packageStatus: "COMPLETE" | "INCOMPLETE";
  evidenceDecision: ProductionEvidenceDecision;
  productionAuthorization: ProductionAuthorization;
  productionAuthorizationReason: string;
  releaseIdentity: Record<string, unknown>;
  controls: ProductionReleaseControl[];
  failures: ProductionReleaseControl[];
  domainSummary: Record<
    string,
    { controls: number; passed: number; failed: number }
  >;
  workflowCount: number;
  requiredBuildCount: number;
  generatedFromEvidenceHash: string;
}

export const PRODUCTION_RELEASE_VERSION:
  "PTT_PRODUCTION_RELEASE_12_0_0";
export const PRODUCTION_RELEASE_WORKFLOWS: ReadonlyArray<string>;
export const PRODUCTION_SIGNOFF_ROLES: ReadonlyArray<string>;

export class ProductionReleaseValidationError extends Error {
  field: string;
  constructor(field: string, message: string);
}

export function assessProductionRelease(
  candidate: Record<string, unknown>,
  contract: Record<string, unknown>,
): ProductionReleaseAssessment;

export function authorizeProductionRelease(
  assessment: ProductionReleaseAssessment,
  authorization: {
    role: "RELEASE_OWNER";
    actorName: string;
    authorizedAt: string;
    reason: string;
    deployedEvidenceReviewed: true;
    renderDeploymentVerified: true;
    operationalAcceptanceSigned: true;
    authorizationGranted: true;
  },
): {
  authorizationVersion: "PTT_PRODUCTION_AUTHORIZATION_12_0_0";
  authorizationId: string;
  assessmentId: string;
  buildVersion: string;
  evidenceDecision: "GO";
  productionAuthorization: "AUTHORIZED";
  actorName: string;
  role: "RELEASE_OWNER";
  authorizedAt: string;
  reason: string;
  gitCommit: string;
  renderRevision: string;
};

export function createProductionReleaseManifest(
  assessment: ProductionReleaseAssessment,
  authorization?: Record<string, unknown> | null,
): {
  manifestVersion: "PTT_PRODUCTION_RELEASE_MANIFEST_12_0_0";
  manifestId: string;
  buildVersion: string;
  assessmentId: string;
  evidenceDecision: ProductionEvidenceDecision;
  productionAuthorization: ProductionAuthorization;
  authorizationId: string | null;
  gitCommit: string;
  renderRevision: string;
  environment: string;
  generatedFromEvidenceHash: string;
  passedControlCount: number;
  failedControlCount: number;
  domainSummary: Record<string, unknown>;
  scope: Record<string, unknown>;
};

export function createProductionHandoffBundle(
  input: Record<string, unknown>,
): {
  bundle: Record<string, unknown>;
  secretLeaks: Array<{ path: string; valueType: string }>;
};
