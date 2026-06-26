import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { SortableHeader } from "../components/SortableHeader";
import { TableSortSelect } from "../components/TableSortSelect";
import { useAdminDataContext } from "../context/AdminDataContext";
import { useTableSort } from "../hooks/useTableSort";
import { buildSortOptions, type SortValueKind } from "../lib/tableSort";
import type { UserRow } from "../lib/rtdb-types";

type OutletCtx = { searchQuery: string };

type UserSortKey =
  | "uid"
  | "name"
  | "email"
  | "phone"
  | "deviceCount"
  | "notificationsEnabled";

const USER_SORT_KIND: Record<UserSortKey, SortValueKind> = {
  uid: "enText",
  name: "thText",
  email: "enText",
  phone: "enText",
  deviceCount: "number",
  notificationsEnabled: "bool",
};

const USER_SORT_OPTIONS = buildSortOptions([
  { key: "uid", label: "UID", kind: "enText" },
  { key: "name", label: "ชื่อ", kind: "thText" },
  { key: "email", label: "อีเมล", kind: "enText" },
  { key: "phone", label: "โทรศัพท์", kind: "enText" },
  { key: "deviceCount", label: "แปลง", kind: "number" },
  { key: "notificationsEnabled", label: "แจ้งเตือน", kind: "bool" },
]);

export function UsersPage() {
  const { searchQuery } = useOutletContext<OutletCtx>();
  const q = searchQuery.trim().toLowerCase();
  const [searchParams] = useSearchParams();
  const { snapshot, loading, permHint } = useAdminDataContext();
  const [viewUser, setViewUser] = useState<UserRow | null>(null);

  useEffect(() => {
    const uid = searchParams.get("uid");
    if (!uid) return;
    const user = snapshot.users.find((u) => u.uid === uid);
    if (user) setViewUser(user);
  }, [searchParams, snapshot.users]);

  const filtered = useMemo(() => {
    const rows = snapshot.users;
    if (!q) return rows;
    return rows.filter((r) =>
      [r.uid, r.name, r.phone, r.email, String(r.deviceCount)].some((x) =>
        String(x).toLowerCase().includes(q),
      ),
    );
  }, [q, snapshot.users]);

  const { sort, toggleSort, setSortDirect, sortedRows } = useTableSort<UserRow, UserSortKey>(
    filtered,
    {
      defaultKey: "name",
      kindByKey: USER_SORT_KIND,
      getValue: (row, key) => {
        switch (key) {
          case "uid":
            return row.uid;
          case "name":
            return row.name;
          case "email":
            return row.email;
          case "phone":
            return row.phone;
          case "deviceCount":
            return row.deviceCount;
          case "notificationsEnabled":
            return row.notificationsEnabled;
        }
      },
    },
  );

  const userFarms = useMemo(() => {
    if (!viewUser) return [];
    return snapshot.farms.filter((f) => f.uid === viewUser.uid);
  }, [viewUser, snapshot.farms]);

  const headerProps = { activeKey: sort.key, dir: sort.dir, onSort: toggleSort };

  if (loading) {
    return (
      <div className="adminPage">
        <div className="adminBanner">กำลังโหลดรายชื่อผู้ใช้…</div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      {permHint ? <div className="adminBanner">{permHint}</div> : null}

      <div className="adminToolbar">
        <div className="sortPill">ผู้ใช้ทั้งหมด: {snapshot.users.length} คน</div>
        <TableSortSelect
          options={USER_SORT_OPTIONS}
          activeKey={sort.key}
          dir={sort.dir}
          onChange={setSortDirect}
        />
      </div>

      <div className="adminTableWrap">
        <div className="adminTableHeader gridUsers">
          <SortableHeader label="UID" sortKey="uid" {...headerProps} />
          <SortableHeader label="ชื่อ" sortKey="name" {...headerProps} />
          <SortableHeader label="อีเมล" sortKey="email" {...headerProps} />
          <SortableHeader label="โทรศัพท์" sortKey="phone" {...headerProps} />
          <SortableHeader label="แปลง" sortKey="deviceCount" {...headerProps} />
          <SortableHeader label="แจ้งเตือน" sortKey="notificationsEnabled" {...headerProps} />
          <div className="adminColActions" />
        </div>

        {sortedRows.length === 0 ? (
          <div className="adminEmptyRow">ไม่พบผู้ใช้</div>
        ) : (
          sortedRows.map((r) => (
            <div key={r.uid} className="adminTableRow gridUsers">
              <div className="mono" title={r.uid} data-label="UID">
                {r.uid.slice(0, 10)}…
              </div>
              <div data-label="ชื่อ">{r.name}</div>
              <div data-label="อีเมล">{r.email}</div>
              <div data-label="โทรศัพท์">{r.phone}</div>
              <div data-label="แปลง">{r.deviceCount}</div>
              <div data-label="แจ้งเตือน">{r.notificationsEnabled ? "เปิด" : "ปิด"}</div>
              <div className="adminRowActions">
                <button type="button" className="btnTeal" onClick={() => setViewUser(r)}>
                  ดูรายละเอียด
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {viewUser ? (
        <div className="modalBackdrop" onClick={() => setViewUser(null)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <h2>{viewUser.name}</h2>
              <button type="button" className="modalClose" onClick={() => setViewUser(null)}>
                ×
              </button>
            </div>
            <div className="modalBody">
              <div className="detailGrid">
                <div>
                  <span className="detailK">UID</span>
                  <span className="detailV mono">{viewUser.uid}</span>
                </div>
                <div>
                  <span className="detailK">อีเมล</span>
                  <span className="detailV">{viewUser.email}</span>
                </div>
                <div>
                  <span className="detailK">โทรศัพท์</span>
                  <span className="detailV">{viewUser.phone}</span>
                </div>
                <div>
                  <span className="detailK">PDPA</span>
                  <span className="detailV">
                    {viewUser.consentAccepted ? "ยอมรับแล้ว" : "ยังไม่ยอมรับ"}
                  </span>
                </div>
              </div>

              <h3 className="modalSub">แปลงที่ผูก ({userFarms.length})</h3>
              {userFarms.length === 0 ? (
                <p className="modalMuted">ยังไม่มีแปลงที่ผูกอุปกรณ์</p>
              ) : (
                <div className="modalFarmList">
                  {userFarms.map((f) => (
                    <Link
                      key={`${f.deviceId}-${f.planId}`}
                      to={`/farms/manage/${encodeURIComponent(f.uid)}/${encodeURIComponent(f.planId)}`}
                      className="modalFarmItem modalFarmItemLink"
                      onClick={() => setViewUser(null)}
                    >
                      <strong>{f.farmName}</strong>
                      <span>
                        {f.deviceId} · {f.planId} ·{" "}
                        {f.online ? "ออนไลน์" : "ออฟไลน์"}
                      </span>
                      <span className="modalFarmItemAction">จัดการแปลง →</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
