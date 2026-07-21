import { getIdentityAccessToken } from "@bthwani/core-identity";
import {
  corrId,
  createDshFlexibleHttpClient,
} from "../_kernel/dsh-http-request";
import type {
  DshHomeAdminContentInput,
  DshHomeAdminContentItem,
  DshHomeAdminKind,
} from "./home-discovery.types";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

const httpClient = createDshFlexibleHttpClient(resolveDshApiBaseUrl());

type DshHomeDiscoveryAdminClientError =
  | { kind: "http"; status: number; body?: unknown; code?: string; message?: string }
  | { kind: "network"; message: string };

export type HomeDiscoveryAdminState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "permission_denied" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "success"; readonly items: readonly DshHomeAdminContentItem[] };

export type HomeDiscoveryAdminActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "success"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };

function optionalToken(): { readonly token?: string } {
  const token = getIdentityAccessToken();
  return token === null ? {} : { token };
}

function mutationAuth(prefix: string) {
  const token = getIdentityAccessToken();
  const correlationId = corrId(prefix);
  return {
    auth: {
      ...(token === null ? {} : { accessToken: token }),
      idempotencyKey: correlationId,
      correlationId,
    },
  } as const;
}

export async function fetchHomeDiscoveryAdmin(kind: DshHomeAdminKind): Promise<HomeDiscoveryAdminState> {
  try {
    const response = await httpClient.request<{ items: DshHomeAdminContentItem[] }>(
      `/dsh/operator/home-discovery/${kind}`,
      optionalToken(),
    );
    return response.items.length === 0
      ? { kind: "empty" }
      : { kind: "success", items: response.items };
  } catch (error) {
    return classifyAdminError(error);
  }
}

export async function saveHomeDiscoveryAdmin(
  kind: DshHomeAdminKind,
  itemId: string | null,
  input: DshHomeAdminContentInput,
): Promise<void> {
  if (itemId === null) {
    await httpClient.request(`/dsh/operator/home-discovery/${kind}`, {
      method: "POST",
      body: input,
      ...mutationAuth("home-content-create"),
    });
    return;
  }
  await httpClient.request(`/dsh/operator/home-discovery/${kind}/${encodeURIComponent(itemId)}`, {
    method: "PATCH",
    body: input,
    ...mutationAuth("home-content-update"),
  });
}

export async function removeHomeDiscoveryAdmin(kind: DshHomeAdminKind, itemId: string): Promise<void> {
  await httpClient.request(`/dsh/operator/home-discovery/${kind}/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    ...mutationAuth("home-content-delete"),
  });
}

export function classifyAdminError(error: unknown): HomeDiscoveryAdminState {
  const typed = error as DshHomeDiscoveryAdminClientError;
  if (typed?.kind === "http" && (typed.status === 401 || typed.status === 403)) {
    return { kind: "permission_denied" };
  }
  if (typed?.kind === "network") {
    return { kind: "error", message: "خدمة إدارة محتوى الصفحة الرئيسية غير متاحة." };
  }
  return {
    kind: "error",
    message: typed?.kind === "http"
      ? typed.message ?? typed.code ?? `HTTP_${typed.status}`
      : "UNKNOWN_ERROR",
  };
}

function isVersionConflict(error: Extract<DshHomeDiscoveryAdminClientError, { kind: "http" }>): boolean {
  const message = error.message?.toLowerCase() ?? "";
  const code = error.code?.toLowerCase() ?? "";
  return error.status === 409 || message.includes("version conflict") || code.includes("version_conflict");
}

export function describeAdminMutationError(error: unknown): string {
  const typed = error as DshHomeDiscoveryAdminClientError;
  if (typed?.kind === "http") {
    if (typed.status === 401 || typed.status === 403) return "لا تملك صلاحية إدارة هذا المحتوى.";
    if (isVersionConflict(typed)) return "تم تعديل العنصر من مستخدم آخر. حدّث القائمة ثم أعد المحاولة.";
    return typed.message ?? typed.code ?? "تعذر حفظ التغيير.";
  }
  if (typed?.kind === "network") return "تعذر الاتصال بخدمة إدارة المحتوى.";
  return "تعذر حفظ التغيير.";
}

export const EMPTY_HOME_ADMIN_INPUT: DshHomeAdminContentInput = {
  title: "",
  subtitle: "",
  badgeLabel: "",
  imageUrl: "",
  actionType: "none",
  actionTarget: "",
  sortOrder: 0,
  isActive: false,
  publicationStatus: "draft",
};

export type {
  DshHomeAdminContentInput,
  DshHomeAdminContentItem,
  DshHomeAdminKind,
};
