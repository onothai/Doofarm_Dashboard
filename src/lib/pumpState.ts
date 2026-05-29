import type { PlanNode } from "./rtdb-types";

export type PumpUiState = {
  autoMode: boolean;
  pumpOn: boolean;
};

/** อ่านสถานะปั๊มให้ตรง logic แอป (manualCommand + pumpStatus) */
export function readPumpUiState(plan: PlanNode | null): PumpUiState {
  const autoMode = plan?.Settings?.autoMode === true;
  const manual = plan?.Pump?.manualCommand;
  const status = plan?.Pump?.pumpStatus;

  if (autoMode) {
    return { autoMode: true, pumpOn: status === 1 };
  }
  if (manual === 1) return { autoMode: false, pumpOn: true };
  if (manual === 0) return { autoMode: false, pumpOn: false };
  return { autoMode: false, pumpOn: status === 1 };
}
