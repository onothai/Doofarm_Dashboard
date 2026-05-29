/**
 * ค่า Firebase เดียวกับโปรเจกต์แอปเดิม (อ้างอิงจาก `Doofarm - redeesign/firebaseConfig.js`)
 * — ไม่แก้โฟลเดอร์แอปเดิม หากเปลี่ยนคีย์ในแอปให้แก้ที่นี่หรือใช้ตัวแปร VITE_* ใน `.env` override ทีละฟิลด์
 */
export const embeddedFirebaseConfig = {
  apiKey: "AIzaSyD6zbP4LJPCzG4O36B28MKRBRVKrW7_f4c",
  authDomain: "iotfarm-51162.firebaseapp.com",
  databaseURL:
    "https://iotfarm-51162-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "iotfarm-51162",
  storageBucket: "iotfarm-51162.firebasestorage.app",
  messagingSenderId: "794020228964",
  appId: "1:794020228964:web:6899c8534e3bb1f66b9471",
  measurementId: "G-JXCF61QN7W",
} as const;
