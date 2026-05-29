import type { ActivityRow } from "./activityLogs";

export type ProfileRow = {
  name?: string;
  phone?: string;
  email?: string;
  notificationsEnabled?: boolean;
  consentAccepted?: boolean;
  consentAcceptedAt?: number;
  consentVersion?: string;
};

export type DeviceBinding = {
  planId?: string;
  name?: string;
  boundAt?: number;
};

export type RegistryRow = {
  bound?: boolean;
  owner?: string;
  planId?: string;
  fwVersion?: string;
  lastOnlineAt?: number;
  pairingCode?: string;
  firstSeenAt?: number;
};

export type SensorRealtime = {
  temperature?: number;
  humidity?: number;
  lightIntensity?: number;
  soilMoisture?: number;
  timestamp?: number;
};

export type PumpState = {
  pumpStatus?: number;
  manualCommand?: number;
  updatedAt?: number;
};

export type SettingsState = {
  deviceId?: string;
  setValueMoisture?: number;
  autoMode?: boolean;
  scheduleEnabled?: boolean;
  scheduleOnTime?: string;
  scheduleOffTime?: string;
};

export type PlanNode = {
  Settings?: SettingsState;
  Pump?: PumpState;
  SensorRealtime?: SensorRealtime;
  Alerts?: Record<string, FarmAlertRow>;
  ActivityLogs?: Record<string, ActivityRow>;
  SensorHistory?: Record<string, unknown>;
};

export type FarmAlertRow = {
  alertMessage?: string;
  alertTime?: number;
  setValueMoisture?: number;
  deviceId?: string;
};

export type UserRow = {
  uid: string;
  name: string;
  phone: string;
  email: string;
  deviceCount: number;
  notificationsEnabled: boolean;
  consentAccepted: boolean;
};

export type FarmRow = {
  uid: string;
  deviceId: string;
  planId: string;
  farmName: string;
  ownerName: string;
  ownerEmail: string;
  sensor: SensorRealtime | null;
  pumpStatus: number | null;
  autoMode: boolean | null;
  moistureThreshold: number | null;
  online: boolean;
  fwVersion: string | null;
};

export type ActivityEntry = ActivityRow & {
  uid: string;
  planId: string;
  ownerEmail: string;
};

export type AlertEntry = FarmAlertRow & {
  uid: string;
  planId: string;
  alertId: string;
  ownerEmail: string;
};

export type AdminSnapshot = {
  users: UserRow[];
  farms: FarmRow[];
  activities: ActivityEntry[];
  alerts: AlertEntry[];
  stats: {
    totalUsers: number;
    usersWithDevices: number;
    totalFarms: number;
    totalBoards: number;
    onlineBoards: number;
    totalAlerts: number;
  };
};
