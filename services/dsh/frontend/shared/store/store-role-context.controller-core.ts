import {
  toCaptainStoreContext,
  toFieldStoreContext,
  toPartnerStoreContext,
  type CaptainStoreContextViewModel,
  type FieldStoreContextViewModel,
  type PartnerStoreContextViewModel,
} from "./store-role-context.view-model";
import type {
  DshStoreAdminDetailState,
  DshStoreAdminListState,
} from "./store-admin.view-model";

export type StoreRoleContextState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "service_unavailable" }
  | { readonly kind: "permission_denied"; readonly statusCode: 401 | 403 }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "success";
      readonly partner: PartnerStoreContextViewModel;
      readonly field: FieldStoreContextViewModel;
      readonly captain: CaptainStoreContextViewModel;
    };

export type StoreRoleStatePresentation = {
  readonly title: string;
  readonly description?: string;
  readonly tone?: "neutral" | "info" | "success" | "warning" | "danger";
  readonly loading?: boolean;
  readonly retryable: boolean;
};

export function toStoreRoleStatePresentation(
  state: Exclude<StoreRoleContextState, { readonly kind: "success" }>,
  labels: {
    readonly loading: string;
    readonly empty: string;
    readonly error: string;
  },
): StoreRoleStatePresentation {
  switch (state.kind) {
    case "loading":
      return { title: labels.loading, loading: true, retryable: false };
    case "empty":
      return { title: labels.empty, retryable: false };
    case "permission_denied":
      return {
        title: "غير مصرح",
        description: `HTTP ${state.statusCode}`,
        tone: "warning",
        retryable: false,
      };
    case "service_unavailable":
      return {
        title: labels.error,
        description: "خدمة DSH غير متاحة.",
        tone: "danger",
        retryable: true,
      };
    case "error":
      return {
        title: labels.error,
        description: state.message,
        tone: "danger",
        retryable: true,
      };
  }
}

export async function loadStoreRoleContext(
  fetchList: () => Promise<DshStoreAdminListState>,
  fetchDetail: (storeId: string) => Promise<DshStoreAdminDetailState>,
  publish: (state: StoreRoleContextState) => void,
  input?: {
    readonly storeId?: string;
    readonly actorRole?: "partner" | "field" | "captain";
    readonly contextMode?: "readiness" | "verification" | "pickup-context";
  },
): Promise<void> {
  publish({ kind: "loading" });

  if (input?.storeId) {
    const detail = await fetchDetail(input.storeId);
    if (detail.kind !== "success") {
      publish(mapDetailFailure(detail));
      return;
    }

    publish({
      kind: "success",
      partner: toPartnerStoreContext(detail.detail),
      field: toFieldStoreContext(detail.detail),
      captain: toCaptainStoreContext(detail.detail),
    });
    return;
  }

  // dev/read-only fallback
  // This is a local dev/read-only fallback for when storeId is not available, not for runtime closure truth.
  const list = await fetchList();

  if (list.kind !== "success") {
    publish(mapListFailure(list));
    return;
  }
  const first = list.rows[0];
  if (!first) {
    publish({ kind: "empty" });
    return;
  }

  const detail = await fetchDetail(first.id);
  if (detail.kind !== "success") {
    publish(mapDetailFailure(detail));
    return;
  }

  publish({
    kind: "success",
    partner: toPartnerStoreContext(detail.detail),
    field: toFieldStoreContext(detail.detail),
    captain: toCaptainStoreContext(detail.detail),
  });
}

function mapListFailure(
  state: Exclude<DshStoreAdminListState, { readonly kind: "success" }>,
): StoreRoleContextState {
  if (state.kind === "loading") return { kind: "loading" };
  if (state.kind === "empty") return { kind: "empty" };
  if (state.kind === "service_unavailable") return { kind: "service_unavailable" };
  if (state.kind === "permission_denied") return state;
  return { kind: "error", message: state.message };
}

function mapDetailFailure(
  state: Exclude<DshStoreAdminDetailState, { readonly kind: "success" }>,
): StoreRoleContextState {
  if (state.kind === "loading") return { kind: "loading" };
  if (state.kind === "not_found") return { kind: "empty" };
  if (state.kind === "permission_denied") return state;
  return { kind: "error", message: state.message };
}
