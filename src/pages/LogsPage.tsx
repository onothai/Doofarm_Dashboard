import { useMemo, useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { SortableHeader } from "../components/SortableHeader";
import { useAdminDataContext } from "../context/AdminDataContext";
import { applyTableSort } from "../hooks/useTableSort";
import { markNotificationsAsSeen } from "../lib/alertReadState";
import {
  defaultDirForKind,
  type SortDir,
  type SortState,
  type SortValueKind,
} from "../lib/tableSort";
import { useSystemNotifications } from "../hooks/useSystemNotifications";
import { useUnreadNotifications } from "../hooks/useUnreadAlerts";
import type { SystemNotification, SystemNotificationKind } from "../lib/systemNotifications";

type OutletCtx = { searchQuery: string };

type LogTab = "status" | "alerts" | "user";

type LogStatusKind = "success" | "warning" | "error" | "neutral";

type LogSortKey = "timeMs" | "desc" | "statusLabel";

type LogRow = {
  time: string;
  timeMs?: number;
  desc: string;
  statusLabel: string;
  statusKind: LogStatusKind;
};

const LOG_SORT_KIND: Record<LogSortKey, SortValueKind> = {
  timeMs: "number",
  desc: "thText",
  statusLabel: "thText",
};

const ALERT_GROUP_ORDER: SystemNotificationKind[] = ["db", "offline", "farm"];

const ALERT_GROUP_LABEL: Record<SystemNotificationKind, string> = {
  db: "การเชื่อมต่อระบบ",
  offline: "บอร์ดออฟไลน์",
  farm: "แจ้งเตือนแปลง",
};

function logGetValue(row: LogRow, key: LogSortKey) {
  switch (key) {
    case "timeMs":
      return row.timeMs ?? 0;
    case "desc":
      return row.desc;
    case "statusLabel":
      return row.statusLabel;
  }
}

function LogStatusBadge({ label, kind }: { label: string; kind: LogStatusKind }) {
  return <span className={`logStatusBadge logStatusBadge--${kind}`}>{label}</span>;
}

function LogTable({
  rows,
  emptyText,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: LogRow[];
  emptyText: string;
  sortKey: LogSortKey;
  sortDir: SortDir;
  onSort: (key: LogSortKey) => void;
}) {
  if (rows.length === 0) {
    return <div className="adminEmptyRow">{emptyText}</div>;
  }

  const headerProps = { activeKey: sortKey, dir: sortDir, onSort };

  return (
    <div className="adminTableWrap">
      <div className="adminTableHeader gridLogs">
        <SortableHeader label="เวลา" sortKey="timeMs" {...headerProps} />
        <SortableHeader label="รายละเอียด" sortKey="desc" {...headerProps} />
        <SortableHeader label="สถานะ" sortKey="statusLabel" {...headerProps} />
      </div>
      {rows.map((r, idx) => (
        <div key={`${idx}-${r.timeMs ?? r.time}-${r.desc}`} className="adminTableRow gridLogs">
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
    timeMs: n.timeMs,
    desc: n.desc,
    statusLabel: n.statusLabel,
    statusKind: n.statusKind,
  };
}

function formatCheckedAt(ms: number): string {
  return new Date(ms).toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildStatusRows(
  rtdbConnected: boolean | null,
  scope: "all" | "self",
  isAdmin: boolean,
): LogRow[] {
  if (rtdbConnected === null) {
    return [
      {
        time: "—",
        timeMs: 0,
        desc: "กำลังตรวจสอบการเชื่อมต่อ Realtime Database…",
        statusLabel: "กำลังตรวจสอบ",
        statusKind: "warning",
      },
    ];
  }

  return [
    {
      time: formatCheckedAt(Date.now()),
      timeMs: Date.now(),
      desc:
        rtdbConnected === true
          ? "เชื่อมต่อ Firebase Realtime Database สำเร็จ"
          : "ขาดการเชื่อมต่อ Firebase Realtime Database",
      statusLabel: rtdbConnected === true ? "เชื่อมต่อแล้ว" : "ขาดการเชื่อมต่อ",
      statusKind: rtdbConnected === true ? "success" : "error",
    },
    {
      time: "—",
      timeMs: 0,
      desc: `ขอบเขตข้อมูล: ${scope === "all" && isAdmin ? "ทั้งระบบ (แอดมิน)" : "เฉพาะบัญชีที่ล็อกอิน"}`,
      statusLabel: "ปกติ",
      statusKind: "neutral",
    },
  ];
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

  const statusRows = buildStatusRows(rtdbConnected, scope, isAdmin);

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
      timeMs: typeof row.timestampMs === "number" ? row.timestampMs : 0,
      desc: `[${row.ownerEmail}] ${row.action ?? "-"}`,
      statusLabel: "บันทึกแล้ว",
      statusKind: "neutral" as const,
    }));
  }, [snapshot.activities]);

  const filteredStatusBase = useMemo(() => filterRows(statusRows, q), [statusRows, q]);
  const filteredUserBase = useMemo(() => filterRows(userRows, q), [userRows, q]);

  const [sort, setSort] = useState<SortState<LogSortKey>>({
    key: "timeMs",
    dir: defaultDirForKind("number"),
  });

  const toggleSort = useCallback((key: LogSortKey) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: defaultDirForKind(LOG_SORT_KIND[key]) };
    });
  }, []);

  const sortConfig = { kindByKey: LOG_SORT_KIND, getValue: logGetValue };

  const sortedStatusRows = useMemo(
    () => applyTableSort(filteredStatusBase, sort, sortConfig),
    [filteredStatusBase, sort],
  );

  const sortedUserRows = useMemo(
    () => applyTableSort(filteredUserBase, sort, sortConfig),
    [filteredUserBase, sort],
  );

  const logTableProps = {
    sortKey: sort.key,
    sortDir: sort.dir,
    onSort: toggleSort,
  };

  if (loading) {
    return (
      <div className="adminPage logsPage">
        <div className="adminBanner">กำลังโหลดบันทึก…</div>
      </div>
    );
  }

  const tabHint =
    tab === "status"
      ? "สถานะทั่วไป — เวลาเชื่อมต่อ = ตอนตรวจล่าสุด (เปลี่ยนทุกครั้งที่เปิดหน้านี้)"
      : tab === "alerts"
        ? "แจ้งเตือนที่ต้องดู — บอร์ดออฟไลน์ / แปลง / การเชื่อมต่อ"
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
        <LogTable
          rows={sortedStatusRows}
          emptyText="ไม่พบข้อมูลสถานะ"
          {...logTableProps}
        />
      ) : null}

      {tab === "alerts" ? (
        notifications.length === 0 ? (
          <div className="logSectionEmpty">ไม่มีแจ้งเตือน — ระบบปกติ</div>
        ) : (
          <div className="logSections">
            {alertGroups.map((group) => {
              const rows = applyTableSort(
                filterRows(group.items.map(notificationToRow), q),
                sort,
                sortConfig,
              );
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
                    {...logTableProps}
                  />
                </section>
              );
            })}
          </div>
        )
      ) : null}

      {tab === "user" ? (
        <LogTable
          rows={sortedUserRows}
          emptyText="ไม่พบบันทึกกิจกรรม"
          {...logTableProps}
        />
      ) : null}
    </div>
  );
}
