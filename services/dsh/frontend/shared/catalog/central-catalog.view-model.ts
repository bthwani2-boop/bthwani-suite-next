import type { ProductProposalPipelineStatus } from "./central-catalog-product-pipeline";
import { PRODUCT_PROPOSAL_PIPELINE_METADATA } from "./central-catalog-product-pipeline";

export interface StatusBadgeViewModel {
  readonly label: string;
  readonly tone: "warning" | "success" | "danger" | "neutral" | "info";
}

export function getProposalStatusViewModel(status: ProductProposalPipelineStatus): StatusBadgeViewModel {
  const meta = PRODUCT_PROPOSAL_PIPELINE_METADATA[status];
  if (!meta) {
    return { label: status, tone: "neutral" };
  }
  return {
    label: meta.labelAr,
    tone: meta.tone,
  };
}

export function formatIsActive(isActive: boolean): string {
  return isActive ? "نشط" : "معطل";
}

export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("ar-YE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
