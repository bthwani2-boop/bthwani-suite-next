declare const process: any;

export interface FeatureFlagsConfig {
  'DSH:sanaa-pilot': boolean;
  'DSH:capability:store-pickup': boolean;
  'DSH:capability:awnak': boolean;
  [key: string]: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlagsConfig = {
  'DSH:sanaa-pilot': true,
  'DSH:capability:store-pickup': false,
  'DSH:capability:awnak': true,
};

export class FeatureFlagsRegistry {
  private static flags: FeatureFlagsConfig = { ...DEFAULT_FEATURE_FLAGS };
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof process !== 'undefined' && process.env) {
      const env = process.env;

      const parseBool = (val: string | undefined, defaultVal: boolean): boolean => {
        if (!val) return defaultVal;
        const normalized = val.trim().toLowerCase();
        return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
      };

      this.flags['DSH:sanaa-pilot'] = parseBool(
        env.EXPO_PUBLIC_FLAG_SANAA_PILOT ?? env.NEXT_PUBLIC_FLAG_SANAA_PILOT,
        DEFAULT_FEATURE_FLAGS['DSH:sanaa-pilot']
      );

      this.flags['DSH:capability:store-pickup'] = parseBool(
        env.EXPO_PUBLIC_FLAG_STORE_PICKUP ?? env.NEXT_PUBLIC_FLAG_STORE_PICKUP,
        DEFAULT_FEATURE_FLAGS['DSH:capability:store-pickup']
      );

      this.flags['DSH:capability:awnak'] = parseBool(
        env.EXPO_PUBLIC_FLAG_AWNAK ?? env.NEXT_PUBLIC_FLAG_AWNAK,
        DEFAULT_FEATURE_FLAGS['DSH:capability:awnak']
      );
    }
  }

  public static get(key: string): boolean {
    if (!this.initialized) {
      this.initialize();
    }
    return this.flags[key] ?? false;
  }

  public static getAll(): FeatureFlagsConfig {
    if (!this.initialized) {
      this.initialize();
    }
    return { ...this.flags };
  }

  public static override(newFlags: Partial<FeatureFlagsConfig>): void {
    this.flags = { ...this.flags, ...newFlags } as FeatureFlagsConfig;
  }
}
