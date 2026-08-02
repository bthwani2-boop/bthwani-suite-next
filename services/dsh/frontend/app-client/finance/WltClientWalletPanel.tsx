// services/dsh/frontend/app-client/finance — WltClientWalletPanel
// Displays the authenticated client's own WLT wallet balance and ledger.
// DSH app-client surfaces import this via the WLT shared barrel.
import React from "react";
import { ActorWalletPanel } from '@bthwani/wlt/dsh';

export type WltClientWalletPanelProps = {
  readonly title?: string;
  readonly embedded?: boolean;
};

/**
 * Read-only wallet summary panel for the client surface.
 * Clients can view their wallet balance and recent ledger entries.
 * All writes (top-up, withdrawal) flow through governed WLT backend routes.
 */
export function WltClientWalletPanel({
  title = "محفظتي",
  embedded = true,
}: WltClientWalletPanelProps) {
  return (
    <ActorWalletPanel
      actorType="client"
      title={title}
      embedded={embedded}
    />
  );
}
