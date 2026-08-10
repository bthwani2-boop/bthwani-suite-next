export type PartnerOrderMutationCommand = 'accept' | 'prepare' | 'ready' | 'handoff';

/**
 * Resolve the exact partner mutation the backend currently allows.
 * This policy is deliberately pure so runtime/UI hooks and tests share one
 * fail-closed decision without importing React or network transports.
 */
export function resolvePartnerOrderMutation(
  actionId: string,
  allowedActions: readonly string[],
): PartnerOrderMutationCommand | null {
  if (actionId === 'accept' && allowedActions.includes('accept')) return 'accept';
  if (actionId === 'ready' && allowedActions.includes('ready')) return 'ready';
  if (actionId === 'handoff' && allowedActions.includes('handoff')) return 'handoff';
  if (actionId === 'prepare') {
    if (allowedActions.includes('prepare')) return 'prepare';
    if (allowedActions.includes('ready')) return 'ready';
  }
  return null;
}
