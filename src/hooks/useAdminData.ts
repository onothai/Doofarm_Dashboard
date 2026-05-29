import { onAuthStateChanged } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import { auth, database } from "../firebase";
import { isAllowedAdmin } from "../adminAccess";
import { aggregateDoofarm } from "../lib/doofarmAggregate";
import type { AdminSnapshot, RegistryRow } from "../lib/rtdb-types";

export type AdminDataState = {
  uid: string | null;
  isAdmin: boolean;
  adminChecked: boolean;
  doofarmRaw: Record<string, unknown> | null;
  registry: Record<string, RegistryRow>;
  snapshot: AdminSnapshot;
  loading: boolean;
  scope: "all" | "self";
  permHint: string | null;
};

export function useAdminData(): AdminDataState {
  const [uid, setUid] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminChecked, setAdminChecked] = useState(false);
  const [doofarmRaw, setDoofarmRaw] = useState<Record<string, unknown> | null>(null);
  const [registry, setRegistry] = useState<Record<string, RegistryRow>>({});
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"all" | "self">("self");
  const [permHint, setPermHint] = useState<string | null>(null);

  useEffect(() => {
    if (!database || !auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!database || !uid) {
      setIsAdmin(false);
      setAdminChecked(!uid);
      return;
    }

    if (isAllowedAdmin(uid)) {
      setIsAdmin(true);
      setAdminChecked(true);
      return;
    }

    const adminRef = ref(database, `AdminUsers/${uid}`);
    const unsub = onValue(
      adminRef,
      (snap) => {
        setIsAdmin(snap.val() === true);
        setAdminChecked(true);
      },
      () => {
        setIsAdmin(false);
        setAdminChecked(true);
      },
    );
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    const regRef = ref(database, "DeviceRegistry");
    const unsubReg = onValue(
      regRef,
      (snap) => {
        setRegistry(
          snap.exists() ? (snap.val() as Record<string, RegistryRow>) : {},
        );
      },
      () => setRegistry({}),
    );

    return () => unsubReg();
  }, []);

  useEffect(() => {
    if (!database || !uid || !adminChecked) return;

    setLoading(true);
    setPermHint(null);

    const allRef = ref(database, "Doofarm");
    const selfRef = ref(database, `Doofarm/${uid}`);

    let unsubDoofarm: (() => void) | undefined;

    const listenSelf = (hint: string | null) => {
      unsubDoofarm = onValue(
        selfRef,
        (snap) => {
          const selfData = snap.exists()
            ? (snap.val() as Record<string, unknown>)
            : {};
          setDoofarmRaw({ [uid]: selfData });
          setScope("self");
          setPermHint(hint);
          setLoading(false);
        },
        () => {
          setDoofarmRaw(null);
          setPermHint("ไม่มีสิทธิ์อ่านข้อมูล Doofarm");
          setLoading(false);
        },
      );
    };

    if (isAdmin) {
      unsubDoofarm = onValue(
        allRef,
        (snap) => {
          setDoofarmRaw(
            snap.exists() ? (snap.val() as Record<string, unknown>) : {},
          );
          setScope("all");
          setPermHint(null);
          setLoading(false);
        },
        () => {
          unsubDoofarm?.();
          listenSelf(
            "แอดมินถูกตั้งค่าแล้ว แต่ยังอ่าน Doofarm ทั้งหมดไม่ได้ — อัปโหลด database.rules.json ของ Dashboard ไปที่ Firebase Console",
          );
        },
      );
    } else {
      listenSelf(
        "บัญชีนี้ยังไม่ใช่แอดมิน — แสดงเฉพาะข้อมูลของคุณ ตั้งค่า AdminUsers/{uid}=true ใน Firebase Console",
      );
    }

    return () => unsubDoofarm?.();
  }, [uid, isAdmin, adminChecked]);

  const snapshot = useMemo(
    () => aggregateDoofarm(doofarmRaw, registry),
    [doofarmRaw, registry],
  );

  return {
    uid,
    isAdmin,
    adminChecked,
    doofarmRaw,
    registry,
    snapshot,
    loading,
    scope,
    permHint,
  };
}
