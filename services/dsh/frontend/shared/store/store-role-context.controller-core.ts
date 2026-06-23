import {
  toCaptainStoreContext,
  toFieldStoreContext,
  toPartnerStoreContext,
  type CaptainStoreContextViewModel,
  type FieldStoreContextViewModel,
  type PartnerStoreContextViewModel,
} from "./store-role-context.view-model";
import type { DshStoreAdminDetail } from "./store-admin.view-model";

export type StoreRoleContextState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "service_unavailable" }
  | { readonly kind: "permission_denied"; readonly statusCode: 401 | 403 }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "success";
      readonly actorRole: "partner" | "field" | "captain" | "operator";
      readonly scope: "own" | "assigned" | "all";
      readonly store: DshStoreAdminDetail;
      readonly latestAction: unknown | null;
    };

export type StoreRole = "partner" | "field" | "captain" | "operator";

export type StoreRoleExperience = {
  readonly partner: PartnerStoreContextViewModel;
  readonly field: FieldStoreContextViewModel;
  readonly captain: CaptainStoreContextViewModel;
};

export function enforceExpectedStoreRole(
  state: StoreRoleContextState,
  expectedRole: StoreRole,
): StoreRoleContextState {
  if (state.kind !== "success" || state.actorRole === expectedRole) {
    return state;
  }
  return { kind: "permission_denied", statusCode: 403 };
}

export type StoreRoleStatePresentation = {
  readonly title: string;
  readonly description?: string;
  readonly tone?: "neutral" | "info" | "success" | "warning" | "danger";
  readonly loading?: boolean;
  readonly retryable: boolean;
};

export function toStoreRoleExperience(state: Extract<StoreRoleContextState, { kind: "success" }>): StoreRoleExperience {
  return {
    partner: toPartnerStoreContext(state.store),
    field: toFieldStoreContext(state.store),
    captain: toCaptainStoreContext(state.store),
  };
}

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
        description: state.statusCode === 401 ? "سجّل الدخول للمتابعة." : "لا تملك صلاحية لهذا المتجر.",
        tone: "warning",
        retryable: false,
      };
    case "service_unavailable":
      return {
        title: labels.error,
        description: "خدمة DSH أو الهوية غير متاحة.",
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
  fetchContext: () => Promise<StoreRoleContextState>,
  publish: (state: StoreRoleContextState) => void,
  expectedRole?: StoreRole,
): Promise<void> {
  publish({ kind: "loading" });
  const state = await fetchContext();
  publish(expectedRole ? enforceExpectedStoreRole(state, expectedRole) : state);
}
