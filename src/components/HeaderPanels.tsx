import { signOut } from "firebase/auth";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ALLOWED_ADMIN_UID } from "../adminAccess";
import { useAdminDataContext } from "../context/AdminDataContext";
import { auth } from "../firebase";

type PanelProps = {
  open: boolean;
  onClose: () => void;
};

export function AlertsPanel({ open, onClose }: PanelProps) {
  const navigate = useNavigate();
  const { snapshot } = useAdminDataContext();

  const alerts = useMemo(
    () => snapshot.alerts.slice(0, 12),
    [snapshot.alerts],
  );

  if (!open) return null;

  return (
    <>
      <button type="button" className="headerPanelBackdrop" aria-label="ปิด" onClick={onClose} />
      <div className="headerPanel headerPanelAlerts">
        <div className="headerPanelHead">
          <strong>แจ้งเตือนล่าสุด</strong>
          <button type="button" className="headerPanelClose" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="headerPanelBody">
          {alerts.length === 0 ? (
            <p className="headerPanelEmpty">ไม่มีแจ้งเตือนในระบบ</p>
          ) : (
            alerts.map((a) => (
              <button
                key={`${a.uid}-${a.alertId}`}
                type="button"
                className="headerPanelItem"
                onClick={() => {
                  onClose();
                  navigate(
                    `/farms/manage/${encodeURIComponent(a.uid)}/${encodeURIComponent(a.planId)}`,
                  );
                }}
              >
                <span className="headerPanelItemTitle">{a.alertMessage ?? "—"}</span>
                <span className="headerPanelItemSub">{a.ownerEmail}</span>
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
          ดูบันทึกทั้งหมด
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
