import {
  getIdentityAccessToken,
} from "@bthwani/core-identity";
import { createDshFlexibleHttpClient } from "../_kernel/dsh-http-request";
import type {
  DshHomeAdminContentInput,
  DshHomeAdminContentItem,
  DshHomeAdminKind,
} from "./home-discovery.types";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

const httpClient = createDshFlexibleHttpClient(resolveDshApiBaseUrl());

type DshHomeDiscoveryAdminClientError =
  | { kind: 'http'; status: number; body: unknown }
  | { kind: 'network'; message: string };

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

export async function fetchHomeDiscoveryAdmin(kind: DshHomeAdminKind): Promise<HomeDiscoveryAdminState> {
  const token = getIdentityAccessToken();
  if (token === null) return { kind: "permission_denied" };
  try {
    const response = await httpClient.request<{ items: DshHomeAdminContentItem[] }>(
      `/dsh/operator/home-discovery/${kind}`,
      { token },
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
  const token = getIdentityAccessToken();
  if (token === null) throw { kind: "http", status: 401 };
  if (itemId === null) {
    await httpClient.request(`/dsh/operator/home-discovery/${kind}`, {
      method: "POST",
      body: input,
      token,
    });
  } else {
    await httpClient.request(`/dsh/operator/home-discovery/${kind}/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: input,
      token,
    });
  }
}

export async function removeHomeDiscoveryAdmin(kind: DshHomeAdminKind, itemId: string): Promise<void> {
  const token = getIdentityAccessToken();
  if (token === null) throw { kind: "http", status: 401 };
  await httpClient.request(`/dsh/operator/home-discovery/${kind}/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
    token,
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
  return { kind: "error", message: typed?.kind === "http" ? `HTTP_${typed.status}` : "UNKNOWN_ERROR" };
}

export const EMPTY_HOME_ADMIN_INPUT: DshHomeAdminContentInput = {
  title: "",
  subtitle: "",
  badgeLabel: "",
  imageUrl: "",
  actionType: "none",
  actionTarget: "",
  sortOrder: 0,
  isActive: true,
};

export type {
  DshHomeAdminContentInput,
  DshHomeAdminContentItem,
  DshHomeAdminKind,
};
