import type { ProductProposal } from "./central-catalog.types";
import {
  PRODUCT_PROPOSAL_PIPELINE_METADATA,
  type ProductApprovalStateMetadata,
} from "./central-catalog-product-pipeline";

export class ProductProposalAdapter {
  constructor(private readonly p: ProductProposal) {}

  private get metadata(): ProductApprovalStateMetadata | undefined {
    return PRODUCT_PROPOSAL_PIPELINE_METADATA[this.p.status];
  }

  getArabicLabel(): string {
    return this.metadata?.labelAr ?? this.p.status;
  }

  getTone(): ProductApprovalStateMetadata["tone"] {
    return this.metadata?.tone ?? "neutral";
  }

  isTerminal(): boolean {
    return (this.metadata?.allowedNextStatuses ?? []).length === 0;
  }

  canPartnerAdvance(): boolean {
    return this.metadata?.partnerCanAdvance ?? false;
  }

  isClientVisible(): boolean {
    return this.metadata?.isClientVisible ?? false;
  }
}
