/** UID เดียวที่อนุญาตให้เข้า Dashboard นี้ได้ */
export const ALLOWED_ADMIN_UID = "RMHdcfiTEWYsOrugwOrnBbKoVyv1";

export function isAllowedAdmin(uid: string | null | undefined): uid is string {
  return !!uid && uid === ALLOWED_ADMIN_UID;
}
