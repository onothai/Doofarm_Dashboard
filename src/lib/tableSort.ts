export type SortDir = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  dir: SortDir;
};

export type SortOption<K extends string> = {
  key: K;
  dir: SortDir;
  label: string;
};

/** thText = ก→ฮ, enText = A→Z, number, bool (false→true = น้อย→มาก) */
export type SortValueKind = "thText" | "enText" | "number" | "bool";

export const SORT_DIR_LABELS: Record<SortValueKind, { asc: string; desc: string }> = {
  thText: { asc: "ก → ฮ", desc: "ฮ → ก" },
  enText: { asc: "A → Z", desc: "Z → A" },
  number: { asc: "น้อย → มาก", desc: "มาก → น้อย" },
  bool: { asc: "น้อย → มาก", desc: "มาก → น้อย" },
};

export function defaultDirForKind(kind: SortValueKind): SortDir {
  if (kind === "number" || kind === "bool") return "desc";
  return "asc";
}

export function buildSortOptions<K extends string>(
  columns: Array<{ key: K; label: string; kind: SortValueKind }>,
): SortOption<K>[] {
  const options: SortOption<K>[] = [];
  for (const col of columns) {
    const labels = SORT_DIR_LABELS[col.kind];
    options.push({ key: col.key, dir: "asc", label: `${col.label} (${labels.asc})` });
    options.push({ key: col.key, dir: "desc", label: `${col.label} (${labels.desc})` });
  }
  return options;
}

function isEmptyNumber(v: number | null | undefined): boolean {
  return v == null || !Number.isFinite(v);
}

function localeForKind(kind: SortValueKind): string {
  return kind === "enText" ? "en" : "th";
}

export function compareText(
  a: string,
  b: string,
  dir: SortDir,
  kind: SortValueKind = "thText",
): number {
  const cmp = a.localeCompare(b, localeForKind(kind), { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

export function compareNumber(
  a: number | null | undefined,
  b: number | null | undefined,
  dir: SortDir,
): number {
  const aEmpty = isEmptyNumber(a);
  const bEmpty = isEmptyNumber(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  const cmp = (a as number) - (b as number);
  return dir === "asc" ? cmp : -cmp;
}

export function compareBool(a: boolean, b: boolean, dir: SortDir): number {
  const cmp = (a ? 1 : 0) - (b ? 1 : 0);
  return dir === "asc" ? cmp : -cmp;
}

export function sortBy<T>(
  rows: T[],
  getValue: (row: T) => string | number | boolean | null | undefined,
  dir: SortDir,
  kind: SortValueKind = "thText",
): T[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (kind === "number") {
      return compareNumber(
        typeof va === "number" ? va : null,
        typeof vb === "number" ? vb : null,
        dir,
      );
    }
    if (kind === "bool") {
      return compareBool(Boolean(va), Boolean(vb), dir);
    }
    return compareText(String(va ?? ""), String(vb ?? ""), dir, kind);
  });
  return copy;
}
