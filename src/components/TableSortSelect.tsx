import type { SortDir, SortOption } from "../lib/tableSort";

type TableSortSelectProps<K extends string> = {
  options: SortOption<K>[];
  activeKey: K;
  dir: SortDir;
  onChange: (key: K, dir: SortDir) => void;
};

export function TableSortSelect<K extends string>({
  options,
  activeKey,
  dir,
  onChange,
}: TableSortSelectProps<K>) {
  const value = `${activeKey}:${dir}`;

  return (
    <label className="tableSortSelectWrap">
      <span className="tableSortSelectLabel">Sort</span>
      <select
        className="tableSortSelect"
        aria-label="เรียงข้อมูล"
        value={value}
        onChange={(e) => {
          const [key, selectedDir] = e.target.value.split(":") as [K, SortDir];
          onChange(key, selectedDir);
        }}
      >
        {options.map((opt) => (
          <option key={`${opt.key}:${opt.dir}`} value={`${opt.key}:${opt.dir}`}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
