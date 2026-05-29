import { useCallback, useRef, type CSSProperties } from "react";

type MoistureSliderProps = {
  value: number;
  disabled?: boolean;
  onValueChange: (value: number) => void;
  onSlidingStart?: () => void;
  onSlidingComplete: (value: number) => void;
};

export function MoistureSlider({
  value,
  disabled,
  onValueChange,
  onSlidingStart,
  onSlidingComplete,
}: MoistureSliderProps) {
  const lastValue = useRef(value);

  const clamp = (v: number) => Math.round(Math.max(0, Math.min(100, v)));

  const handleChange = (next: number) => {
    const v = clamp(next);
    lastValue.current = v;
    onValueChange(v);
  };

  const finish = useCallback(() => {
    onSlidingComplete(lastValue.current);
  }, [onSlidingComplete]);

  return (
    <div className="moistureSlider">
      <div className="moistureSliderRow">
        <div className="moistureSliderTrackWrap">
          <input
            type="range"
            className="moistureSliderInput"
            min={0}
            max={100}
            step={1}
            value={value}
            disabled={disabled}
            style={{ "--moisture-pct": `${value}%` } as CSSProperties}
            onPointerDown={() => {
              onSlidingStart?.();
            }}
            onChange={(e) => handleChange(Number(e.target.value))}
            onPointerUp={finish}
            onKeyUp={(e) => {
              if (e.key === "Enter" || e.key === " ") finish();
            }}
          />
        </div>
        <span className="moistureSliderPct">{value}%</span>
      </div>
    </div>
  );
}
