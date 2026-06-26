import {
  type ActivityEntry,
  type AdminSnapshot,
  type AlertEntry,
  type DeviceBinding,
  type FarmRow,
  type PlanNode,
  type ProfileRow,
  type RegistryRow,
  type UserRow,
} from "./rtdb-types";
import { isPlanNodeKey, resolvePlanId } from "./plan-id";

const ONLINE_MS = 120_000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function boardOnline(lastOnlineAt: number | null | undefined): boolean {
  if (typeof lastOnlineAt !== "number" || !Number.isFinite(lastOnlineAt)) return false;
  return Date.now() - lastOnlineAt <= ONLINE_MS;
}

function profileFrom(node: Record<string, unknown>): ProfileRow | null {
  const p = node.Profile;
  return isRecord(p) ? (p as ProfileRow) : null;
}

function devicesFrom(node: Record<string, unknown>): Record<string, DeviceBinding> {
  const d = node.devices;
  if (!isRecord(d)) return {};
  const out: Record<string, DeviceBinding> = {};
  for (const [id, val] of Object.entries(d)) {
    if (isRecord(val)) out[id] = val as DeviceBinding;
  }
  return out;
}

function planNodesFrom(node: Record<string, unknown>): Record<string, PlanNode> {
  const out: Record<string, PlanNode> = {};
  for (const [key, val] of Object.entries(node)) {
    if (!isPlanNodeKey(key) || !isRecord(val)) continue;
    out[key] = val as PlanNode;
  }
  return out;
}

export function aggregateDoofarm(
  raw: Record<string, unknown> | null,
  registry: Record<string, RegistryRow>,
): AdminSnapshot {
  const users: UserRow[] = [];
  const farms: FarmRow[] = [];
  const activities: ActivityEntry[] = [];
  const alerts: AlertEntry[] = [];

  const registryByOwner = new Map<string, RegistryRow & { id: string }>();
  for (const [id, row] of Object.entries(registry)) {
    const owner = row.owner;
    if (owner) registryByOwner.set(`${owner}:${id}`, { ...row, id });
  }

  for (const [uid, userVal] of Object.entries(raw ?? {})) {
    if (!isRecord(userVal)) continue;

    const profile = profileFrom(userVal);
    const devices = devicesFrom(userVal);
    const plans = planNodesFrom(userVal);
    const ownerEmail = profile?.email ?? "—";
    const ownerName = profile?.name ?? "—";

    users.push({
      uid,
      name: ownerName,
      phone: profile?.phone ?? "—",
      email: ownerEmail,
      deviceCount: Object.keys(devices).length,
      notificationsEnabled: profile?.notificationsEnabled !== false,
      consentAccepted: profile?.consentAccepted === true,
    });

    const seenFarmKeys = new Set<string>();

    for (const [deviceId, binding] of Object.entries(devices)) {
      const planId = resolvePlanId(binding);
      const plan = plans[planId];
      const reg = registry[deviceId];
      const lastOnline =
        typeof reg?.lastOnlineAt === "number"
          ? reg.lastOnlineAt
          : undefined;

      farms.push({
        uid,
        deviceId,
        planId,
        farmName: binding.name ?? deviceId,
        ownerName,
        ownerEmail,
        sensor: plan?.SensorRealtime ?? null,
        pumpStatus:
          typeof plan?.Pump?.pumpStatus === "number" ? plan.Pump.pumpStatus : null,
        autoMode:
          typeof plan?.Settings?.autoMode === "boolean" ? plan.Settings.autoMode : null,
        moistureThreshold:
          typeof plan?.Settings?.setValueMoisture === "number"
            ? plan.Settings.setValueMoisture
            : null,
        online: boardOnline(lastOnline),
        lastOnlineAt: lastOnline ?? null,
        fwVersion: reg?.fwVersion ? String(reg.fwVersion) : null,
      });
      seenFarmKeys.add(`${uid}:${planId}`);
    }

    for (const [planId, plan] of Object.entries(plans)) {
      const key = `${uid}:${planId}`;
      if (seenFarmKeys.has(key)) continue;

      const deviceId =
        plan.Settings?.deviceId ??
        (planId.startsWith("plan_") ? planId.replace(/^plan_/, "DF-") : "—");

      const regRow = registry[String(deviceId)];
      const lastOnline =
        typeof regRow?.lastOnlineAt === "number" ? regRow.lastOnlineAt : undefined;

      farms.push({
        uid,
        deviceId: String(deviceId),
        planId,
        farmName: planId,
        ownerName,
        ownerEmail,
        sensor: plan.SensorRealtime ?? null,
        pumpStatus:
          typeof plan.Pump?.pumpStatus === "number" ? plan.Pump.pumpStatus : null,
        autoMode:
          typeof plan.Settings?.autoMode === "boolean" ? plan.Settings.autoMode : null,
        moistureThreshold:
          typeof plan.Settings?.setValueMoisture === "number"
            ? plan.Settings.setValueMoisture
            : null,
        online: boardOnline(lastOnline),
        lastOnlineAt: lastOnline ?? null,
        fwVersion: regRow?.fwVersion ? String(regRow.fwVersion) : null,
      });
    }

    for (const [planId, plan] of Object.entries(plans)) {
      if (plan.ActivityLogs && isRecord(plan.ActivityLogs)) {
        for (const row of Object.values(plan.ActivityLogs)) {
          if (!isRecord(row)) continue;
          activities.push({
            ...(row as ActivityEntry),
            uid,
            planId,
            ownerEmail,
          });
        }
      }

      if (plan.Alerts && isRecord(plan.Alerts)) {
        for (const [alertId, row] of Object.entries(plan.Alerts)) {
          if (!isRecord(row)) continue;
          alerts.push({
            ...(row as AlertEntry),
            uid,
            planId,
            alertId,
            ownerEmail,
          });
        }
      }
    }
  }

  users.sort((a, b) => a.name.localeCompare(b.name, "th"));
  farms.sort((a, b) => a.farmName.localeCompare(b.farmName, "th"));

  activities.sort((a, b) => {
    const ta = typeof a.timestampMs === "number" ? a.timestampMs : 0;
    const tb = typeof b.timestampMs === "number" ? b.timestampMs : 0;
    return tb - ta;
  });

  alerts.sort((a, b) => {
    const ta = typeof a.alertTime === "number" ? a.alertTime : 0;
    const tb = typeof b.alertTime === "number" ? b.alertTime : 0;
    return tb - ta;
  });

  const boundBoards = Object.values(registry).filter((r) => r.bound === true);
  const onlineBoards = boundBoards.filter((r) => boardOnline(r.lastOnlineAt)).length;

  return {
    users,
    farms,
    activities,
    alerts,
    stats: {
      totalUsers: users.length,
      usersWithDevices: users.filter((u) => u.deviceCount > 0).length,
      totalFarms: farms.length,
      totalBoards: boundBoards.length,
      onlineBoards,
      totalAlerts: alerts.length,
    },
  };
}

export function registryStats(registry: Record<string, RegistryRow>) {
  const rows = Object.values(registry);
  const bound = rows.filter((r) => r.bound === true);
  const online = bound.filter((r) => boardOnline(r.lastOnlineAt)).length;
  return { total: bound.length, online };
}

export function profileEmailMap(raw: Record<string, unknown> | null): Map<string, string> {
  const map = new Map<string, string>();
  for (const [uid, userVal] of Object.entries(raw ?? {})) {
    if (!isRecord(userVal)) continue;
    const profile = profileFrom(userVal);
    if (profile?.email) map.set(uid, profile.email);
  }
  return map;
}
