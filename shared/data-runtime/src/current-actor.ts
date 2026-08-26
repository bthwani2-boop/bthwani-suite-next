/**
 * Bthwani current actor.
 *
 * Tracks the actor currently bound to this runtime so that
 * mutation-identity helpers can read it when the caller does not
 * pass an explicit scope. The hook is registered by the identity
 * session lifecycle; it does not own identity itself.
 *
 * The helper exists to keep the durable mutation contract intact
 * without forcing every controller to thread an explicit scope
 * through its arguments. Callers that already know the actor and
 * installation should still pass them explicitly so the read is
 * synchronous and the contract is locally visible.
 */

import type { MutationIdentityScope } from "./mutation-identity-scope.ts";

type ActorBinding = {
  readonly actorId: string;
  readonly installationId: string;
};

let binding: ActorBinding | null = null;

export function setBthwaniCurrentActor(actor: ActorBinding | null): void {
  if (!actor) {
    binding = null;
    return;
  }
  const actorId = actor.actorId.trim();
  const installationId = actor.installationId.trim();
  if (!actorId || !installationId) {
    binding = null;
    return;
  }
  binding = { actorId, installationId };
}

export function getBthwaniCurrentActor(): MutationIdentityScope | null {
  return binding;
}

export function resetBthwaniCurrentActor(): void {
  binding = null;
}
