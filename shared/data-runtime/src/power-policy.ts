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

type BatteryModuleExport = BatteryModule | { readonly default: BatteryModule };

export function wireBatteryAwareQueue(): () => void {
  if (typeof require !== "function") return () => {};
  try {
    const loaded = require("expo-battery") as BatteryModuleExport;
    const battery = (loaded && "default" in loaded && loaded.default ? loaded.default : loaded) as BatteryModule;
    if (!battery || typeof battery.addBatteryLevelListener !== "function" || typeof battery.addLowPowerModeListener !== "function") {
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
      levelSubscription?.remove?.();
      lowPowerSubscription?.remove?.();
    };
  } catch {
    return () => {};
  }
}
