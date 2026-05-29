import type { AdminSnapshot, RegistryRow } from "./rtdb-types";

export type SearchResultKind = "user" | "farm" | "device";

export type SearchResult = {
  id: string;
  kind: SearchResultKind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

export function buildGlobalSearchIndex(
  snapshot: AdminSnapshot,
  registry: Record<string, RegistryRow>,
): SearchResult[] {
  const items: SearchResult[] = [];
  const emailByUid = new Map(snapshot.users.map((u) => [u.uid, u.email]));

  for (const u of snapshot.users) {
    items.push({
      id: `user-${u.uid}`,
      kind: "user",
      title: u.name !== "—" ? u.name : u.email,
      subtitle: `${u.email} · ${u.deviceCount} แปลง`,
      href: `/users?uid=${encodeURIComponent(u.uid)}`,
      keywords: norm(`${u.uid} ${u.name} ${u.email} ${u.phone} user ผู้ใช้`),
    });
  }

  for (const f of snapshot.farms) {
    items.push({
      id: `farm-${f.uid}-${f.planId}`,
      kind: "farm",
      title: f.farmName,
      subtitle: `${f.ownerName} · ${f.deviceId}`,
      href: `/farms/manage/${encodeURIComponent(f.uid)}/${encodeURIComponent(f.planId)}`,
      keywords: norm(
        `${f.farmName} ${f.ownerName} ${f.ownerEmail} ${f.deviceId} ${f.planId} ${f.uid} farm แปลง ฟาร์ม`,
      ),
    });
  }

  for (const [deviceId, row] of Object.entries(registry)) {
    const ownerEmail = row.owner ? (emailByUid.get(row.owner) ?? "—") : "—";
    items.push({
      id: `device-${deviceId}`,
      kind: "device",
      title: deviceId,
      subtitle: row.owner ? `${ownerEmail} · ${row.bound ? "ผูกแล้ว" : "ว่าง"}` : "ยังไม่ผูก",
      href: `/devices?q=${encodeURIComponent(deviceId)}`,
      keywords: norm(
        `${deviceId} ${row.owner ?? ""} ${ownerEmail} ${row.planId ?? ""} device บอร์ด`,
      ),
    });
  }

  return items;
}

export function searchGlobal(items: SearchResult[], query: string, limit = 12): SearchResult[] {
  const q = norm(query);
  if (!q) return [];
  return items
    .filter(
      (item) =>
        item.keywords.includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q),
    )
    .slice(0, limit);
}

export const searchKindLabel: Record<SearchResultKind, string> = {
  user: "ผู้ใช้",
  farm: "แปลง",
  device: "บอร์ด",
};
