import { push, ref, set, update } from "firebase/database";
import { auth, database } from "../firebase";

function planBase(ownerUid: string, planId: string) {
  return `Doofarm/${ownerUid}/${planId}`;
}

export async function logAdminActivity(
  ownerUid: string,
  planId: string,
  action: string,
): Promise<void> {
  if (!database) return;
  const email = auth?.currentUser?.email ?? "admin@dashboard";
  const now = Date.now();
  await push(ref(database, `${planBase(ownerUid, planId)}/ActivityLogs`), {
    action: `[แอดมิน] ${action}`,
    actorEmail: email,
    timestamp: new Date(now).toLocaleString("th-TH"),
    timestampMs: now,
    source: "admin-dashboard",
  });
}

export async function setPumpControl(
  ownerUid: string,
  planId: string,
  opts: { autoMode: boolean; pumpOn: boolean },
): Promise<void> {
  if (!database) throw new Error("Firebase not configured");
  const manualCommand = opts.autoMode ? -1 : opts.pumpOn ? 1 : 0;
  const base = planBase(ownerUid, planId);
  await Promise.all([
    set(ref(database, `${base}/Settings/autoMode`), opts.autoMode),
    set(ref(database, `${base}/Pump/manualCommand`), manualCommand),
    set(ref(database, `${base}/Pump/updatedAt`), Date.now()),
  ]);
  const label = opts.autoMode
    ? "เปิดโหมดอัตโนมัติ"
    : opts.pumpOn
      ? "สั่งเปิดปั๊ม (มือ)"
      : "สั่งปิดปั๊ม (มือ)";
  await logAdminActivity(ownerUid, planId, label);
}

export async function setMoistureThreshold(
  ownerUid: string,
  planId: string,
  value: number,
): Promise<void> {
  if (!database) throw new Error("Firebase not configured");
  await set(
    ref(database, `${planBase(ownerUid, planId)}/Settings/setValueMoisture`),
    value,
  );
  await logAdminActivity(ownerUid, planId, `ตั้งค่าความชื้นดินเป้าหมาย ${value}%`);
}

export async function setSchedule(
  ownerUid: string,
  planId: string,
  opts: { enabled: boolean; onTime: string; offTime: string },
): Promise<void> {
  if (!database) throw new Error("Firebase not configured");
  const base = planBase(ownerUid, planId);
  await update(ref(database, `${base}/Settings`), {
    scheduleEnabled: opts.enabled,
    scheduleOnTime: opts.onTime,
    scheduleOffTime: opts.offTime,
  });
  await logAdminActivity(
    ownerUid,
    planId,
    opts.enabled
      ? `เปิดตั้งเวลารดน้ำ ${opts.onTime}-${opts.offTime}`
      : "ปิดตั้งเวลารดน้ำ",
  );
}

export async function setFarmName(
  ownerUid: string,
  deviceId: string,
  name: string,
): Promise<void> {
  if (!database) throw new Error("Firebase not configured");
  await set(ref(database, `Doofarm/${ownerUid}/devices/${deviceId}/name`), name.trim());
}

export async function requestReboot(ownerUid: string, planId: string): Promise<void> {
  if (!database) throw new Error("Firebase not configured");
  await set(ref(database, `${planBase(ownerUid, planId)}/Pump/rebootRequest`), true);
  await logAdminActivity(ownerUid, planId, "ส่งคำสั่งรีบูตบอร์ด");
}
