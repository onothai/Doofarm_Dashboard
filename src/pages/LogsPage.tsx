import { useMemo, useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAdminDataContext } from "../context/AdminDataContext";
import { markNotificationsAsSeen } from "../lib/alertReadState";
import { useSystemNotifications } from "../hooks/useSystemNotifications";
import { useUnreadNotifications } from "../hooks/useUnreadAlerts";
import type { SystemNotification, SystemNotificationKind } from "../lib/systemNotifications";

type OutletCtx = { searchQuery: string };

type LogTab = "status" | "alerts" | "user";

type LogStatusKind = "success" | "warning" | "error" | "neutral";

type LogRow = {
  time: string;
  desc: string;
  statusLabel: string;
  statusKind: LogStatusKind;
};

const ALERT_GROUP_ORDER: SystemNotificationKind[] = ["db", "offline", "farm"];

const ALERT_GROUP_LABEL: Record<SystemNotificationKind, string> = {
  db: "การเชื่อมต่อระบบ",
  offline: "บอร์ดออฟไลน์",
  farm: "แจ้งเตือนแปลง",
};

function LogStatusBadge({ label, kind }: { label: string; kind: LogStatusKind }) {
  return <span className={`logStatusBadge logStatusBadge--${kind}`}>{label}</span>;
}

function LogTable({ rows, emptyText }: { rows: LogRow[]; emptyText: string }) {
  if (rows.length === 0) {
    return <div className="adminEmptyRow">{emptyText}</div>;
  }

  return (
    <div className="adminTableWrap">
      <div className="adminTableHeader gridLogs">
        <div>เวลา</div>
        <div>รายละเอียด</div>
        <div>สถานะ</div>
      </div>
      {rows.map((r, idx) => (
        <div key={`${idx}-${r.time}-${r.desc}`} className="adminTableRow gridLogs">
          <div className="mono" data-label="เวลา">{r.time}</div>
          <div data-label="รายละเอียด">{r.desc}</div>
          <div className="adminStatusCell" data-label="สถานะ">
            <LogStatusBadge label={r.statusLabel} kind={r.statusKind} />
          </div>
        </div>
      ))}
    </div>
  );
}

function filterRows(rows: LogRow[], q: string): LogRow[] {
  if (!q) return rows;
  return rows.filter((r) =>
    `${r.time} ${r.desc} ${r.statusLabel}`.toLowerCase().includes(q),
  );
}

function notificationToRow(n: SystemNotification): LogRow {
  return {
    time: n.time,
    desc: n.desc,
    statusLabel: n.statusLabel,
    statusKind: n.statusKind,
  };
}

