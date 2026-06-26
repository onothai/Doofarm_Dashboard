import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { SortableHeader } from "../components/SortableHeader";
import { TableSortSelect } from "../components/TableSortSelect";
import { useAdminDataContext } from "../context/AdminDataContext";
import { useTableSort } from "../hooks/useTableSort";
import { firebaseActionError, isBoardOnline, rebootPrecheck, requestReboot } from "../lib/farmControl";
import { resolvePlanId } from "../lib/plan-id";
import { buildSortOptions, type SortValueKind } from "../lib/tableSort";
import type { RegistryRow } from "../lib/rtdb-types";

type OutletCtx = { searchQuery: string };

type DeviceSortKey =
  | "deviceId"
  | "ownerId"
  | "email"
  | "online"
  | "bound"
  | "planId"
  | "version"
  | "lastOnlineAt";

type DeviceRow = {
  key: string;
  deviceId: string;
  ownerId: string;
  email: string;
  planId: string;
  status: string;
  online: boolean;
  bound: string;
  boundBool: boolean;
  version: string;
  lastSeen: string;
  lastOnlineAt: number | null;
  canReboot: boolean;
  ownerUid: string;
};

const DEVICE_SORT_KIND: Record<DeviceSortKey, SortValueKind> = {
  deviceId: "enText",
  ownerId: "enText",
  email: "enText",
  online: "bool",
  bound: "bool",
  planId: "enText",
  version: "enText",
  lastOnlineAt: "number",
};

const DEVICE_SORT_OPTIONS = buildSortOptions([
  { key: "deviceId", label: "Device ID", kind: "enText" },
  { key: "ownerId", label: "Owner UID", kind: "enText" },
  { key: "email", label: "อีเมลเจ้าของ", kind: "enText" },
  { key: "online", label: "Online/Offline", kind: "bool" },
  { key: "bound", label: "ผูกแล้ว/ว่าง", kind: "bool" },
  { key: "planId", label: "Plan ID", kind: "enText" },
  { key: "version", label: "เวอร์ชัน", kind: "enText" },
  { key: "lastOnlineAt", label: "Last Seen", kind: "number" },
]);

function formatRelativeTh(ms: number): string {
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return "—";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "เมื่อสักครู่";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.floor(min / 60);
  if (hr < 48) return `${hr} ชั่วโมงที่แล้ว`;
  const day = Math.floor(hr / 24);
  return `${day} วันที่แล้ว`;
}

function resolveRebootPlanId(
  deviceId: string,
  row: RegistryRow,
  doofarmRaw: Record<string, unknown> | null,
): string {
  if (typeof row.planId === "string" && row.planId.trim()) return row.planId.trim();
  const owner = row.owner;
  if (owner && doofarmRaw) {
    const userNode = doofarmRaw[owner];
    if (userNode && typeof userNode === "object" && userNode !== null) {
      const devices = (userNode as Record<string, unknown>).devices;
      if (devices && typeof devices === "object" && devices !== null) {
        const binding = (devices as Record<string, unknown>)[deviceId];
        if (binding && typeof binding === "object") {
          return resolvePlanId(binding as { planId?: unknown });
        }
      }
    }
  }
  return resolvePlanId(null);
}

