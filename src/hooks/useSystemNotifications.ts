import { useMemo } from "react";
import { useAdminDataContext } from "../context/AdminDataContext";
import { buildSystemNotifications } from "../lib/systemNotifications";

export function useSystemNotifications() {
  const { snapshot, rtdbConnected } = useAdminDataContext();
  return useMemo(
    () => buildSystemNotifications(snapshot, rtdbConnected),
    [snapshot, rtdbConnected],
  );
}
