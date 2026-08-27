declare const require: ((id: string) => unknown) | undefined;

const optionalNativeRequire: ((id: string) => unknown) | undefined =
  typeof require === "function" ? require : undefined;

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

export function wireBatteryAwareQueue(): () => void {
  if (!optionalNativeRequire) return () => {};
  let battery: BatteryModule;
  try {
    battery = optionalNativeRequire("expo-battery") as BatteryModule;
  } catch {
    return () => {};
  }

  const levelSubscription = battery.addBatteryLevelListener(() => {
    // No offline-mutation queue is owned by data-runtime. Battery
    // observers are kept only as a hook for downstream consumers
    // to subscribe; paused/flush semantics now belong to the
    // field-offline-queue state machine which is scoped to the
    // platform-workforce actor and observes its own budget.
  });
  const lowPowerSubscription = battery.addLowPowerModeListener(() => {
    // Same rationale as above.
  });
  return () => {
    levelSubscription.remove();
    lowPowerSubscription.remove();
  };
}
