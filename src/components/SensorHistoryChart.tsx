import { useEffect, useMemo, useRef, useState } from "react";
import type { MetricConfig, SeriesPoint } from "../lib/sensorHistory";

type SensorHistoryChartProps = {
  series: SeriesPoint[];
  metric: MetricConfig;
  yMin: number;
  yMax: number;
};

const PAD_TOP = 8;
const CHART_H = 176;
const X_LABEL_H = 48;
const Y_AXIS_W = 34;
const PAD_X = 36;
const Y_TICKS = 5;
const TOTAL_H = PAD_TOP + CHART_H + X_LABEL_H;

function niceLabel(value: number): string {
  if (Math.abs(value) >= 1000) return `${Math.round(value / 100) / 10}k`;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** ก้าวต่อจุด (px) — กว้างพอให้ label ครบและเลื่อนแนวนอนได้เหมือนแอป */
function minStepForCount(count: number): number {
  if (count <= 8) return 64;
  if (count <= 24) return 54;
  return 46;
}

export function SensorHistoryChart({ series, metric, yMin, yMax }: SensorHistoryChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [availWidth, setAvailWidth] = useState(600);
  const dragRef = useRef<{ active: boolean; startX: number; startScroll: number; moved: boolean }>({
    active: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setAvailWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el || e.pointerType === "touch") return; // มือถือใช้การปัดนิ้วปกติ
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    const d = dragRef.current;
    if (!el || !d.active) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 3) d.moved = true;
    el.scrollLeft = d.startScroll - dx;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    setDragging(false);
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth <= el.clientWidth) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
    }
  };

  const hasData = series.some((p) => p.value !== null);
  const slots = Math.max(1, series.length - 1);

  const canvasWidth = useMemo(() => {
    const minWidth = slots * minStepForCount(series.length) + PAD_X * 2;
    return Math.max(availWidth, minWidth);
  }, [availWidth, slots, series.length]);

  const xFor = (idx: number) =>
    series.length <= 1
      ? canvasWidth / 2
      : PAD_X + (idx / slots) * (canvasWidth - PAD_X * 2);

  const yFor = (value: number) => {
    const ratio = (value - yMin) / (yMax - yMin || 1);
    return PAD_TOP + CHART_H - ratio * CHART_H;
  };

  const points = useMemo(
    () =>
      series
        .map((p, idx) => ({ idx, value: p.value }))
        .filter((p): p is { idx: number; value: number } => p.value !== null)
        .map((p) => ({ ...p, x: xFor(p.idx), y: yFor(p.value) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, yMin, yMax, canvasWidth],
  );

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let i = Y_TICKS; i >= 0; i -= 1) {
      ticks.push(yMin + ((yMax - yMin) * i) / Y_TICKS);
    }
    return ticks;
  }, [yMin, yMax]);

  const linePath = useMemo(() => {
    if (points.length === 0) return "";
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  }, [points]);

  const stepPx = (canvasWidth - PAD_X * 2) / slots;
  const labelEveryN = Math.max(1, Math.ceil(40 / stepPx));

  return (
    <div className="sensorChartWrap">
      <div className="sensorChartRow">
        <svg
          className="sensorChartYAxis"
          width={Y_AXIS_W}
          height={TOTAL_H}
          viewBox={`0 0 ${Y_AXIS_W} ${TOTAL_H}`}
          aria-hidden
        >
          {yTicks.map((t, i) => (
            <text
              key={i}
              x={Y_AXIS_W - 6}
              y={yFor(t) + 4}
              className="sensorChartYLabel"
              textAnchor="end"
            >
              {niceLabel(t)}
            </text>
          ))}
        </svg>

        <div
          className={`sensorChartScroll ${dragging ? "isDragging" : ""}`}
          ref={scrollRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
        >
          <svg
            className="sensorChartSvg"
            width={canvasWidth}
            height={TOTAL_H}
            viewBox={`0 0 ${canvasWidth} ${TOTAL_H}`}
            role="img"
            aria-label={`กราฟ${metric.label}`}
          >
            {yTicks.map((t, i) => {
              const y = yFor(t);
              return (
                <line
                  key={i}
                  x1={0}
                  y1={y}
                  x2={canvasWidth}
                  y2={y}
                  className="sensorChartGrid"
                />
              );
            })}

            {hasData ? (
              <>
                {linePath ? (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={metric.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ) : null}
                {points.map((p) => (
                  <circle key={p.idx} cx={p.x} cy={p.y} r={3} fill={metric.color}>
                    <title>{`${series[p.idx].label} · ${p.value}${metric.unit}`}</title>
                  </circle>
                ))}
              </>
            ) : null}

            {series.map((p, idx) =>
              idx % labelEveryN === 0 || idx === series.length - 1 ? (
                <text
                  key={idx}
                  x={xFor(idx)}
                  y={PAD_TOP + CHART_H + 16}
                  className="sensorChartXLabel"
                  textAnchor="end"
                  transform={`rotate(-38 ${xFor(idx)} ${PAD_TOP + CHART_H + 16})`}
                >
                  {p.label}
                </text>
              ) : null,
            )}
          </svg>
        </div>
      </div>

      {!hasData ? (
        <div className="sensorChartEmpty">ยังไม่มีข้อมูลในช่วงเวลานี้</div>
      ) : null}
    </div>
  );
}
