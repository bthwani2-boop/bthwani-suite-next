/**
 * Mutations exposed by the current governed DSH backend contract.
 * Surfaces must consult these flags and disable only capabilities that do not
 * have a same-branch backend route, contract, and verified runtime binding.
 */
export const DSH_CAPTAIN_CONTRACT_CAPABILITIES = {
  locationPush: true,
  failDelivery: false,
  confirmReturn: false,
} as const;
