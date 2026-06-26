import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ALLOWED_ADMIN_UID } from "../adminAccess";
import { useSystemNotifications } from "../hooks/useSystemNotifications";
import { auth } from "../firebase";

type PanelProps = {
  open: boolean;
  onClose: () => void;
};

export function AlertsPanel({ open, onClose }: PanelProps) {
  const navigate = useNavigate();
  const notifications = useSystemNotifications();

  if (!open) return null;

  return (
    <>
      <button type="button" className="headerPanelBackdrop" aria-label="ปิด" onClick={onClose} />
      <div className="headerPanel headerPanelAlerts">
        <div className="headerPanelHead">
          <strong>แจ้งเตือนระบบ</strong>
          <button type="button" className="headerPanelClose" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="headerPanelBody">
          {notifications.length === 0 ? (
            <p className="headerPanelEmpty">ไม่มีแจ้งเตือน — ระบบปกติ</p>
          ) : (
            notifications.slice(0, 12).map((n) => (
              <button
                key={n.id}
                type="button"
                className="headerPanelItem"
                onClick={() => {
                  onClose();
                  if (n.uid && n.planId) {
                    navigate(
                      `/farms/manage/${encodeURIComponent(n.uid)}/${encodeURIComponent(n.planId)}`,
                    );
                  } else {
                    navigate("/logs");
                  }
                }}
              >
                <span className="headerPanelItemTitle">{n.desc}</span>
                <span className="headerPanelItemSub">{n.statusLabel}</span>
              </button>
            ))
          )}
        </div>
        <button
          type="button"
          className="btnTeal headerPanelFootBtn"
          onClick={() => {
            onClose();
            navigate("/logs");
          }}
        >
          ดูใน Logs → แจ้งเตือน
        </button>
      </div>
    </>
  );
}

export function ProfilePanel({ open, onClose }: PanelProps) {
  const navigate = useNavigate();
  const user = auth?.currentUser;

  if (!open) return null;

  return (
    <>
      <button type="button" className="headerPanelBackdrop" aria-label="ปิด" onClick={onClose} />
      <div className="headerPanel headerPanelProfile">
        <div className="headerPanelHead">
          <strong>โปรไฟล์แอดมิน</strong>
          <button type="button" className="headerPanelClose" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="headerPanelBody profilePanelBody">
          <div className="profileRow">
            <span className="profileK">อีเมล</span>
            <span>{user?.email ?? "—"}</span>
          </div>
          <div className="profileRow">
            <span className="profileK">UID</span>
            <span className="mono">{user?.uid ?? ALLOWED_ADMIN_UID}</span>
          </div>
          <div className="profileRow">
            <span className="profileK">บทบาท</span>
            <span>System Admin</span>
          </div>
        </div>
        <button
          type="button"
          className="btnBlack headerPanelFootBtn"
          onClick={async () => {
            if (!auth) return;
            await signOut(auth);
            onClose();
            navigate("/login", { replace: true });
          }}
        >
          ออกจากระบบ
        </button>
      </div>
    </>
  );
}
