type ToggleSwitchProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  id?: string;
};

export function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: ToggleSwitchProps) {
  const inputId = id ?? label;
  return (
    <label className={`toggleSwitch ${disabled ? "disabled" : ""}`} htmlFor={inputId}>
      <span className="toggleLabel">{label}</span>
      <span className="toggleTrack">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggleKnob" aria-hidden />
      </span>
    </label>
  );
}
