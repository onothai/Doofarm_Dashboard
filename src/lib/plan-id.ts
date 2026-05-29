/** อิงจาก Doofarm - redeesign/lib/plan-id.ts */
export const LEGACY_PLAN_ID = "plan01";

export function planIdForDevice(deviceId: string): string {
  const cleaned = (deviceId || "").replace(/[^A-Za-z0-9]/g, "");
  return cleaned.length > 0 ? `plan_${cleaned}` : LEGACY_PLAN_ID;
}

export function resolvePlanId(
  deviceInfo: { planId?: unknown } | null | undefined,
): string {
  const pid = deviceInfo?.planId;
  return typeof pid === "string" && pid.trim().length > 0
    ? pid.trim()
    : LEGACY_PLAN_ID;
}

export function isPlanNodeKey(key: string): boolean {
  return key === LEGACY_PLAN_ID || key.startsWith("plan_");
}
