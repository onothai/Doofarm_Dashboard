import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useAdminDataContext } from "../context/AdminDataContext";
import type { UserRow } from "../lib/rtdb-types";

type OutletCtx = { searchQuery: string };

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

  const userFarms = useMemo(() => {
    if (!viewUser) return [];
    return snapshot.farms.filter((f) => f.uid === viewUser.uid);
  }, [viewUser, snapshot.farms]);

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
      </div>

      <div className="adminTableWrap">
        <div className="adminTableHeader gridUsers">
          <div>UID</div>
          <div>ชื่อ</div>
          <div>อีเมล</div>
          <div>โทรศัพท์</div>
          <div>แปลง</div>
          <div>แจ้งเตือน</div>
          <div className="adminColActions" />
        </div>

        {filtered.length === 0 ? (
          <div className="adminEmptyRow">ไม่พบผู้ใช้</div>
        ) : (
          filtered.map((r) => (
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
                    <div key={`${f.deviceId}-${f.planId}`} className="modalFarmItem">
                      <strong>{f.farmName}</strong>
                      <span>
                        {f.deviceId} · {f.planId} ·{" "}
                        {f.online ? "ออนไลน์" : "ออฟไลน์"}
                      </span>
                    </div>
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
