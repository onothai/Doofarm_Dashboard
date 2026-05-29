import { type FormEvent, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { isAllowedAdmin } from "../adminAccess";
import { DooFarmLogo } from "../components/DooFarmLogo";
import { auth } from "../firebase";

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
        setErr("บัญชีนี้ไม่มีสิทธิ์เข้า Dashboard — อนุญาตเฉพาะบัญชีแอดมินที่กำหนดไว้");
        return;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "เข้าสู่ระบบไม่สำเร็จ";
      setErr(msg);
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
        <p className="loginHint">
          หน้านี้เข้าได้เฉพาะบัญชีแอดมินที่ได้รับอนุญาตเท่านั้น
          {typeof window !== "undefined" && window.location.hostname.includes("github.io") ? (
            <>
              {" "}
              — ถ้าล็อกอินไม่ได้ ให้เพิ่มโดเมน <code>onothai.github.io</code> ใน Firebase
              Authentication → Authorized domains
            </>
          ) : null}
        </p>
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
