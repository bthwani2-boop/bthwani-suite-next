import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";

const { request } = createDshHttpClient(resolveDshApiBaseUrl(), "store-publication");

export type StorePublicationDetail = {
  readonly id: string;
  readonly displayName: string;
  readonly status: string;
  readonly isVisible: boolean;
  readonly partnerReadiness: string;
  readonly catalogApprovalStatus: string;
  readonly marketingVisibility: string;
  readonly publicationDecision: "PUBLISHED" | "BLOCKED";
  readonly blockingReasons: readonly string[];
  readonly version: number;
};

export type StorePublicationDiagnostics = {
  readonly isReady: boolean;
  readonly blockers: readonly string[];
  readonly blockerCodes: readonly string[];
};

export type StorePublicationWorkspace = {
  readonly store: StorePublicationDetail;
  readonly diagnostics: StorePublicationDiagnostics;
  readonly overridePolicy: {
    readonly enabled: boolean;
    readonly allowedBlockerCodes: readonly string[];
  };
};

export type StorePublicationDecision = "publish" | "hide";

export async function fetchStorePublicationWorkspace(storeId: string) {
  return request<StorePublicationWorkspace>(
    `/dsh/operator/marketing/stores/${encodeURIComponent(storeId.trim())}/publication`,
  );
}

export async function decideStorePublication(
  storeId: string,
  body: {
    readonly expectedVersion: number;
    readonly decision: StorePublicationDecision;
    readonly reason: string;
    readonly override: boolean;
    readonly overrideReason: string;
  },
) {
  return request<{ readonly replayed: boolean }>(
    `/dsh/operator/marketing/stores/${encodeURIComponent(storeId.trim())}/publication`,
    {
      method: "POST",
      body,
      idempotencyKey: corrId("store-publication-idem"),
      correlationId: corrId("store-publication-corr"),
      expectedVersion: body.expectedVersion,
    },
  );
}
