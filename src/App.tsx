import { Navigate, Route, Routes } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { isAllowedAdmin } from "./adminAccess";
import { auth, firebaseConfigured } from "./firebase";
import { AdminLayout } from "./layout/AdminLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { DevicesPage } from "./pages/DevicesPage";
import { FarmManagePage } from "./pages/FarmManagePage";
import { FarmsPage } from "./pages/FarmsPage";
import { LoginPage } from "./pages/LoginPage";
import { LogsPage } from "./pages/LogsPage";
import { UsersPage } from "./pages/UsersPage";

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!firebaseConfigured || !auth) {
      setUser(null);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      if (nextUser && !isAllowedAdmin(nextUser.uid)) {
        await signOut(auth!);
        setUser(null);
        return;
      }
      setUser(nextUser);
    });
    return () => unsub();
  }, []);

  if (!firebaseConfigured) {
    return (
      <div className="setupGate">
        <h1>DooFarm Admin</h1>
        <p>
          การตั้งค่า Firebase ไม่ครบ — ตรวจสอบ{" "}
          <code>src/firebaseAppConfig.ts</code> หรือตั้งค่า <code>VITE_FIREBASE_*</code> ใน{" "}
          <code>.env</code>
        </p>
      </div>
    );
  }

  if (user === undefined) {
    return (
      <div className="setupGate">
        <p>กำลังโหลด...</p>
      </div>
    );
  }

  const authedAdmin = isAllowedAdmin(user?.uid);

  return (
    <Routes>
      <Route path="/login" element={authedAdmin ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/" element={authedAdmin ? <AdminLayout /> : <Navigate to="/login" replace />}>
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="farms" element={<FarmsPage />} />
        <Route path="farms/manage/:ownerUid/:planId" element={<FarmManagePage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="logs" element={<LogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
