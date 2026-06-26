import type { PlatformProviderHealthStatus } from "./platform-provider.types";

export type PlatformProviderHealthRecord = {
  readonly providerId: string;
  readonly status: PlatformProviderHealthStatus;
  readonly checkedAt: string;
  readonly latencyMs?: number | null;
  readonly errorCode?: string | null;
  readonly errorMessage?: string | null;
};

export type PlatformProviderHealthSummary = {
  readonly totalProviders: number;
  readonly healthy: number;
  readonly degraded: number;
  readonly down: number;
  readonly unknown: number;
  readonly lastRefreshedAt: string;
};
