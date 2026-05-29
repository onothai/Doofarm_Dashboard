import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { ref, set } from "firebase/database";
import { useAdminDataContext } from "../context/AdminDataContext";
import { database } from "../firebase";
import { resolvePlanId } from "../lib/plan-id";
import type { RegistryRow } from "../lib/rtdb-types";

type OutletCtx = { searchQuery: string };

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

  const emailByUid = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of snapshot.users) map.set(u.uid, u.email);
    return map;
  }, [snapshot.users]);

  const filtered = useMemo(() => {
    const list = Object.entries(registry).map(([id, row]) => ({ id, row }));
    list.sort((a, b) => String(a.id).localeCompare(String(b.id)));

    return list
      .filter(({ id, row }) => {
        const ownerEmail = row.owner ? (emailByUid.get(row.owner) ?? "") : "";
        const hay = `${id} ${row.owner ?? ""} ${ownerEmail} ${row.fwVersion ?? ""}`.toLowerCase();
        return !q || hay.includes(q);
      })
      .map(({ id, row }) => {
        const last = typeof row.lastOnlineAt === "number" ? row.lastOnlineAt : null;
        const online =
          last != null && Number.isFinite(last) ? Date.now() - last <= 120_000 : false;
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
          bound: row.bound === true ? "ผูกแล้ว" : "ว่าง",
          version: row.fwVersion ? String(row.fwVersion) : "—",
          lastSeen: last ? formatRelativeTh(last) : "—",
          canReboot,
          ownerUid,
        };
      });
  }, [registry, q, emailByUid, doofarmRaw, isAdmin, uid]);

  const reboot = async (ownerUid: string, planId: string) => {
    if (!database || !ownerUid || ownerUid === "—") return;
    const ok = window.confirm(`ยืนยันการรีบูตบอร์ด (plan: ${planId})?`);
    if (!ok) return;
    try {
      await set(
        ref(database, `Doofarm/${ownerUid}/${planId}/Pump/rebootRequest`),
        true,
      );
      alert("ส่งคำสั่งรีบูตแล้ว");
    } catch {
      alert("ส่งคำสั่งไม่สำเร็จ — ตรวจสอบสิทธิ์ AdminUsers และ Database Rules");
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
      <div className="adminToolbar">
        <div className="sortPill">
          บอร์ดทั้งหมด: {Object.keys(registry).length} · ผูกแล้ว:{" "}
          {snapshot.stats.totalBoards} · ออนไลน์: {snapshot.stats.onlineBoards}
        </div>
      </div>

      <div className="adminTableWrap">
        <div className="adminTableHeader gridDevices">
          <div>Device ID</div>
          <div>Owner UID</div>
          <div>อีเมลเจ้าของ</div>
          <div>สถานะ</div>
          <div>Plan ID</div>
          <div>เวอร์ชัน</div>
          <div>Last Seen</div>
          <div className="adminColActions" />
        </div>

        {filtered.length === 0 ? (
          <div className="adminEmptyRow">ไม่พบบอร์ดใน DeviceRegistry</div>
        ) : (
          filtered.map((r) => (
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
                  className="btnTeal"
                  disabled={!r.canReboot}
                  title={
                    r.canReboot
                      ? "ส่งคำสั่งรีบูตไปยังบอร์ด"
                      : "ใช้ได้เมื่อบอร์ดถูกผูกแล้ว"
                  }
                  onClick={() => reboot(r.ownerUid, r.planId)}
                >
                  Reboot
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
