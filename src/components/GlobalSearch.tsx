import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminDataContext } from "../context/AdminDataContext";
import {
  buildGlobalSearchIndex,
  searchGlobal,
  searchKindLabel,
  type SearchResult,
} from "../lib/globalSearch";

type GlobalSearchProps = {
  query: string;
  onQueryChange: (value: string) => void;
};

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4.2-4.2" />
    </svg>
  );
}

export function GlobalSearch({ query, onQueryChange }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { snapshot, registry } = useAdminDataContext();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const index = useMemo(
    () => buildGlobalSearchIndex(snapshot, registry),
    [snapshot, registry],
  );
  const results = useMemo(() => searchGlobal(index, query), [index, query]);

  useEffect(() => {
    setActiveIdx(0);
    setOpen(query.trim().length > 0);
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (item: SearchResult) => {
    onQueryChange(item.title);
    setOpen(false);
    navigate(item.href);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      pick(results[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="globalSearchWrap" ref={wrapRef}>
      <div className="globalSearchField">
        <span className="globalSearchIcon" aria-hidden>
          <IconSearch />
        </span>
        <input
          className="adminSearchInput"
          placeholder="ค้นหาชื่อผู้ใช้ แปลง บอร์ด... พิมพ์แล้วเห็นผลทันที"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="ค้นหาทั้งระบบ"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
        />
      </div>
      {open ? (
        <div className="globalSearchDropdown" role="listbox">
          {results.length === 0 ? (
            <div className="globalSearchEmpty">ไม่พบผลลัพธ์ — ลองค้นหาด้วยชื่อ อีเมล หรือรหัสบอร์ด</div>
          ) : (
            results.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={idx === activeIdx}
                className={`globalSearchItem ${idx === activeIdx ? "active" : ""}`}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => pick(item)}
              >
                <span className={`searchKind searchKind-${item.kind}`}>
                  {searchKindLabel[item.kind]}
                </span>
                <span className="globalSearchText">
                  <strong>{item.title}</strong>
                  <span>{item.subtitle}</span>
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
