export type SensorHistoryRow = {
  temperature?: number;
  humidity?: number;
  soilMoisture?: number;
  lightIntensity?: number;
  timestamp?: number | string;
};

export type SensorMetric =
  | "soilMoisture"
  | "temperature"
  | "humidity"
  | "lightIntensity";

export type RangeKey = "today" | "7d" | "30d";

export type SeriesPoint = {
  label: string;
  value: number | null;
};

export type MetricConfig = {
  key: SensorMetric;
  label: string;
  unit: string;
  color: string;
  /** true = ตรึงแกน Y ไว้ที่ 0–100 (เปอร์เซ็นต์) */
  fixed0to100: boolean;
};

export const METRICS: MetricConfig[] = [
  { key: "soilMoisture", label: "ความชื้นดิน", unit: "%", color: "#2563EB", fixed0to100: true },
  { key: "temperature", label: "อุณหภูมิ", unit: "°C", color: "#DC2626", fixed0to100: false },
  { key: "humidity", label: "ความชื้นอากาศ", unit: "%", color: "#0EA5A5", fixed0to100: true },
  { key: "lightIntensity", label: "แสง", unit: "lux", color: "#D97706", fixed0to100: false },
];

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "วันนี้",
  "7d": "7 วัน",
  "30d": "30 วัน",
};

export function metricConfig(metric: SensorMetric): MetricConfig {
  return METRICS.find((m) => m.key === metric) ?? METRICS[0];
}

/** เวลาอาจเป็น ms หรือวินาที (unix) หรือสตริงวันที่ — คืนค่าเป็น ms */
export function parseHistoryTimestampMs(rawTime?: string | number): number | null {
  const raw = String(rawTime ?? "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return raw.length <= 10 ? n * 1000 : n;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

  return null;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

type ParsedRecord = { ts: number; value: number };

function toParsedRecords(
  history: SensorHistoryRow[],
  metric: SensorMetric,
): ParsedRecord[] {
  return history
    .map((item) => ({
      ts: parseHistoryTimestampMs(item.timestamp),
      value: Number(item[metric]),
    }))
    .filter((x): x is ParsedRecord => x.ts !== null && Number.isFinite(x.value))
    .sort((a, b) => a.ts - b.ts);
}

function averageInRange(
  records: ParsedRecord[],
  start: number,
  end: number,
): number | null {
  const inRange = records.filter((r) => r.ts >= start && r.ts < end);
  if (inRange.length === 0) return null;
  return inRange.reduce((sum, r) => sum + r.value, 0) / inRange.length;
}

/**
 * แบ่งข้อมูลตามช่วงเวลาแบบเดียวกับแอปมือถือ:
 * - today  = 24 ช่องรายชั่วโมง (ค่าเฉลี่ย)
 * - 7d/30d = ช่องละ 1 วัน ย้อนหลัง (ค่าเฉลี่ย)
 * ช่องที่ไม่มีข้อมูล = null (แสดงเป็นช่องว่างในกราฟ)
 */
export function buildSensorSeries(
  history: SensorHistoryRow[],
  range: RangeKey,
  metric: SensorMetric,
): SeriesPoint[] {
  const records = toParsedRecords(history, metric);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();

  const clamp = metricConfig(metric).fixed0to100;
  const finalize = (avg: number | null): number | null => {
    if (avg === null) return null;
    const rounded = Math.round(avg * 10) / 10;
    return clamp ? Math.max(0, Math.min(100, rounded)) : rounded;
  };

  if (range === "today") {
    const out: SeriesPoint[] = [];
    for (let h = 0; h < 24; h += 1) {
      const hourStart = startOfToday + h * 60 * 60 * 1000;
      const hourEnd = hourStart + 60 * 60 * 1000;
      out.push({
        label: `${pad2(h)}:00`,
        value: finalize(averageInRange(records, hourStart, hourEnd)),
      });
    }
    return out;
  }

  const days = range === "7d" ? 7 : 30;
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = startOfToday - i * 24 * 60 * 60 * 1000;
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    const d = new Date(dayStart);
    out.push({
      label: `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`,
      value: finalize(averageInRange(records, dayStart, dayEnd)),
    });
  }
  return out;
}

export type SeriesStats = {
  min: number | null;
  max: number | null;
  avg: number | null;
  latest: number | null;
  count: number;
};

export function seriesStats(series: SeriesPoint[]): SeriesStats {
  const values = series
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0) {
    return { min: null, max: null, avg: null, latest: null, count: 0 };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const latest = values[values.length - 1];
  return {
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    avg: Math.round(avg * 10) / 10,
    latest: Math.round(latest * 10) / 10,
    count: values.length,
  };
}

/** ขอบเขตแกน Y — เปอร์เซ็นต์ตรึง 0–100, ค่าอื่นปรับตามข้อมูล */
export function computeYBounds(
  series: SeriesPoint[],
  metric: SensorMetric,
): { min: number; max: number } {
  if (metricConfig(metric).fixed0to100) return { min: 0, max: 100 };

  const values = series
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  if (values.length === 0) return { min: 0, max: 100 };

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.15;
  min = Math.floor(min - pad);
  max = Math.ceil(max + pad);
  if (min > 0 && min < max * 0.5) min = 0;
  return { min, max };
}
