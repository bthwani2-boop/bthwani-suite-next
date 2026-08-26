/**
 * Bthwani identity → current-actor wiring.
 *
 * Bridges the identity session lifecycle to the data-runtime
 * current-actor binding so that mutation-identity helpers can
 * resolve their scope without each controller having to thread
 * an explicit scope argument.
 *
 * The bridge is opt-in: callers must either call
 * configureBthwaniIdentityBridge once at app startup, or use the
 * useBthwaniMutationActor hook from a React component that
 * already has access to the identity session.
 */

import { getBthwaniInstallationId, resetBthwaniInstallationIdForTests as resetInstallationId } from "./installation-id.ts";
import { resetBthwaniCurrentActor, setBthwaniCurrentActor } from "./current-actor.ts";

let installed = false;
let detach: (() => void) | null = null;

type IdentityBridgeIdentity = {
  readonly subject: string;
};

type IdentityBridgeSessionState =
  | { readonly kind: "authenticated"; readonly identity: IdentityBridgeIdentity }
  | { readonly kind: string };

type IdentityBridgeState = {
  readonly state: () => IdentityBridgeSessionState;
  readonly subscribe: (listener: () => void) => () => void;
};

function isAuthenticated(value: IdentityBridgeSessionState): value is { readonly kind: "authenticated"; readonly identity: IdentityBridgeIdentity } {
  if (value.kind !== "authenticated") return false;
  const identity = (value as { identity?: { subject?: unknown } }).identity;
  return typeof identity?.subject === "string";
}

async function resolveActor(identity: IdentityBridgeIdentity): Promise<void> {
  const installationId = await getBthwaniInstallationId();
  setBthwaniCurrentActor({
    actorId: identity.subject,
    installationId,
  });
}

export function configureBthwaniIdentityBridge(identityBridge: IdentityBridgeState): void {
  if (installed) return;
  installed = true;
  const apply = (state: IdentityBridgeSessionState) => {
    if (isAuthenticated(state)) {
      void resolveActor(state.identity);
    } else {
      setBthwaniCurrentActor(null);
    }
  };
  apply(identityBridge.state());
  detach = identityBridge.subscribe(() => apply(identityBridge.state()));
}

export async function bindBthwaniMutationActor(actorId: string, installationId?: string): Promise<void> {
  const resolvedInstallationId = installationId ?? await getBthwaniInstallationId();
  setBthwaniCurrentActor({
    actorId,
    installationId: resolvedInstallationId,
  });
}

export function clearBthwaniMutationActor(): void {
  setBthwaniCurrentActor(null);
}

export function teardownBthwaniIdentityBridgeForTests(): void {
  if (detach) {
    detach();
    detach = null;
  }
  installed = false;
  resetBthwaniCurrentActor();
  resetInstallationId();
}

export type { IdentityBridgeState, IdentityBridgeSessionState };
