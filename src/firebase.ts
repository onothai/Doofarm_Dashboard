import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { embeddedFirebaseConfig } from "./firebaseAppConfig";

function envTrim(key: keyof ImportMetaEnv): string | undefined {
  const raw = import.meta.env[key];
  if (raw == null) return undefined;
  const s = String(raw).trim();
  return s === "" ? undefined : s;
}

/**
 * ค่าเริ่มต้นใช้จาก `embeddedFirebaseConfig` (เทียบกับแอปเดิม)
 * ถ้ามี `.env` ตั้ง `VITE_FIREBASE_*` จะทับเฉพาะฟิลด์นั้นได้
 */
const measurementId =
  envTrim("VITE_FIREBASE_MEASUREMENT_ID") ??
  embeddedFirebaseConfig.measurementId;

const firebaseConfig = {
  apiKey: envTrim("VITE_FIREBASE_API_KEY") ?? embeddedFirebaseConfig.apiKey,
  authDomain:
    envTrim("VITE_FIREBASE_AUTH_DOMAIN") ?? embeddedFirebaseConfig.authDomain,
  databaseURL:
    envTrim("VITE_FIREBASE_DATABASE_URL") ?? embeddedFirebaseConfig.databaseURL,
  projectId:
    envTrim("VITE_FIREBASE_PROJECT_ID") ?? embeddedFirebaseConfig.projectId,
  storageBucket:
    envTrim("VITE_FIREBASE_STORAGE_BUCKET") ??
    embeddedFirebaseConfig.storageBucket,
  messagingSenderId:
    envTrim("VITE_FIREBASE_MESSAGING_SENDER_ID") ??
    embeddedFirebaseConfig.messagingSenderId,
  appId: envTrim("VITE_FIREBASE_APP_ID") ?? embeddedFirebaseConfig.appId,
  ...(measurementId ? { measurementId } : {}),
};

export const firebaseConfigured =
  !!firebaseConfig.apiKey &&
  !!firebaseConfig.databaseURL &&
  !!firebaseConfig.projectId;

export const app = firebaseConfigured ? initializeApp(firebaseConfig) : null;
/** เว็บใช้ persistence ค่าเริ่มของเบราว์เซอร์ — ไม่ใช้ AsyncStorage แบบแอปมือถือ */
export const auth = app ? getAuth(app) : null;
export const database = app ? getDatabase(app) : null;
