import type { SystemNotification } from "./systemNotifications";

const STORAGE_KEY = "doofarm_seen_alert_keys";
export const ALERTS_READ_EVENT = "doofarm-alerts-read";

function readSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((k): k is string => typeof k === "string"));
  } catch {
    return new Set();
  }
}

export function hasUnreadNotifications(notifications: SystemNotification[]): boolean {
  if (notifications.length === 0) return false;
  const seen = readSeenKeys();
  return notifications.some((n) => !seen.has(n.id));
}

export function markNotificationsAsSeen(notifications: SystemNotification[]): void {
  const keys = notifications.map((n) => n.id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  window.dispatchEvent(new Event(ALERTS_READ_EVENT));
}

/** @deprecated ใช้ markNotificationsAsSeen แทน */
export function markAlertsAsSeen(
  notifications: Pick<SystemNotification, "id">[],
): void {
  markNotificationsAsSeen(notifications as SystemNotification[]);
}

/** @deprecated ใช้ hasUnreadNotifications แทน */
export function hasUnreadAlerts(notifications: Pick<SystemNotification, "id">[]): boolean {
  return hasUnreadNotifications(notifications as SystemNotification[]);
}

export function notifyAlertsReadChanged(): void {
  window.dispatchEvent(new Event(ALERTS_READ_EVENT));
}
