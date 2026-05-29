import { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { onValue, ref } from "firebase/database";
import { useAdminDataContext } from "../context/AdminDataContext";
import { database } from "../firebase";
import type { AlertEntry } from "../lib/rtdb-types";

type OutletCtx = { searchQuery: string };

function formatAlertTime(row: AlertEntry): string {
  const t = row.alertTime;
  if (typeof t === "number" && Number.isFinite(t)) {
    const ms = t < 1e12 ? t * 1000 : t;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString("th-TH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
  }
  return "-";
}

export function LogsPage() {
  const { searchQuery } = useOutletContext<OutletCtx>();
  const q = searchQuery.trim().toLowerCase();
  const { snapshot, loading, scope, isAdmin } = useAdminDataContext();

  const [tab, setTab] = useState<"system" | "user" | "hardware">("system");
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (!database) return;
    const cRef = ref(database, ".info/connected");
    const unsub = onValue(cRef, (snap) => setConnected(snap.val() === true));
    return () => unsub();
  }, []);

  const systemRows = useMemo(() => {
    const rows: Array<{ time: string; desc: string; ok: boolean }> = [];
    if (connected === null) {
      rows.push({
        time: "—",
        desc: "กำลังตรวจสอบการเชื่อมต่อ Realtime Database…",
        ok: true,
      });
      return rows;
    }
    rows.push({
      time: new Date().toLocaleString("th-TH"),
      desc:
        connected === true
          ? "เชื่อมต่อ Firebase Realtime Database สำเร็จ"
          : "ขาดการเชื่อมต่อ Firebase Realtime Database",
      ok: connected === true,
    });
    rows.push({
      time: new Date().toLocaleString("th-TH"),
      desc: `ขอบเขตข้อมูล: ${scope === "all" && isAdmin ? "ทั้งระบบ (แอดมิน)" : "เฉพาะบัญชีที่ล็อกอิน"}`,
      ok: true,
    });
    rows.push({
      time: new Date().toLocaleString("th-TH"),
      desc: `ผู้ใช้ ${snapshot.stats.totalUsers} คน · แปลง ${snapshot.stats.totalFarms} · กิจกรรม ${snapshot.activities.length} · แจ้งเตือน ${snapshot.stats.totalAlerts}`,
      ok: true,
    });
    return rows;
  }, [connected, scope, isAdmin, snapshot.stats, snapshot.activities.length]);

  const userRows = useMemo(() => {
    return snapshot.activities.slice(0, 100).map((row) => ({
      time: row.timestamp ?? "-",
      desc: `[${row.ownerEmail}] ${row.action ?? "-"}`,
      ok: true,
    }));
  }, [snapshot.activities]);

  const hardwareRows = useMemo(() => {
    return snapshot.alerts.slice(0, 100).map((row) => ({
      time: formatAlertTime(row),
      desc: `[${row.ownerEmail}] ${row.alertMessage ?? "-"}`,
      ok: false,
    }));
  }, [snapshot.alerts]);

  const rows = tab === "system" ? systemRows : tab === "user" ? userRows : hardwareRows;

  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter((r) => `${r.time} ${r.desc}`.toLowerCase().includes(q));
  }, [q, rows]);

  if (loading) {
    return (
      <div className="adminPage logsPage">
        <div className="adminBanner">กำลังโหลดบันทึก…</div>
      </div>
    );
  }

  return (
    <div className="adminPage logsPage">
      <div className="logTabs">
        <button
          type="button"
          className={tab === "system" ? "logTab active" : "logTab"}
          onClick={() => setTab("system")}
        >
          System ({systemRows.length})
        </button>
        <button
          type="button"
          className={tab === "user" ? "logTab active" : "logTab"}
          onClick={() => setTab("user")}
        >
          User Activity ({snapshot.activities.length})
        </button>
        <button
          type="button"
          className={tab === "hardware" ? "logTab active" : "logTab"}
          onClick={() => setTab("hardware")}
        >
          Hardware Alerts ({snapshot.stats.totalAlerts})
        </button>
      </div>

      <div className="adminTableWrap">
        <div className="adminTableHeader gridLogs">
          <div>เวลา</div>
          <div>รายละเอียด</div>
          <div>สถานะ</div>
        </div>
        {filtered.length === 0 ? (
          <div className="adminEmptyRow">ไม่พบบันทึก</div>
        ) : (
          filtered.map((r, idx) => (
            <div key={`${tab}-${idx}-${r.time}`} className="adminTableRow gridLogs">
              <div className="mono" data-label="เวลา">{r.time}</div>
              <div data-label="รายละเอียด">{r.desc}</div>
              <div className="adminStatusCell" data-label="สถานะ">
                <span className={r.ok ? "dot ok" : "dot bad"} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
