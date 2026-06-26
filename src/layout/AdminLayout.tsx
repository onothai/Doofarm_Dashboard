import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "../firebase";
import { DooFarmLogo } from "../components/DooFarmLogo";
import { AlertsPanel, ProfilePanel } from "../components/HeaderPanels";
import { GlobalSearch } from "../components/GlobalSearch";
import { AdminDataProvider } from "../context/AdminDataContext";
import { useSystemNotifications } from "../hooks/useSystemNotifications";
import { useUnreadNotifications } from "../hooks/useUnreadAlerts";

function IconBell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function pageTitleFromPath(pathname: string): string {
  if (pathname.startsWith("/farms/manage")) return "จัดการแปลง";
  if (pathname.startsWith("/farms")) return "แปลง / ฟาร์ม";
  if (pathname.startsWith("/users")) return "ผู้ใช้";
  if (pathname.startsWith("/devices")) return "บอร์ดอุปกรณ์";
  if (pathname.startsWith("/logs")) return "บันทึกระบบ";
  return "ภาพรวม";
}

function AdminLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifications = useSystemNotifications();
  const hasUnreadAlerts = useUnreadNotifications(notifications);
  const [q, setQ] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const pageTitle = useMemo(
    () => pageTitleFromPath(location.pathname),
    [location.pathname],
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromUrl = params.get("q") ?? params.get("uid") ?? "";
    if (fromUrl) setQ(fromUrl);
  }, [location.search]);

  const closeNav = () => setNavOpen(false);

  return (
    <div className="adminRoot">
      {navOpen ? (
        <button
          type="button"
          className="adminOverlay"
          aria-label="ปิดเมนู"
          onClick={closeNav}
        />
      ) : null}

      <aside className={`adminSidebar ${navOpen ? "open" : ""}`}>
        <div className="adminBrand">
          <DooFarmLogo className="doofarmLogo doofarmLogoSidebar" />
        </div>
        <nav className="adminNav">
          <p className="adminNavLabel">เมนูหลัก</p>
          <NavLink className={({ isActive }) => `adminNavItem ${isActive ? "active" : ""}`} to="/" end onClick={closeNav}>
            ภาพรวม
          </NavLink>
          <NavLink className={({ isActive }) => `adminNavItem ${isActive ? "active" : ""}`} to="/users" onClick={closeNav}>
            ผู้ใช้
          </NavLink>
          <NavLink className={({ isActive }) => `adminNavItem ${isActive ? "active" : ""}`} to="/farms" onClick={closeNav}>
            แปลง
          </NavLink>
          <NavLink className={({ isActive }) => `adminNavItem ${isActive ? "active" : ""}`} to="/devices" onClick={closeNav}>
            บอร์ด
          </NavLink>
          <NavLink className={({ isActive }) => `adminNavItem ${isActive ? "active" : ""}`} to="/logs" onClick={closeNav}>
            บันทึก
            {hasUnreadAlerts ? (
              <span className="navUnreadDot" aria-label="มีแจ้งเตือนใหม่" />
            ) : null}
          </NavLink>
        </nav>
        <button
          type="button"
          className="adminSignOut"
          onClick={async () => {
            if (!auth) return;
            await signOut(auth);
            navigate("/login", { replace: true });
          }}
        >
          ออกจากระบบ
        </button>
      </aside>

      <div className="adminMain">
        <header className="adminHeader">
          <div className="adminTopRow">
            <button type="button" className="adminMenuBtn" aria-label="เปิดเมนู" onClick={() => setNavOpen(true)}>
              <IconMenu />
            </button>
            <div className="adminPageIntro">
              <p className="adminPageEyebrow">แผงควบคุม DooFarm</p>
              <h1 className="adminPageTitle">{pageTitle}</h1>
            </div>
            <div className="adminTopRight">
              <button
                type="button"
                className={`adminIconBtn ${alertsOpen ? "active" : ""}`}
                aria-label="แจ้งเตือน"
                aria-expanded={alertsOpen}
                onClick={() => {
                  setProfileOpen(false);
                  setAlertsOpen((v) => !v);
                }}
              >
                <IconBell />
                {hasUnreadAlerts ? (
                  <span className="headerIconUnreadDot" aria-label="มีแจ้งเตือนใหม่" />
                ) : null}
              </button>
              <button
                type="button"
                className={`adminIconBtn ${profileOpen ? "active" : ""}`}
                aria-label="โปรไฟล์"
                aria-expanded={profileOpen}
                onClick={() => {
                  setAlertsOpen(false);
                  setProfileOpen((v) => !v);
                }}
              >
                <IconUser />
              </button>
              <AlertsPanel open={alertsOpen} onClose={() => setAlertsOpen(false)} />
              <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
            </div>
          </div>

          <div className="adminSearchRow">
            <GlobalSearch query={q} onQueryChange={setQ} />
          </div>
        </header>

        <main className="adminOutlet">
          <Outlet context={{ searchQuery: q }} />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <AdminDataProvider>
      <AdminLayoutInner />
    </AdminDataProvider>
  );
}