export function LogsPage() {
  const { searchQuery } = useOutletContext<OutletCtx>();
  const q = searchQuery.trim().toLowerCase();
  const { loading, scope, isAdmin, rtdbConnected, snapshot } = useAdminDataContext();
  const notifications = useSystemNotifications();
  const hasUnread = useUnreadNotifications(notifications);

  const [tab, setTab] = useState<LogTab>("status");

  useEffect(() => {
    if (tab !== "alerts") return;
    markNotificationsAsSeen(notifications);
  }, [tab, notifications]);

  const statusRows = useMemo((): LogRow[] => {
    if (rtdbConnected === null) {
      return [
        {
          time: "—",
          desc: "กำลังตรวจสอบการเชื่อมต่อ Realtime Database…",
          statusLabel: "กำลังตรวจสอบ",
          statusKind: "warning",
        },
      ];
    }

    return [
      {
        time: new Date().toLocaleString("th-TH"),
        desc:
          rtdbConnected === true
            ? "เชื่อมต่อ Firebase Realtime Database สำเร็จ"
            : "ขาดการเชื่อมต่อ Firebase Realtime Database",
        statusLabel: rtdbConnected === true ? "เชื่อมต่อแล้ว" : "ขาดการเชื่อมต่อ",
        statusKind: rtdbConnected === true ? "success" : "error",
      },
      {
        time: new Date().toLocaleString("th-TH"),
        desc: `ขอบเขตข้อมูล: ${scope === "all" && isAdmin ? "ทั้งระบบ (แอดมิน)" : "เฉพาะบัญชีที่ล็อกอิน"}`,
        statusLabel: "ปกติ",
        statusKind: "neutral",
      },
    ];
  }, [rtdbConnected, scope, isAdmin]);

  const alertGroups = useMemo(() => {
    return ALERT_GROUP_ORDER.map((kind) => ({
      kind,
      title: ALERT_GROUP_LABEL[kind],
      items: notifications.filter((n) => n.kind === kind),
    })).filter((g) => g.items.length > 0);
  }, [notifications]);

  const userRows = useMemo((): LogRow[] => {
    return snapshot.activities.slice(0, 100).map((row) => ({
      time: row.timestamp ?? "-",
      desc: `[${row.ownerEmail}] ${row.action ?? "-"}`,
      statusLabel: "บันทึกแล้ว",
      statusKind: "neutral" as const,
    }));
  }, [snapshot.activities]);

  const filteredStatusRows = useMemo(() => filterRows(statusRows, q), [statusRows, q]);
  const filteredUserRows = useMemo(() => filterRows(userRows, q), [userRows, q]);

  if (loading) {
    return (
      <div className="adminPage logsPage">
        <div className="adminBanner">กำลังโหลดบันทึก…</div>
      </div>
    );
  }

  const tabHint =
    tab === "status"
      ? "สถานะทั่วไปของระบบ — ไม่นับเป็นแจ้งเตือน"
      : tab === "alerts"
        ? "แจ้งเตือนที่ต้องดู — ตัวเลขตรงกับการ์ด Dashboard"
        : "กิจกรรมที่ผู้ใช้/แอดมินทำในระบบ";

  return (
    <div className="adminPage logsPage">
      <div className="logTabs">
        <button
          type="button"
          className={tab === "status" ? "logTab active" : "logTab"}
          onClick={() => setTab("status")}
        >
          สถานะระบบ ({statusRows.length})
        </button>
        <button
          type="button"
          className={tab === "alerts" ? "logTab active" : "logTab"}
          onClick={() => setTab("alerts")}
        >
          แจ้งเตือน ({notifications.length})
          {hasUnread ? (
            <span className="logTabUnreadDot" aria-label="มีแจ้งเตือนใหม่" />
          ) : null}
        </button>
        <button
          type="button"
          className={tab === "user" ? "logTab active" : "logTab"}
          onClick={() => setTab("user")}
        >
          กิจกรรมผู้ใช้ ({snapshot.activities.length})
        </button>
      </div>

      <p className="logTabHint">{tabHint}</p>

      {tab === "status" ? (
        <LogTable rows={filteredStatusRows} emptyText="ไม่พบข้อมูลสถานะ" />
      ) : null}

      {tab === "alerts" ? (
        notifications.length === 0 ? (
          <div className="logSectionEmpty">ไม่มีแจ้งเตือน — ระบบปกติ</div>
        ) : (
          <div className="logSections">
            {alertGroups.map((group) => {
              const rows = filterRows(group.items.map(notificationToRow), q);
              if (q && rows.length === 0) return null;
              return (
                <section key={group.kind} className="logSection">
                  <div className="logSectionHead">
                    <h3 className="logSectionTitle">{group.title}</h3>
                    <span className="logSectionCount">{group.items.length} รายการ</span>
                  </div>
                  <LogTable
                    rows={rows}
                    emptyText={`ไม่พบ${group.title}ที่ค้นหา`}
                  />
                </section>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "user" ? (
        <LogTable rows={filteredUserRows} emptyText="ไม่พบบันทึกกิจกรรม" />
      ) : null}
    </div>
  );
}
