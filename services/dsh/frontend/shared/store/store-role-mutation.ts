import type { DshMutationAuth } from "../_kernel/dsh-http-request";
import { secureRandomId } from "../_kernel/secure-random.ts";
import type { StoreRoleAction } from "./store-discovery.types";

function uniquePart(): string {
  return secureRandomId();
}

export function fingerprintStoreRoleAction(action: StoreRoleAction): string {
  return JSON.stringify(action);
}

export function createStoreRoleMutationAuth(accessToken?: string): DshMutationAuth {
  const part = uniquePart();
  return {
    ...(accessToken ? { accessToken } : {}),
    idempotencyKey: `store-role:${part}`,
    correlationId: `store-role-correlation:${part}`,
  };
}

export type StoreRoleMutationAttempt = {
  readonly fingerprint: string;
  readonly auth: DshMutationAuth;
};

export function resolveStoreRoleMutationAttempt(
  current: StoreRoleMutationAttempt | null,
  action: StoreRoleAction,
  accessToken?: string,
): StoreRoleMutationAttempt {
  const fingerprint = fingerprintStoreRoleAction(action);
  if (current?.fingerprint === fingerprint) return current;
  return {
    fingerprint,
    auth: createStoreRoleMutationAuth(accessToken),
  };
}
