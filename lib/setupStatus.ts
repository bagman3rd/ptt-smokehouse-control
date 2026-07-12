export type SetupCheck = {
  key: string;
  label: string;
  complete: boolean;
  warning?: string;
};

export function setupCompletionScore(checks: SetupCheck[]) {
  if (!checks.length) return 0;
  return Math.round((checks.filter((check) => check.complete).length / checks.length) * 100);
}

export function setupWarnings(checks: SetupCheck[]) {
  return checks.filter((check) => !check.complete && check.warning).map((check) => check.warning as string);
}
