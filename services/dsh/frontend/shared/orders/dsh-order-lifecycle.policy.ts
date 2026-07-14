/**
 * Mutations the current DSH backend contract does not expose. Surfaces must
 * consult these flags and disable the related actions instead of invoking
 * them and relying on a runtime failure.
 */
export const DSH_CAPTAIN_CONTRACT_CAPABILITIES = {
  locationPush: false,
  failDelivery: false,
  confirmReturn: false,
} as const;
