import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { SortableHeader } from "../components/SortableHeader";
import { TableSortSelect } from "../components/TableSortSelect";
import { useAdminDataContext } from "../context/AdminDataContext";
import { useTableSort } from "../hooks/useTableSort";
import { buildSortOptions, type SortValueKind } from "../lib/tableSort";
import type { FarmRow } from "../lib/rtdb-types";

type OutletCtx = { searchQuery: string };

type FarmSortKey =
  | "farmName"
  | "planId"
  | "ownerName"
  | "deviceId"
  | "temperature"
  | "humidity"
  | "soilMoisture"
  | "pumpStatus"
  | "autoMode"
  | "online";

const FARM_SORT_KIND: Record<FarmSortKey, SortValueKind> = {
  farmName: "thText",
  planId: "enText",
  ownerName: "thText",
  deviceId: "enText",
  temperature: "number",
  humidity: "number",
  soilMoisture: "number",
  pumpStatus: "number",
  autoMode: "bool",
  online: "bool",
};

const FARM_SORT_OPTIONS = buildSortOptions([
  { key: "farmName", label: "ชื่อแปลง", kind: "thText" },
  { key: "planId", label: "Plan ID", kind: "enText" },
  { key: "ownerName", label: "เจ้าของ", kind: "thText" },
  { key: "deviceId", label: "Device", kind: "enText" },
  { key: "temperature", label: "อุณหภูมิ", kind: "number" },
  { key: "humidity", label: "ความชื้นอากาศ", kind: "number" },
  { key: "soilMoisture", label: "ความชื้นดิน", kind: "number" },
  { key: "pumpStatus", label: "ปั๊ม", kind: "number" },
  { key: "autoMode", label: "โหมดอัตโนมัติ", kind: "bool" },
  { key: "online", label: "สถานะ", kind: "bool" },
]);

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

  const { sort, toggleSort, setSortDirect, sortedRows } = useTableSort<FarmRow, FarmSortKey>(
    filtered,
    {
      defaultKey: "farmName",
      kindByKey: FARM_SORT_KIND,
      getValue: (row, key) => {
        switch (key) {
          case "farmName":
            return row.farmName;
          case "planId":
            return row.planId;
          case "ownerName":
            return row.ownerName;
          case "deviceId":
            return row.deviceId;
          case "temperature":
            return row.sensor?.temperature ?? null;
          case "humidity":
            return row.sensor?.humidity ?? null;
          case "soilMoisture":
            return row.sensor?.soilMoisture ?? null;
          case "pumpStatus":
            return row.pumpStatus ?? null;
          case "autoMode":
            return row.autoMode ?? false;
          case "online":
            return row.online;
        }
      },
    },
  );

  const headerProps = { activeKey: sort.key, dir: sort.dir, onSort: toggleSort };

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
        <TableSortSelect
          options={FARM_SORT_OPTIONS}
          activeKey={sort.key}
          dir={sort.dir}
          onChange={setSortDirect}
        />
      </div>

      <div className="adminTableWrap">
        <div className="adminTableHeader gridFarms">
          <SortableHeader label="ชื่อแปลง" sortKey="farmName" {...headerProps} />
          <SortableHeader label="เจ้าของ" sortKey="ownerName" {...headerProps} />
          <SortableHeader label="Device" sortKey="deviceId" {...headerProps} />
          <SortableHeader label="อุณหภูมิ" sortKey="temperature" {...headerProps} />
          <SortableHeader label="ความชื้นอากาศ" sortKey="humidity" {...headerProps} />
          <SortableHeader label="ความชื้นดิน" sortKey="soilMoisture" {...headerProps} />
          <SortableHeader label="ปั๊ม" sortKey="pumpStatus" {...headerProps} />
          <SortableHeader label="สถานะ" sortKey="online" {...headerProps} />
          <div className="adminColActions" />
        </div>

        {sortedRows.length === 0 ? (
          <div className="adminEmptyRow">ไม่พบแปลงที่ผูกอุปกรณ์</div>
        ) : (
          sortedRows.map((f) => (
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
