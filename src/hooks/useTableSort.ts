import { useCallback, useMemo, useState } from "react";
import {
  defaultDirForKind,
  sortBy,
  type SortDir,
  type SortState,
  type SortValueKind,
} from "../lib/tableSort";

export function useTableSort<T, K extends string>(
  rows: T[],
  config: {
    defaultKey: K;
    defaultDir?: SortDir;
    defaultDirByKey?: Partial<Record<K, SortDir>>;
    getValue: (row: T, key: K) => string | number | boolean | null | undefined;
    kindByKey: Record<K, SortValueKind>;
  },
) {
  const defaultDir =
    config.defaultDir ?? defaultDirForKind(config.kindByKey[config.defaultKey]);

  const [sort, setSort] = useState<SortState<K>>({
    key: config.defaultKey,
    dir: defaultDir,
  });

  const toggleSort = useCallback(
    (key: K) => {
      setSort((prev) => {
        if (prev.key === key) {
          return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
        }
        const nextDir =
          config.defaultDirByKey?.[key] ?? defaultDirForKind(config.kindByKey[key]);
        return { key, dir: nextDir };
      });
    },
    [config.defaultDirByKey, config.kindByKey],
  );

  const setSortDirect = useCallback((key: K, dir: SortDir) => {
    setSort({ key, dir });
  }, []);

  const sortedRows = useMemo(() => {
    const kind = config.kindByKey[sort.key];
    return sortBy(rows, (row) => config.getValue(row, sort.key), sort.dir, kind);
  }, [rows, sort, config]);

  return { sort, toggleSort, setSortDirect, sortedRows };
}

export function applyTableSort<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  config: {
    getValue: (row: T, key: K) => string | number | boolean | null | undefined;
    kindByKey: Record<K, SortValueKind>;
  },
): T[] {
  const kind = config.kindByKey[sort.key];
  return sortBy(rows, (row) => config.getValue(row, sort.key), sort.dir, kind);
}
