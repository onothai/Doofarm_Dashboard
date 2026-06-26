import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAdminDataContext } from "../context/AdminDataContext";
import {
  type ActivityRow,
  bucketLegend,
  parseLogTimestampMs,
} from "../lib/activityLogs";

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

function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconFarm() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconChip() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  );
}

type MetricCardProps = {
  icon: ReactNode;
  tone: "green" | "teal" | "slate";
  value: string;
  label: string;
};

function MetricCard({ icon, tone, value, label }: MetricCardProps) {
  return (
    <article className={`dashMetric dashMetric--${tone}`}>
      <div className="dashMetricHead">
        <span className="dashMetricIcon">{icon}</span>
      </div>
      <div className="dashMetricValue">{value}</div>
      <div className="dashMetricLabel">{label}</div>
    </article>
  );
}

function useLiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return now;
}

export function DashboardPage() {
  const { snapshot, loading, permHint, isAdmin } = useAdminDataContext();
  const { stats, activities } = snapshot;
  const now = useLiveClock();

  const dateLabel = now.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const timeLabel = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const logs = useMemo(() => activities as ActivityRow[], [activities]);

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

      <header className="dashHero">
        <div className="dashHeroMain">
          <p className="dashHeroDate">{dateLabel}</p>
          <time className="dashHeroClock" dateTime={now.toISOString()}>
            {timeLabel}
          </time>
        </div>
        <div className="dashHeroLive">
          <span className="dashLiveDot" aria-hidden />
          <span className="dashHeroLiveText">อัปเดตสด</span>
        </div>
      </header>

      <div className="dashMetricGrid">
        <MetricCard
          icon={<IconUsers />}
          tone="green"
          value={String(stats.totalUsers)}
          label="ผู้ใช้"
        />
        <MetricCard
          icon={<IconFarm />}
          tone="teal"
          value={String(stats.totalFarms)}
          label="แปลง"
        />
        <MetricCard
          icon={<IconChip />}
          tone="slate"
          value={`${stats.onlineBoards}/${stats.totalBoards}`}
          label="บอร์ด"
        />
      </div>

      <section className="chartPanelModern">
        <div className="chartPanelTitleRow">
          <div>
            <div className="chartPanelTitle">กิจกรรม 15 วันล่าสุด</div>
            <p className="chartPanelSub">บันทึกจากทุกแปลงในระบบ</p>
          </div>
          <div className="chartLegend chartLegendModern">
            <span className="lg lgBasic">ปั๊ม / รดน้ำ</span>
            <span className="lg lgBeginner">ตั้งเวลา / ออโต้</span>
            <span className="lg lgPro">ระบบ / แจ้งเตือน</span>
          </div>
        </div>
        <div className="chartInnerModern">
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
                          title={`ปั๊ม/รดน้ำ: ${d.basic}`}
                        />
                        <div
                          className="bar barBeginner"
                          style={{ height: `${(d.beginner / barDays.scaleMax) * 100}%` }}
                          title={`ตั้งเวลา/ออโต้: ${d.beginner}`}
                        />
                        <div
                          className="bar barPro"
                          style={{ height: `${(d.pro / barDays.scaleMax) * 100}%` }}
                          title={`ระบบ/แจ้งเตือน: ${d.pro}`}
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