export function DevicesPage() {
  const { searchQuery } = useOutletContext<OutletCtx>();
  const q = searchQuery.trim().toLowerCase();
  const { snapshot, registry, doofarmRaw, loading, isAdmin, uid } = useAdminDataContext();
  const [rebootingKey, setRebootingKey] = useState<string | null>(null);
  const [rebootNotice, setRebootNotice] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!rebootNotice || rebootNotice.kind !== "success") return;
    const timer = window.setTimeout(() => setRebootNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [rebootNotice]);

  const emailByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of snapshot.users) map.set(u.uid, u.email);
    return map;
  }, [snapshot.users]);

  const filtered = useMemo(() => {
    const list = Object.entries(registry).map(([id, row]) => ({ id, row }));

    return list
      .filter(({ id, row }) => {
        const ownerEmail = row.owner ? (emailByUid.get(row.owner) ?? "") : "";
        const hay = `${id} ${row.owner ?? ""} ${ownerEmail} ${row.fwVersion ?? ""}`.toLowerCase();
        return !q || hay.includes(q);
      })
      .map(({ id, row }): DeviceRow => {
        const last = typeof row.lastOnlineAt === "number" ? row.lastOnlineAt : null;
        const online = isBoardOnline(last);
        const ownerUid = row.owner ?? "";
        const canReboot =
          row.bound === true &&
          !!ownerUid &&
          (isAdmin || ownerUid === uid);
        return {
          key: id,
          deviceId: id,
          ownerId: ownerUid || "—",
          email: ownerUid ? (emailByUid.get(ownerUid) ?? "—") : "—",
          planId: resolveRebootPlanId(id, row, doofarmRaw),
          status: online ? "Online" : "Offline",
          online,
          bound: row.bound === true ? "ผูกแล้ว" : "ว่าง",
          boundBool: row.bound === true,
          version: row.fwVersion ? String(row.fwVersion) : "—",
          lastSeen: last ? formatRelativeTh(last) : "—",
          lastOnlineAt: last,
          canReboot,
          ownerUid,
        };
      });
  }, [registry, q, emailByUid, doofarmRaw, isAdmin, uid]);

  const { sort, toggleSort, setSortDirect, sortedRows } = useTableSort<DeviceRow, DeviceSortKey>(
    filtered,
    {
      defaultKey: "deviceId",
      kindByKey: DEVICE_SORT_KIND,
      getValue: (row, key) => {
        switch (key) {
          case "deviceId":
            return row.deviceId;
          case "ownerId":
            return row.ownerId;
          case "email":
            return row.email;
          case "online":
            return row.online;
          case "bound":
            return row.boundBool;
          case "planId":
            return row.planId;
          case "version":
            return row.version;
          case "lastOnlineAt":
            return row.lastOnlineAt;
        }
      },
    },
  );

  const headerProps = { activeKey: sort.key, dir: sort.dir, onSort: toggleSort };

  const reboot = async (
    deviceKey: string,
    ownerUid: string,
    planId: string,
    deviceId: string,
    online: boolean,
    lastSeen: string,
  ) => {
    if (rebootingKey) return;
    const ok = window.confirm(`ยืนยันการ Reboot บอร์ด ${deviceId}?`);
    if (!ok) return;

    const precheck = rebootPrecheck(ownerUid, planId, { online, lastSeenText: lastSeen });
    if (precheck) {
      setRebootNotice({ kind: "error", message: precheck });
      return;
    }

    setRebootingKey(deviceKey);
    setRebootNotice(null);
    try {
      await requestReboot(ownerUid, planId);
      setRebootNotice({
        kind: "success",
        message: `ส่งคำสั่ง Reboot ไปยัง ${deviceId} แล้ว — บอร์ดจะรีสตาร์ทในไม่กี่วินาที`,
      });
    } catch (err) {
      console.error("[DevicesPage] reboot", err);
      setRebootNotice({
        kind: "error",
        message: firebaseActionError(
          err,
          `ส่งคำสั่ง Reboot ไปยัง ${deviceId} ไม่สำเร็จ — ตรวจสอบสิทธิ์ AdminUsers และ Database Rules`,
        ),
      });
    } finally {
      setRebootingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="adminPage">
        <div className="adminBanner">กำลังโหลด DeviceRegistry…</div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      {rebootNotice ? (
        <div
          className={`devicesRebootToast adminBanner ${
            rebootNotice.kind === "success" ? "adminBannerOk" : "adminBannerErr"
          }`}
          role="status"
        >
          {rebootNotice.message}
        </div>
      ) : null}

      <div className="adminToolbar">
        <div className="sortPill">
          บอร์ดทั้งหมด: {Object.keys(registry).length} · ผูกแล้ว:{" "}
          {snapshot.stats.totalBoards} · ออนไลน์: {snapshot.stats.onlineBoards}
        </div>
        <TableSortSelect
          options={DEVICE_SORT_OPTIONS}
          activeKey={sort.key}
          dir={sort.dir}
          onChange={setSortDirect}
        />
      </div>

      <div className="adminTableWrap">
        <div className="adminTableHeader gridDevices">
          <SortableHeader label="Device ID" sortKey="deviceId" {...headerProps} />
          <SortableHeader label="Owner UID" sortKey="ownerId" {...headerProps} />
          <SortableHeader label="อีเมลเจ้าของ" sortKey="email" {...headerProps} />
          <SortableHeader label="สถานะ" sortKey="online" {...headerProps} />
          <SortableHeader label="Plan ID" sortKey="planId" {...headerProps} />
          <SortableHeader label="เวอร์ชัน" sortKey="version" {...headerProps} />
          <SortableHeader label="Last Seen" sortKey="lastOnlineAt" {...headerProps} />
          <div className="adminColActions" />
        </div>

        {sortedRows.length === 0 ? (
          <div className="adminEmptyRow">ไม่พบบอร์ดใน DeviceRegistry</div>
        ) : (
          sortedRows.map((r) => (
            <div key={r.key} className="adminTableRow gridDevices">
              <div className="mono" data-label="Device ID">{r.deviceId}</div>
              <div className="mono" title={r.ownerId} data-label="Owner UID">
                {r.ownerId.length > 12 ? `${r.ownerId.slice(0, 12)}…` : r.ownerId}
              </div>
              <div data-label="อีเมล">{r.email}</div>
              <div data-label="สถานะ">
                {r.status} · {r.bound}
              </div>
              <div className="mono" data-label="Plan ID">{r.planId}</div>
              <div data-label="เวอร์ชัน">{r.version}</div>
              <div data-label="Last Seen">{r.lastSeen}</div>
              <div className="adminRowActions">
                <button
                  type="button"
                  className={`btnTeal ${rebootingKey === r.key ? "isBusy" : ""}`}
                  disabled={!r.canReboot || rebootingKey !== null}
                  title={
                    !r.canReboot
                      ? "ใช้ได้เมื่อบอร์ดถูกผูกแล้ว"
                      : !r.online
                        ? "บอร์ดออฟไลน์ — ต้องเชื่อมต่อก่อนจึง Reboot ได้"
                        : "ส่งคำสั่ง Reboot ไปยังบอร์ด"
                  }
                  onClick={() => reboot(r.key, r.ownerUid, r.planId, r.deviceId, r.online, r.lastSeen)}
                >
                  {rebootingKey === r.key ? "Sending…" : "Reboot"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
