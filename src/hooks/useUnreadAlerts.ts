import { useEffect, useMemo, useState } from "react";
import type { SystemNotification } from "../lib/systemNotifications";
import { ALERTS_READ_EVENT, hasUnreadNotifications } from "../lib/alertReadState";

export function useUnreadNotifications(notifications: SystemNotification[]): boolean {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    window.addEventListener(ALERTS_READ_EVENT, bump);
    return () => window.removeEventListener(ALERTS_READ_EVENT, bump);
  }, []);

  return useMemo(() => hasUnreadNotifications(notifications), [notifications, tick]);
}

/** @deprecated ใช้ useUnreadNotifications แทน */
export function useUnreadAlerts(notifications: Pick<SystemNotification, "id">[]): boolean {
  return useUnreadNotifications(notifications as SystemNotification[]);
}
