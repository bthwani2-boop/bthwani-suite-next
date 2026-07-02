// Canonical location: dsh/frontend/shared/platform/platform-vars.api.ts
// Authority: dsh/frontend/shared/platform — client/API endpoints for platform vars.
// No JSX. No ui-kit. No Tamagui.

export interface PlatformVarsApiClient {
  saveProposedValue(key: string, value: string): Promise<void>;
  applyProposedValue(key: string): Promise<void>;
  rollbackValue(key: string): Promise<void>;
  markContractReady(key: string): Promise<void>;
}
