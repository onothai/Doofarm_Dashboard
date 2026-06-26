import type { AdminSnapshot, AlertEntry } from "./rtdb-types";

export type SystemNotificationKind = "db" | "offline" | "farm";

export type SystemNotification = {
  id: string;
  kind: SystemNotificationKind;
  time: string;
  timeMs: number;
  desc: string;
  statusLabel: string;
  statusKind: "error" | "warning";
  uid?: string;
  planId?: string;
};

function formatNowTh(): string {
  return new Date().toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function alertTimeMs(row: AlertEntry): number {
  const t = row.alertTime;
  if (typeof t !== "number" || !Number.isFinite(t)) return 0;
  return t < 1e12 ? t * 1000 : t;
}

function formatAlertTime(row: AlertEntry): string {
  const ms = alertTimeMs(row);
  if (ms <= 0) return "-";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function farmNameFor(snapshot: AdminSnapshot, uid: string, planId: string): string {
  return snapshot.farms.find((f) => f.uid === uid && f.planId === planId)?.farmName ?? planId;
}

/** เหตุการณ์ที่ admin ควรรู้ — ไม่รวมสถานะปกติของระบบ */
export function buildSystemNotifications(
  snapshot: AdminSnapshot,
  connected: boolean | null,
): SystemNotification[] {
  const items: SystemNotification[] = [];
  const nowMs = Date.now();
  const nowStr = formatNowTh();

  if (connected === false) {
    items.push({
      id: "sys:db-disconnected",
      kind: "db",
      time: nowStr,
      timeMs: nowMs,
      desc: "ขาดการเชื่อมต่อ Firebase Realtime Database",
      statusLabel: "ขาดการเชื่อมต่อ",
      statusKind: "error",
    });
  }

  for (const farm of snapshot.farms) {
    if (farm.online || farm.deviceId === "—") continue;
    items.push({
      id: `sys:offline:${farm.uid}:${farm.planId}`,
      kind: "offline",
      time: nowStr,
      timeMs: nowMs,
      desc: `แปลง "${farm.farmName}" (${farm.ownerEmail}) — บอร์ดออฟไลน์`,
      statusLabel: "บอร์ดออฟไลน์",
      statusKind: "warning",
      uid: farm.uid,
      planId: farm.planId,
    });
  }

  for (const alert of snapshot.alerts) {
    const farmName = farmNameFor(snapshot, alert.uid, alert.planId);
    items.push({
      id: `sys:alert:${alert.uid}:${alert.planId}:${alert.alertId}`,
      kind: "farm",
      time: formatAlertTime(alert),
      timeMs: alertTimeMs(alert) || nowMs,
      desc: `แปลง "${farmName}" — ${alert.alertMessage ?? "—"} (${alert.ownerEmail})`,
      statusLabel: "แจ้งเตือนแปลง",
      statusKind: "error",
      uid: alert.uid,
      planId: alert.planId,
    });
  }

  items.sort((a, b) => b.timeMs - a.timeMs);
  return items;
}

export function countSystemNotifications(
  snapshot: AdminSnapshot,
  connected: boolean | null,
): number {
  return buildSystemNotifications(snapshot, connected).length;
}
