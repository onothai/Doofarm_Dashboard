export type ActivityRow = {
  action?: string;
  timestamp?: string;
  timestampMs?: number;
  actorEmail?: string;
  source?: string;
};

export function parseLogTimestampMs(log: ActivityRow): number | null {
  if (typeof log.timestampMs === "number" && Number.isFinite(log.timestampMs)) {
    return log.timestampMs;
  }

  const raw = String(log.timestamp ?? "").trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.getTime();

  const normalized = raw.replace(",", " ").replace(/\s+/g, " ").trim();
  const dmyMatch = normalized.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (!dmyMatch) return null;

  const day = Number(dmyMatch[1]);
  const month = Number(dmyMatch[2]);
  let year = Number(dmyMatch[3]);
  const hour = Number(dmyMatch[4] ?? 0);
  const minute = Number(dmyMatch[5] ?? 0);
  const second = Number(dmyMatch[6] ?? 0);

  if (year > 2400) year -= 543;
  if (year < 100) year += 2000;

  const date = new Date(year, month - 1, day, hour, minute, second, 0);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function computeWateringToday(logs: ActivityRow[]): { starts: number; minutesTotal: number } {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
  const startOfTomorrow = startOfToday + 24 * 60 * 60 * 1000;

  const isWateringStartAction = (action: string) =>
    /เปิดปั๊ม|สั่งเปิดปั๊ม|เริ่มรดน้ำ|เปิดระบบรดน้ำอัตโนมัติ/.test(action);
  const isWateringStopAction = (action: string) =>
    /ปิดปั๊ม|สั่งปิดปั๊ม|หยุดรดน้ำ|บังคับปิดปั๊ม|ปิดระบบอัตโนมัติ/.test(action);

  const logsToday = logs
    .map((l) => {
      const ts = parseLogTimestampMs(l);
      return { ...l, _ts: ts };
    })
    .filter((l) => l._ts !== null && l._ts >= startOfToday && l._ts < startOfTomorrow)
    .sort((a, b) => Number(a._ts) - Number(b._ts));

  const starts = logsToday.filter((l) => isWateringStartAction(String(l.action || ""))).length;

  let wateringStartTs: number | null = null;
  let totalWateringMs = 0;
  for (const log of logsToday) {
    const action = String(log.action || "");
    const ts = Number(log._ts);
    if (isWateringStartAction(action)) {
      if (wateringStartTs === null) wateringStartTs = ts;
    } else if (isWateringStopAction(action)) {
      if (wateringStartTs !== null && ts >= wateringStartTs) {
        totalWateringMs += ts - wateringStartTs;
        wateringStartTs = null;
      }
    }
  }
  if (wateringStartTs !== null) {
    totalWateringMs += now.getTime() - wateringStartTs;
  }

  return {
    starts,
    minutesTotal: Math.max(0, Math.round(totalWateringMs / 60000)),
  };
}

export function bucketLegend(actionRaw: string): "basic" | "beginner" | "pro" {
  const a = actionRaw.toLowerCase();

  const pumpLike = /ปั๊ม|รดน้ำ|pump|water/.test(actionRaw);
  const scheduleLike = /ตั้งเวลา|schedule|อัตโนมัติ|auto/.test(actionRaw);
  const infraLike = /firebase|database|wifi|เชื่อมต่อ|error|แจ้งเตือน|alert|hardware/.test(a);

  if (infraLike) return "pro";
  if (scheduleLike) return "beginner";
  if (pumpLike) return "basic";
  return "beginner";
}
