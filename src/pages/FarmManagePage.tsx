import { onValue, ref } from "firebase/database";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ToggleSwitch } from "../components/ToggleSwitch";
import { MoistureSlider } from "../components/MoistureSlider";
import { useAdminDataContext } from "../context/AdminDataContext";
import { database } from "../firebase";
import {
  deleteBoard,
  logAdminActivity,
  requestReboot,
  setFarmName,
  setMoistureThreshold,
  setPumpControl,
  setSchedule,
} from "../lib/farmControl";
import { readPumpUiState, type PumpUiState } from "../lib/pumpState";
import type { FarmAlertRow, PlanNode } from "../lib/rtdb-types";

function fmtNum(v: number | undefined | null, suffix = ""): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return `${v.toFixed(v % 1 === 0 ? 0 : 1)}${suffix}`;
}

function pumpStatesMatch(a: PumpUiState, b: PumpUiState): boolean {
  return a.autoMode === b.autoMode && a.pumpOn === b.pumpOn;
}

export function FarmManagePage() {
  const navigate = useNavigate();
  const { ownerUid = "", planId = "" } = useParams();
  const { snapshot } = useAdminDataContext();

  const farmMeta = useMemo(
    () => snapshot.farms.find((f) => f.uid === ownerUid && f.planId === planId),
    [snapshot.farms, ownerUid, planId],
  );

  const [plan, setPlan] = useState<PlanNode | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [optimisticPump, setOptimisticPump] = useState<PumpUiState | null>(null);
  const [farmName, setFarmNameLocal] = useState("");
  const [moisture, setMoisture] = useState(30);
  const [scheduleOn, setScheduleOn] = useState("06:00");
  const [scheduleOff, setScheduleOff] = useState("06:30");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const settingsDirtyRef = useRef(false);
  const moistureDraggingRef = useRef(false);

  useEffect(() => {
    if (!database || !ownerUid || !planId) return;
    const pRef = ref(database, `Doofarm/${ownerUid}/${planId}`);
    const unsub = onValue(pRef, (snap) => {
      const val = snap.exists() ? (snap.val() as PlanNode) : null;
      setPlan(val);
      if (!settingsDirtyRef.current && !moistureDraggingRef.current) {
        if (val?.Settings?.setValueMoisture != null) {
          setMoisture(val.Settings.setValueMoisture);
        }
        if (val?.Settings?.scheduleOnTime) setScheduleOn(val.Settings.scheduleOnTime);
        if (val?.Settings?.scheduleOffTime) setScheduleOff(val.Settings.scheduleOffTime);
        if (typeof val?.Settings?.scheduleEnabled === "boolean") {
          setScheduleEnabled(val.Settings.scheduleEnabled);
        }
      }
    });
    return () => unsub();
  }, [ownerUid, planId]);

  useEffect(() => {
    if (farmMeta?.farmName) setFarmNameLocal(farmMeta.farmName);
  }, [farmMeta?.farmName]);

  const rtdbPump = useMemo(() => readPumpUiState(plan), [plan]);
  const { autoMode, pumpOn } = optimisticPump ?? rtdbPump;

  useEffect(() => {
    if (!optimisticPump) return;
    if (pumpStatesMatch(readPumpUiState(plan), optimisticPump)) {
      setOptimisticPump(null);
    }
  }, [plan, optimisticPump]);

  const sensor = plan?.SensorRealtime;

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

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await fn();
    } catch (err) {
      console.error("[FarmManage]", err);
      setErrorMsg("ดำเนินการไม่สำเร็จ — ตรวจสอบ Firebase Rules และ AdminUsers/{uid}");
    } finally {
      setBusy(false);
    }
  };

  const applyPump = useCallback(
    async (next: PumpUiState) => {
      if (busy) return;
      if (pumpStatesMatch(next, rtdbPump) && !optimisticPump) return;

      setOptimisticPump(next);
      setBusy(true);
      setErrorMsg(null);
      try {
        await setPumpControl(ownerUid, planId, next);
      } catch (err) {
        console.error("[FarmManage] pump", err);
        setOptimisticPump(null);
        setErrorMsg("สั่งปั๊มไม่สำเร็จ — ตรวจสอบสิทธิ์แอดมินใน Firebase");
      } finally {
        setBusy(false);
      }
    },
    [busy, optimisticPump, ownerUid, planId, rtdbPump],
  );

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

      {errorMsg ? (
        <div className="farmManageToast adminBanner adminBannerErr" role="alert">
          {errorMsg}
        </div>
      ) : null}

      <div className="farmManageGrid">
        <section className="manageCard manageCardSensors">
          <h2>เซนเซอร์ Realtime</h2>
          <div className="sensorGrid">
            <div><span>อุณหภูมิ</span><strong>{fmtNum(sensor?.temperature, " °C")}</strong></div>
            <div><span>ความชื้นอากาศ</span><strong>{fmtNum(sensor?.humidity, " %")}</strong></div>
            <div><span>ความชื้นดิน</span><strong>{fmtNum(sensor?.soilMoisture, " %")}</strong></div>
            <div><span>แสง</span><strong>{fmtNum(sensor?.lightIntensity, " lux")}</strong></div>
          </div>
        </section>

        <section className="manageCard manageCardPump">
          <h2>ควบคุมปั๊ม (เหมือนในแอป)</h2>
          <p className="manageHint">
            แอดมินสั่งงานแทนลูกค้า — บันทึกลง ActivityLogs อัตโนมัติ
          </p>

          <div className="controlToggles">
            <ToggleSwitch
              id="auto-mode"
              label="โหมดอัตโนมัติ"
              checked={autoMode}
              disabled={busy}
              onChange={(checked) => {
                void applyPump({ autoMode: checked, pumpOn: checked ? pumpOn : pumpOn });
              }}
            />
            <div className={`controlToggleSlot ${autoMode ? "isInactive" : ""}`}>
              <ToggleSwitch
                id="manual-pump"
                label="เปิดปั๊ม (มือ)"
                checked={pumpOn}
                disabled={busy || autoMode}
                onChange={(checked) => {
                  void applyPump({ autoMode: false, pumpOn: checked });
                }}
              />
            </div>
          </div>

          <button
            type="button"
            className="btnBlack manageFullBtn manageRebootBtn"
            disabled={busy}
            onClick={() => {
              if (!window.confirm("ยืนยันรีบูตบอร์ด?")) return;
              void run(() => requestReboot(ownerUid, planId));
            }}
          >
            {busy ? "กำลังดำเนินการ…" : "รีบูตบอร์ด"}
          </button>

          <button
            type="button"
            className="btnDanger manageFullBtn"
            disabled={busy || !farmMeta?.deviceId}
            onClick={() => {
              if (!farmMeta?.deviceId) return;
              const deviceId = farmMeta.deviceId;
              const ok = window.confirm(
                `ยืนยันลบบอร์ด ${deviceId}?\n\nบอร์ดจะถูกปลดจากบัญชีลูกค้าและกลับสู่โหมดจับคู่ใหม่`,
              );
              if (!ok) return;
              setBusy(true);
              setErrorMsg(null);
              void deleteBoard(ownerUid, deviceId, planId)
                .then(() => navigate("/farms", { replace: true }))
                .catch((err) => {
                  console.error("[FarmManage] delete board", err);
                  setErrorMsg("ลบบอร์ดไม่สำเร็จ — ตรวจสอบ Firebase Rules");
                })
                .finally(() => setBusy(false));
            }}
          >
            ลบบอร์ด
          </button>
        </section>

        <section className="manageCard manageSettingsCard">
          <h2>ตั้งค่าแปลง</h2>

          <div className="manageGroup">
            <label className="manageField manageFieldTight">
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
                void run(async () => {
                  if (!farmMeta?.deviceId) return;
                  await setFarmName(ownerUid, farmMeta.deviceId, farmName);
                  await logAdminActivity(ownerUid, planId, `เปลี่ยนชื่อแปลงเป็น "${farmName}"`);
                })
              }
            >
              บันทึกชื่อแปลง
            </button>
          </div>

          <div className="manageGroup">
            <div className="manageField manageFieldTight moistureField">
              <span>ความชื้นดินเป้าหมาย</span>
              <MoistureSlider
                value={moisture}
                disabled={busy}
                onSlidingStart={() => {
                  moistureDraggingRef.current = true;
                }}
                onValueChange={setMoisture}
                onSlidingComplete={(val) => {
                  moistureDraggingRef.current = false;
                  void run(async () => {
                    await setMoistureThreshold(ownerUid, planId, val);
                  });
                }}
              />
            </div>
          </div>

          <div className="manageGroup manageScheduleGroup">
            <ToggleSwitch
              id="schedule-enabled"
              label="เปิดตั้งเวลารดน้ำ"
              checked={scheduleEnabled}
              disabled={busy}
              onChange={(checked) => {
                settingsDirtyRef.current = true;
                setScheduleEnabled(checked);
              }}
            />
            <div className="scheduleRow">
              <label className="manageField manageFieldTight">
                เปิด
                <input
                  className="loginInput"
                  type="time"
                  value={scheduleOn}
                  onChange={(e) => {
                    settingsDirtyRef.current = true;
                    setScheduleOn(e.target.value);
                  }}
                />
              </label>
              <label className="manageField manageFieldTight">
                ปิด
                <input
                  className="loginInput"
                  type="time"
                  value={scheduleOff}
                  onChange={(e) => {
                    settingsDirtyRef.current = true;
                    setScheduleOff(e.target.value);
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              className="btnTeal manageFullBtn"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await setSchedule(ownerUid, planId, {
                    enabled: scheduleEnabled,
                    onTime: scheduleOn,
                    offTime: scheduleOff,
                  });
                  settingsDirtyRef.current = false;
                })
              }
            >
              บันทึกตั้งเวลา
            </button>
          </div>
        </section>

        <div className="farmManageSideCol">
          <section className="manageCard manageCardAlerts">
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

          <section className="manageCard manageCardLogs">
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
    </div>
  );
}
