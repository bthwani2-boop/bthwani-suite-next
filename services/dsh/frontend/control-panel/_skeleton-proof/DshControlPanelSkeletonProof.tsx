/**
 * SKELETON PROOF — NOT A PRODUCTION ROUTE
 *
 * Proves that DSH can fill a control panel archetype frame using only:
 * - shared/app-shell archetypes (composition)
 * - @bthwani/ui-kit public exports (visual primitives)
 *
 * No API calls. No runtime data. No local design system. No Tamagui direct.
 * No financial mutations. Not a registered route.
 */
import type { ReactNode } from "react";
import { DataTablePageFrame } from "@bthwani/app-shell";

type DshStoreAdminProofProps = {
  readonly headerSlot: ReactNode;
  readonly toolbarSlot: ReactNode;
  readonly filtersSlot: ReactNode;
  readonly tableSlot: ReactNode;
  readonly stateViewSlot?: ReactNode;
};

export function DshControlPanelSkeletonProof({
  headerSlot,
  toolbarSlot,
  filtersSlot,
  tableSlot,
  stateViewSlot,
}: DshStoreAdminProofProps) {
  return (
    <DataTablePageFrame
      header={headerSlot}
      toolbar={toolbarSlot}
      filters={filtersSlot}
      stateView={stateViewSlot}
      dir="rtl"
    >
      {tableSlot}
    </DataTablePageFrame>
  );
}
