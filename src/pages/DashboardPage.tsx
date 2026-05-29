import { useMemo } from "react";
import { useAdminDataContext } from "../context/AdminDataContext";
import {
  type ActivityRow,
  bucketLegend,
  computeWateringToday,
  parseLogTimestampMs,
} from "../lib/activityLogs";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function Donut({
  centerText,
  caption,
  fraction,
}: {
  centerText: string;
  caption: string;
  fraction: number;
}) {
  const f = clamp(fraction, 0, 1);
  const pct = Math.round(f * 1000) / 10;
  return (
    <div className="donutCard">
      <div className="donutRingWrap">
        <div
          className="donutRing"
          style={{ background: `conic-gradient(#111111 ${pct}%, #ffffff 0)` }}
        >
          <div className="donutHole">
            <div className="donutCenterText">{centerText}</div>
          </div>
        </div>
      </div>
      <div className="donutCaption">{caption}</div>
    </div>
  );
}

function buildYTicks(maxCount: number): number[] {
  if (!Number.isFinite(maxCount) || maxCount <= 0) return [5, 4, 3, 2, 1, 0];
  const ceiling = Math.max(5, Math.ceil(maxCount / 5) * 5);
  const step = Math.max(1, Math.ceil(ceiling / 5));
  const top = Math.ceil(maxCount / step) * step;
  const ticks: number[] = [];
  for (let v = top; v >= 0; v -= step) ticks.push(v);
  if (ticks[ticks.length - 1] !== 0) ticks.push(0);
  return ticks;
}

