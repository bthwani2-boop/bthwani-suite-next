declare const process: any;

export interface PlatformVarsConfig {
  dshApiBaseUrl: string | null;
  authBaseUrl: string | null;
  dshClientId: string | null;
  mediaBaseUrl: string | null;
  devMediaBaseUrl: string | null;
  captainWalletBalanceThreshold: string | null;
  dshVisibilityRegionSanaa: string | null;
  partnerAcceptanceTimeoutSecs: string | null;
  dispatchSearchRadiusKm: string | null;
  partnerSettlementSchedule: string | null;
  runtimeBindingState: 'not_bound';
}

export const DEFAULT_PLATFORM_VARS: PlatformVarsConfig = {
  dshApiBaseUrl: null,
  authBaseUrl: null,
  dshClientId: null,
  mediaBaseUrl: null,
  devMediaBaseUrl: null,
  captainWalletBalanceThreshold: null,
  dshVisibilityRegionSanaa: null,
  partnerAcceptanceTimeoutSecs: null,
  dispatchSearchRadiusKm: null,
  partnerSettlementSchedule: null,
  runtimeBindingState: 'not_bound',
};

// Static registry lets non-React runtime adapters read values synchronously.
export class PlatformVarsRegistry {
  private static config: PlatformVarsConfig = { ...DEFAULT_PLATFORM_VARS };
  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    if (typeof process !== 'undefined' && process.env) {
      this.config.dshApiBaseUrl = (
        process.env.EXPO_PUBLIC_DSH_API_BASE_URL ??
        process.env.NEXT_PUBLIC_DSH_API_BASE_URL ??
        null
      )?.trim() || null;
      this.config.authBaseUrl = (
        process.env.EXPO_PUBLIC_AUTH_BASE_URL ??
        process.env.NEXT_PUBLIC_AUTH_BASE_URL ??
        null
      )?.trim() || null;
      this.config.dshClientId = (process.env.EXPO_PUBLIC_DSH_CLIENT_ID ?? null)?.trim() || null;
      this.config.mediaBaseUrl = (
        process.env.EXPO_PUBLIC_MEDIA_BASE_URL ??
        process.env.NEXT_PUBLIC_MEDIA_BASE_URL ??
        null
      )?.trim() || null;
      this.config.devMediaBaseUrl = (
        process.env.EXPO_PUBLIC_DEV_MEDIA_BASE_URL ??
        process.env.EXPO_PUBLIC_DEV_MEDIA_BASE ??
        process.env.NEXT_PUBLIC_DEV_MEDIA_BASE_URL ??
        process.env.NEXT_PUBLIC_DEV_MEDIA_BASE ??
        null
      )?.trim() || null;
    }
  }

  public static get<K extends keyof PlatformVarsConfig>(key: K): PlatformVarsConfig[K] {
    if (!this.initialized) {
      this.initialize();
    }
    return this.config[key];
  }

  public static getAll(): PlatformVarsConfig {
    if (!this.initialized) {
      this.initialize();
    }
    return { ...this.config };
  }

  public static override(newConfig: Partial<PlatformVarsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
