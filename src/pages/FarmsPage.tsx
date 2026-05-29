import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAdminDataContext } from "../context/AdminDataContext";

type OutletCtx = { searchQuery: string };

function fmtNum(v: number | undefined | null, suffix = ""): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)}${suffix}`;
}

export function FarmsPage() {
  const { searchQuery } = useOutletContext<OutletCtx>();
  const q = searchQuery.trim().toLowerCase();
  const { snapshot, loading, permHint } = useAdminDataContext();

  const filtered = useMemo(() => {
    const rows = snapshot.farms;
    if (!q) return rows;
    return rows.filter((f) =>
      [
        f.farmName,
        f.deviceId,
        f.planId,
        f.ownerName,
        f.ownerEmail,
        f.uid,
      ].some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [q, snapshot.farms]);

  if (loading) {
    return (
      <div className="adminPage">
        <div className="adminBanner">กำลังโหลดข้อมูลแปลง…</div>
      </div>
    );
  }

  return (
    <div className="adminPage">
      {permHint ? <div className="adminBanner">{permHint}</div> : null}

      <div className="adminToolbar">
        <div className="sortPill">
          แปลงทั้งหมด: {snapshot.farms.length} · ออนไลน์:{" "}
          {snapshot.farms.filter((f) => f.online).length}
        </div>
      </div>

      <div className="adminTableWrap">
        <div className="adminTableHeader gridFarms">
          <div>ชื่อแปลง</div>
          <div>เจ้าของ</div>
          <div>Device</div>
          <div>อุณหภูมิ</div>
          <div>ความชื้นอากาศ</div>
          <div>ความชื้นดิน</div>
          <div>ปั๊ม</div>
          <div>สถานะ</div>
          <div className="adminColActions" />
        </div>

        {filtered.length === 0 ? (
          <div className="adminEmptyRow">ไม่พบแปลงที่ผูกอุปกรณ์</div>
        ) : (
          filtered.map((f) => (
            <div key={`${f.uid}-${f.deviceId}-${f.planId}`} className="adminTableRow gridFarms">
              <div data-label="ชื่อแปลง">
                <strong>{f.farmName}</strong>
                <div className="rowSub mono">{f.planId}</div>
              </div>
              <div data-label="เจ้าของ">
                {f.ownerName}
                <div className="rowSub">{f.ownerEmail}</div>
              </div>
              <div className="mono" data-label="Device">{f.deviceId}</div>
              <div data-label="อุณหภูมิ">{fmtNum(f.sensor?.temperature, " °C")}</div>
              <div data-label="ความชื้นอากาศ">{fmtNum(f.sensor?.humidity, " %")}</div>
              <div data-label="ความชื้นดิน">{fmtNum(f.sensor?.soilMoisture, " %")}</div>
              <div data-label="ปั๊ม">
                {f.pumpStatus === 1 ? "เปิด" : f.pumpStatus === 0 ? "ปิด" : "—"}
                {f.autoMode != null ? (
                  <div className="rowSub">{f.autoMode ? "ออโต้" : "มือ"}</div>
                ) : null}
              </div>
              <div data-label="สถานะ">
                <span className={f.online ? "badgeOnline" : "badgeOffline"}>
                  {f.online ? "Online" : "Offline"}
                </span>
              </div>
              <div className="adminRowActions">
                <Link
                  to={`/farms/manage/${encodeURIComponent(f.uid)}/${encodeURIComponent(f.planId)}`}
                  className="btnTeal"
                >
                  จัดการ
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
