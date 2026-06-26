import { type FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { isAllowedAdmin } from "../adminAccess";
import { DooFarmLogo } from "../components/DooFarmLogo";
import { auth } from "../firebase";

function loginErrorMessage(e: unknown): string {
  const code =
    e != null && typeof e === "object" && "code" in e && typeof e.code === "string"
      ? e.code
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง";
    case "auth/too-many-requests":
      return "ลองเข้าระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
    case "auth/network-request-failed":
      return "เชื่อมต่ออินเทอร์เน็ตไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่";
    case "auth/user-disabled":
      return "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
    default:
      return "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน";
  }
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!auth) return;
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!isAllowedAdmin(cred.user.uid)) {
        await signOut(auth);
        setErr("บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน กรุณาใช้บัญชีแอดมินที่ได้รับอนุญาต");
        return;
      }
    } catch (e: unknown) {
      setErr(loginErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="loginWrap">
      <form className="loginCard" onSubmit={submit}>
        <div className="loginBrand">
          <DooFarmLogo className="doofarmLogo doofarmLogoLogin" />
          <p className="loginSubtitle">Admin Dashboard</p>
        </div>
        <label className="loginLabel">
          อีเมล
          <input
            className="loginInput"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="loginLabel">
          รหัสผ่าน
          <input
            className="loginInput"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {err ? <div className="loginErr">{err}</div> : null}
        <button className="loginBtn" type="submit" disabled={busy}>
          {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
