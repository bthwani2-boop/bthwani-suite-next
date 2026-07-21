import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type { ProductProposal } from "./central-catalog.types";

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "catalog-proposal-readback-corr",
);

export interface ProductProposalReadbackPage {
  readonly items: readonly ProductProposal[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
}

type ProposalReadbackQuery = {
  readonly status?: string;
  readonly limit?: number;
  readonly offset?: number;
};

function buildProposalQuery(query?: ProposalReadbackQuery): string {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function fetchProposalPage(path: string): Promise<ProductProposalReadbackPage> {
  const response = await request<{
    readonly proposals: readonly ProductProposal[];
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
  }>(path);
  return {
    items: response.proposals,
    total: response.total,
    limit: response.limit,
    offset: response.offset,
  };
}

export function fetchPartnerProductProposals(
  query?: ProposalReadbackQuery,
): Promise<ProductProposalReadbackPage> {
  return fetchProposalPage(
    `/dsh/partner/catalog/product-proposals${buildProposalQuery(query)}`,
  );
}

export function fetchFieldProductProposals(
  partnerId: string,
  query?: ProposalReadbackQuery,
): Promise<ProductProposalReadbackPage> {
  return fetchProposalPage(
    `/dsh/field/partners/${encodeURIComponent(partnerId)}/catalog/product-proposals${buildProposalQuery(query)}`,
  );
}
