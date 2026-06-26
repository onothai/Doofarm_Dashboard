import type { SortDir } from "../lib/tableSort";

type SortableHeaderProps<K extends string> = {
  label: string;
  sortKey: K;
  activeKey: K;
  dir: SortDir;
  onSort: (key: K) => void;
  className?: string;
};

function SortArrows({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className="sortHeaderArrows" aria-hidden="true">
      <svg
        className={`sortArrow sortArrowUp ${active && dir === "asc" ? "isActive" : ""}`}
        viewBox="0 0 10 6"
        width="10"
        height="6"
        focusable="false"
      >
        <path d="M5 0 L10 6 H0 Z" fill="currentColor" />
      </svg>
      <svg
        className={`sortArrow sortArrowDown ${active && dir === "desc" ? "isActive" : ""}`}
        viewBox="0 0 10 6"
        width="10"
        height="6"
        focusable="false"
      >
        <path d="M0 0 H10 L5 6 Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function SortableHeader<K extends string>({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: SortableHeaderProps<K>) {
  const active = activeKey === sortKey;
  const ariaSort = active ? (dir === "asc" ? "ascending" : "descending") : "none";

  return (
    <button
      type="button"
      className={`sortableHeader ${active ? "isActive" : ""} ${className ?? ""}`.trim()}
      aria-sort={ariaSort}
      onClick={() => onSort(sortKey)}
    >
      <span className="sortHeaderLabel">{label}</span>
      <SortArrows active={active} dir={dir} />
    </button>
  );
}
