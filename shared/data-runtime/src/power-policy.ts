import type { BthwaniOfflineMutationQueue } from "./offline-mutation-queue";

declare const require: ((id: string) => unknown) | undefined;

type BatteryState = {
  readonly lowPowerMode?: boolean;
  readonly batteryLevel?: number;
};

type BatteryModule = {
  getPowerStateAsync(): Promise<BatteryState>;
  addPowerStateListener(listener: (state: BatteryState) => void): { remove(): void };
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

  void battery.getPowerStateAsync().then((state) => queue.setPaused(shouldPause(state)));
  const subscription = battery.addPowerStateListener((state) => {
    const paused = shouldPause(state);
    queue.setPaused(paused);
    if (!paused) void queue.flush();
  });
  return () => subscription.remove();
}
