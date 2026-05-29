import { onValue, ref } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminDataContext } from "../context/AdminDataContext";
import { database } from "../firebase";
import {
  logAdminActivity,
  requestReboot,
  setFarmName,
  setMoistureThreshold,
  setPumpControl,
  setSchedule,
} from "../lib/farmControl";
import type { FarmAlertRow, PlanNode } from "../lib/rtdb-types";

function fmtNum(v: number | undefined | null, suffix = ""): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)}${suffix}`;
}

export function FarmManagePage() {
  const { ownerUid = "", planId = "" } = useParams();
  const { snapshot } = useAdminDataContext();

  const farmMeta = useMemo(
    () => snapshot.farms.find((f) => f.uid === ownerUid && f.planId === planId),
    [snapshot.farms, ownerUid, planId],
  );

  const [plan, setPlan] = useState<PlanNode | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [farmName, setFarmNameLocal] = useState("");
  const [moisture, setMoisture] = useState(30);
  const [scheduleOn, setScheduleOn] = useState("06:00");
  const [scheduleOff, setScheduleOff] = useState("06:30");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  useEffect(() => {
    if (!database || !ownerUid || !planId) return;
    const pRef = ref(database, `Doofarm/${ownerUid}/${planId}`);
    const unsub = onValue(pRef, (snap) => {
      const val = snap.exists() ? (snap.val() as PlanNode) : null;
      setPlan(val);
      if (val?.Settings?.setValueMoisture != null) {
        setMoisture(val.Settings.setValueMoisture);
      }
      if (val?.Settings?.scheduleOnTime) setScheduleOn(val.Settings.scheduleOnTime);
      if (val?.Settings?.scheduleOffTime) setScheduleOff(val.Settings.scheduleOffTime);
      if (typeof val?.Settings?.scheduleEnabled === "boolean") {
        setScheduleEnabled(val.Settings.scheduleEnabled);
      }
    });
    return () => unsub();
  }, [ownerUid, planId]);

  useEffect(() => {
    if (farmMeta?.farmName) setFarmNameLocal(farmMeta.farmName);
  }, [farmMeta?.farmName]);

  const sensor = plan?.SensorRealtime;
  const autoMode = plan?.Settings?.autoMode === true;
  const pumpOn = plan?.Pump?.pumpStatus === 1;

  const recentAlerts = useMemo(() => {
    const rows = plan?.Alerts ?? {};
    return Object.entries(rows as Record<string, FarmAlertRow>)
      .map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => Number(b.alertTime ?? 0) - Number(a.alertTime ?? 0))
      .slice(0, 5);
  }, [plan?.Alerts]);

  const recentLogs = useMemo(() => {
    const rows = plan?.ActivityLogs ?? {};
    return Object.values(rows)
      .sort((a, b) => Number(b.timestampMs ?? 0) - Number(a.timestampMs ?? 0))
      .slice(0, 8);
  }, [plan?.ActivityLogs]);

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(okMsg);
    } catch {
      setMsg("ดำเนินการไม่สำเร็จ — ตรวจสอบสิทธิ์ Firebase Rules");
    } finally {
      setBusy(false);
    }
  };

  if (!ownerUid || !planId) {
    return <div className="adminPage"><div className="adminBanner">ไม่พบแปลง</div></div>;
  }

  return (
    <div className="adminPage farmManagePage">
      <div className="farmManageHead">
        <div>
          <Link to="/farms" className="backLink">← กลับรายการแปลง</Link>
          <h1 className="farmManageTitle">{farmMeta?.farmName ?? planId}</h1>
          <p className="farmManageSub">
            {farmMeta?.ownerName ?? "—"} · {farmMeta?.ownerEmail ?? "—"} ·{" "}
            <span className="mono">{farmMeta?.deviceId ?? "—"}</span>
          </p>
        </div>
        <span className={farmMeta?.online ? "badgeOnline" : "badgeOffline"}>
          {farmMeta?.online ? "Online" : "Offline"}
        </span>
      </div>

      {msg ? <div className="adminBanner adminBannerOk">{msg}</div> : null}

      <div className="farmManageGrid">
        <section className="manageCard">
          <h2>เซนเซอร์ Realtime</h2>
          <div className="sensorGrid">
            <div><span>อุณหภูมิ</span><strong>{fmtNum(sensor?.temperature, " °C")}</strong></div>
            <div><span>ความชื้นอากาศ</span><strong>{fmtNum(sensor?.humidity, " %")}</strong></div>
            <div><span>ความชื้นดิน</span><strong>{fmtNum(sensor?.soilMoisture, " %")}</strong></div>
            <div><span>แสง</span><strong>{fmtNum(sensor?.lightIntensity, " lux")}</strong></div>
          </div>
        </section>

        <section className="manageCard">
          <h2>ควบคุมปั๊ม (เหมือนในแอป)</h2>
          <p className="manageHint">
            แอดมินสั่งงานแทนลูกค้า — บันทึกลง ActivityLogs อัตโนมัติ
          </p>
          <div className="manageRow">
            <span>โหมด</span>
            <div className="btnRow">
              <button
                type="button"
                className={autoMode ? "btnTeal" : "btnBlack"}
                disabled={busy}
                onClick={() =>
                  run(
                    () => setPumpControl(ownerUid, planId, { autoMode: true, pumpOn }),
                    "เปิดโหมดอัตโนมัติแล้ว",
                  )
                }
              >
                อัตโนมัติ
              </button>
              <button
                type="button"
                className={!autoMode ? "btnTeal" : "btnBlack"}
                disabled={busy}
                onClick={() =>
                  run(
                    () => setPumpControl(ownerUid, planId, { autoMode: false, pumpOn }),
                    "เปิดโหมดมือแล้ว",
                  )
                }
              >
                มือ
              </button>
            </div>
          </div>
          {!autoMode ? (
            <div className="manageRow">
              <span>ปั๊ม</span>
              <div className="btnRow">
                <button
                  type="button"
                  className={pumpOn ? "btnTeal" : "btnBlack"}
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => setPumpControl(ownerUid, planId, { autoMode: false, pumpOn: true }),
                      "สั่งเปิดปั๊มแล้ว",
                    )
                  }
                >
                  เปิดปั๊ม
                </button>
                <button
                  type="button"
                  className={!pumpOn ? "btnTeal" : "btnBlack"}
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => setPumpControl(ownerUid, planId, { autoMode: false, pumpOn: false }),
                      "สั่งปิดปั๊มแล้ว",
                    )
                  }
                >
                  ปิดปั๊ม
                </button>
              </div>
            </div>
          ) : (
            <p className="manageStatus">สถานะปั๊ม: {pumpOn ? "เปิด" : "ปิด"} (ออโต้)</p>
          )}
          <button
            type="button"
            className="btnBlack manageFullBtn"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("ยืนยันรีบูตบอร์ด?")) return;
              run(() => requestReboot(ownerUid, planId), "ส่งคำสั่งรีบูตแล้ว");
            }}
          >
            รีบูตบอร์ด
          </button>
        </section>

        <section className="manageCard">
          <h2>ตั้งค่าแปลง</h2>
          <label className="manageField">
            ชื่อแปลง
            <input
              className="loginInput"
              value={farmName}
              onChange={(e) => setFarmNameLocal(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="btnTeal manageFullBtn"
            disabled={busy || !farmMeta?.deviceId}
            onClick={() =>
              run(async () => {
                if (!farmMeta?.deviceId) return;
                await setFarmName(ownerUid, farmMeta.deviceId, farmName);
                await logAdminActivity(ownerUid, planId, `เปลี่ยนชื่อแปลงเป็น "${farmName}"`);
              }, "บันทึกชื่อแปลงแล้ว")
            }
          >
            บันทึกชื่อแปลง
          </button>

          <label className="manageField">
            ความชื้นดินเป้าหมาย (%)
            <input
              className="loginInput"
              type="number"
              min={0}
              max={100}
              value={moisture}
              onChange={(e) => setMoisture(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="btnTeal manageFullBtn"
            disabled={busy}
            onClick={() =>
              run(
                () => setMoistureThreshold(ownerUid, planId, moisture),
                "บันทึกค่าความชื้นดินแล้ว",
              )
            }
          >
            บันทึกความชื้นดิน
          </button>

          <label className="manageCheck">
            <input
              type="checkbox"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
            />
            เปิดตั้งเวลารดน้ำ
          </label>
          <div className="scheduleRow">
            <label className="manageField">
              เปิด
              <input
                className="loginInput"
                type="time"
                value={scheduleOn}
                onChange={(e) => setScheduleOn(e.target.value)}
              />
            </label>
            <label className="manageField">
              ปิด
              <input
                className="loginInput"
                type="time"
                value={scheduleOff}
                onChange={(e) => setScheduleOff(e.target.value)}
              />
            </label>
          </div>
          <button
            type="button"
            className="btnTeal manageFullBtn"
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  setSchedule(ownerUid, planId, {
                    enabled: scheduleEnabled,
                    onTime: scheduleOn,
                    offTime: scheduleOff,
                  }),
                "บันทึกตั้งเวลาแล้ว",
              )
            }
          >
            บันทึกตั้งเวลา
          </button>
        </section>

        <section className="manageCard">
          <h2>แจ้งเตือนล่าสุด</h2>
          {recentAlerts.length === 0 ? (
            <p className="manageMuted">ไม่มีแจ้งเตือน</p>
          ) : (
            <ul className="manageList">
              {recentAlerts.map((a) => (
                <li key={a.id}>{a.alertMessage ?? "—"}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="manageCard">
          <h2>กิจกรรมล่าสุด</h2>
          {recentLogs.length === 0 ? (
            <p className="manageMuted">ไม่มีบันทึก</p>
          ) : (
            <ul className="manageList">
              {recentLogs.map((l, i) => (
                <li key={`${l.timestampMs}-${i}`}>
                  <strong>{l.timestamp ?? "—"}</strong> — {l.action ?? "—"}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
