/**
 * SKELETON PROOF — NOT A PRODUCTION ROUTE
 *
 * Proves that WLT finance visibility can use FinanceReadOnlyFrame with only:
 * - shared/app-shell archetypes (composition)
 * - @bthwani/ui-kit public exports (visual primitives)
 *
 * READ-ONLY: No payment mutation, refund mutation, settlement mutation, or ledger write.
 * No API calls. No runtime data. No local design system. No Tamagui direct.
 * Not a registered route. WLT runtime is CONTRACT_ONLY until activation gate passes.
 */
import type { ReactNode } from "react";
import { FinanceReadOnlyFrame } from "@bthwani/app-shell";

type WltFinanceReadOnlyProofProps = {
  readonly headerSlot: ReactNode;
  readonly summarySlot: ReactNode;
  readonly tableSlot: ReactNode;
  readonly stateViewSlot?: ReactNode;
};

export function WltFinanceReadOnlySkeletonProof({
  headerSlot,
  summarySlot,
  tableSlot,
  stateViewSlot,
}: WltFinanceReadOnlyProofProps) {
  return (
    <FinanceReadOnlyFrame
      header={headerSlot}
      summary={summarySlot}
      stateView={stateViewSlot}
      dir="rtl"
    >
      {tableSlot}
    </FinanceReadOnlyFrame>
  );
}
