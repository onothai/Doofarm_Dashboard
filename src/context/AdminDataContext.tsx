import { createContext, useContext, type ReactNode } from "react";
import { useAdminData, type AdminDataState } from "../hooks/useAdminData";

const AdminDataContext = createContext<AdminDataState | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const value = useAdminData();
  return (
    <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>
  );
}

export function useAdminDataContext(): AdminDataState {
  const ctx = useContext(AdminDataContext);
  if (!ctx) {
    throw new Error("useAdminDataContext must be used within AdminDataProvider");
  }
  return ctx;
}
