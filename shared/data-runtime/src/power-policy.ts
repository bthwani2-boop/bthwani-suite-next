import type { BthwaniOfflineMutationQueue } from "./offline-mutation-queue";

declare const require: ((id: string) => unknown) | undefined;

type BatteryState = {
  readonly lowPowerMode?: boolean;
  readonly batteryLevel?: number;
};

type BatterySubscription = { remove(): void };

type BatteryModule = {
  getPowerStateAsync(): Promise<BatteryState>;
  addBatteryLevelListener(listener: (event: { batteryLevel: number }) => void): BatterySubscription;
  addLowPowerModeListener(listener: (event: { lowPowerMode: boolean }) => void): BatterySubscription;
};

function shouldPause(state: BatteryState): boolean {
  return state.lowPowerMode === true
    || (typeof state.batteryLevel === "number"
      && state.batteryLevel >= 0
      && state.batteryLevel < 0.12);
}

export function wireBatteryAwareQueue(queue: BthwaniOfflineMutationQueue): () => void {
  if (typeof require !== "function") return () => {};
  let battery: BatteryModule;
  try {
    battery = require("expo-battery") as BatteryModule;
  } catch {
    return () => {};
  }

  let lastState: BatteryState = {};
  const applyState = (patch: BatteryState) => {
    lastState = { ...lastState, ...patch };
    const paused = shouldPause(lastState);
    queue.setPaused(paused);
    if (!paused) void queue.flush();
  };

  void battery.getPowerStateAsync().then((state) => applyState(state));
  const levelSubscription = battery.addBatteryLevelListener(({ batteryLevel }) => applyState({ batteryLevel }));
  const lowPowerSubscription = battery.addLowPowerModeListener(({ lowPowerMode }) => applyState({ lowPowerMode }));
  return () => {
    levelSubscription.remove();
    lowPowerSubscription.remove();
  };
}
