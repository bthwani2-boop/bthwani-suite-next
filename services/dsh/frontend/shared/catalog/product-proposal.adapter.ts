import type { ProductProposal } from "./central-catalog.types";
import { PRODUCT_PROPOSAL_PIPELINE_METADATA } from "./central-catalog-product-pipeline";

export class ProductProposalAdapter {
  constructor(private readonly p: ProductProposal) {}

  getArabicLabel(): string {
    return PRODUCT_PROPOSAL_PIPELINE_METADATA[this.p.status]?.labelAr ?? this.p.status;
  }

  isTerminal(): boolean {
    const next = PRODUCT_PROPOSAL_PIPELINE_METADATA[this.p.status]?.allowedNextStatuses ?? [];
    return next.length === 0;
  }

  canPartnerAdvance(): boolean {
    return PRODUCT_PROPOSAL_PIPELINE_METADATA[this.p.status]?.partnerCanAdvance ?? false;
  }

  isClientVisible(): boolean {
    return this.p.status === "client-visible";
  }
}