export function DashboardPage() {
  const { snapshot, loading, scope, permHint, isAdmin } = useAdminDataContext();
  const { stats, activities, farms } = snapshot;

  const logs = useMemo(
    () => activities as ActivityRow[],
    [activities],
  );

  const watering = useMemo(() => computeWateringToday(logs), [logs]);

  const boardDonut = useMemo(() => {
    const total = stats.totalBoards;
    const active = stats.onlineBoards;
    if (total <= 0) {
      return {
        text: "0 / 0",
        frac: 0,
        caption: "บอร์ดออนไลน์ / บอร์ดที่ผูกแล้ว (DeviceRegistry)",
      };
    }
    return {
      text: `${active} / ${total}`,
      frac: clamp(active / total, 0, 1),
      caption: "บอร์ดออนไลน์ / บอร์ดที่ผูกแล้วทั้งระบบ",
    };
  }, [stats.onlineBoards, stats.totalBoards]);

  const userDonut = useMemo(() => {
    const total = stats.totalUsers;
    const active = stats.usersWithDevices;
    if (total <= 0) {
      return { text: "0 / 0", frac: 0, caption: "ผู้ใช้ที่มีแปลง / ผู้ใช้ทั้งหมด" };
    }
    return {
      text: `${active} / ${total}`,
      frac: clamp(active / total, 0, 1),
      caption: "ผู้ใช้ที่มีแปลง / ผู้ใช้ทั้งหมด",
    };
  }, [stats.totalUsers, stats.usersWithDevices]);

  const barDays = useMemo(() => {
    const days = 15;
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    ).getTime();

    const buckets = Array.from({ length: days }, (_, i) => {
      const dayStart = start - (days - 1 - i) * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayNum = new Date(dayStart).getDate();
      return {
        label: String(dayNum),
        basic: 0,
        beginner: 0,
        pro: 0,
        dayStart,
        dayEnd,
      };
    });

    for (const log of logs) {
      const ms = parseLogTimestampMs(log);
      if (ms == null) continue;
      const b = bucketLegend(String(log.action ?? ""));
      for (const d of buckets) {
        if (ms >= d.dayStart && ms < d.dayEnd) {
          if (b === "basic") d.basic += 1;
          else if (b === "beginner") d.beginner += 1;
          else d.pro += 1;
          break;
        }
      }
    }

    const peak = Math.max(0, ...buckets.flatMap((d) => [d.basic, d.beginner, d.pro]));
    const scaleMax = Math.max(1, peak);
    return { buckets, scaleMax };
  }, [logs]);

  const yTicks = useMemo(() => buildYTicks(barDays.scaleMax), [barDays.scaleMax]);

  const onlineFarms = useMemo(
    () => farms.filter((f) => f.online).length,
    [farms],
  );

  if (loading) {
    return (
      <div className="adminPage dashboardPage">
        <div className="adminBanner">กำลังโหลดข้อมูลจาก Realtime Database…</div>
      </div>
    );
  }

  return (
    <div className="adminPage dashboardPage">
      {permHint && !isAdmin ? <div className="adminBanner">{permHint}</div> : null}
      {scope === "all" && isAdmin ? (
        <div className="adminBanner adminBannerOk">
          โหมดแอดมิน — ข้อมูล realtime จาก Doofarm ทั้งระบบ ({stats.totalUsers} ผู้ใช้,{" "}
          {stats.totalFarms} แปลง)
        </div>
      ) : null}

      <div className="statGrid">
        <div className="statCard">
          <div className="statBig">{stats.totalUsers}</div>
          <div className="statSmall">ผู้ใช้ทั้งหมด (Doofarm/*/Profile)</div>
        </div>
        <div className="statCard">
          <div className="statBig">{stats.totalFarms}</div>
          <div className="statSmall">แปลง/ฟาร์มที่ผูกอุปกรณ์</div>
        </div>
        <div className="statCard">
          <div className="statBig">{stats.totalAlerts}</div>
          <div className="statSmall">การแจ้งเตือนทั้งระบบ (Alerts)</div>
        </div>
        <Donut centerText={boardDonut.text} caption={boardDonut.caption} fraction={boardDonut.frac} />
      </div>

      <div className="statGrid statGridSecond">
        <div className="statCard">
          <div className="statBig">{watering.starts}</div>
          <div className="statSmall">ครั้งรดน้ำวันนี้ (รวมทุกแปลง)</div>
        </div>
        <div className="statCard">
          <div className="statBig">{onlineFarms}</div>
          <div className="statSmall">แปลงที่บอร์ดออนไลน์ตอนนี้</div>
        </div>
        <Donut centerText={userDonut.text} caption={userDonut.caption} fraction={userDonut.frac} />
      </div>

      <div className="dashMiniMetrics">
        <div className="miniMetric">
          <div className="miniMetricK">ระยะเวลารดน้ำรวมวันนี้ (นาที)</div>
          <div className="miniMetricV">{watering.minutesTotal}</div>
        </div>
        <div className="miniMetric">
          <div className="miniMetricK">บอร์ดออนไลน์ / ผูกแล้ว</div>
          <div className="miniMetricV">
            {stats.onlineBoards} / {stats.totalBoards}
          </div>
        </div>
        <div className="miniMetric">
          <div className="miniMetricK">กิจกรรมล่าสุดในระบบ</div>
          <div className="miniMetricV">{activities.length}</div>
        </div>
      </div>

      <section className="chartPanel">
        <div className="chartPanelTitle">
          กิจกรรมจาก ActivityLogs ทั้งระบบ — 15 วันล่าสุด
        </div>
        <div className="chartInner">
          <div className="chartInnerHead">
            <div className="chartInnerTitle">จำนวนเหตุการณ์ตามกลุ่มคีย์เวิร์ด</div>
            <div className="chartLegend">
              <span className="lg lgBasic">กลุ่ม A (ปั๊ม/รดน้ำ)</span>
              <span className="lg lgBeginner">กลุ่ม B (ตั้งเวลา/ออโต้)</span>
              <span className="lg lgPro">กลุ่ม C (ระบบ/แจ้งเตือน)</span>
            </div>
          </div>

          <div className="chartScroll">
          <div className="barChart">
            <div className="barYAxis">
              {yTicks.map((t) => (
                <div key={t} className="barYTick">
                  {t}
                </div>
              ))}
            </div>
            <div className="barPlot">
              <div className="barGrid">
                {Array.from({ length: Math.max(0, yTicks.length - 1) }, (_, i) => (
                  <div key={i} className="barGridLine" />
                ))}
              </div>
              <div className="barCols">
                {barDays.buckets.map((d) => (
                  <div key={`${d.dayStart}`} className="barCol">
                    <div className="barTriplet">
                      <div
                        className="bar barBasic"
                        style={{ height: `${(d.basic / barDays.scaleMax) * 100}%` }}
                        title={`กลุ่ม A: ${d.basic}`}
                      />
                      <div
                        className="bar barBeginner"
                        style={{ height: `${(d.beginner / barDays.scaleMax) * 100}%` }}
                        title={`กลุ่ม B: ${d.beginner}`}
                      />
                      <div
                        className="bar barPro"
                        style={{ height: `${(d.pro / barDays.scaleMax) * 100}%` }}
                        title={`กลุ่ม C: ${d.pro}`}
                      />
                    </div>
                    <div className="barDay">{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>
    </div>
  );
}
