// Canonical location: dsh/frontend/shared/media/field-document-media.ts
// Authority: dsh/frontend/shared/media — governed field/provider media upload binding.
// Mobile callers pass React Native-style { uri, name, mimeType } descriptors.
// Browser callers currently pass blob: object URLs; those are materialized to a
// real Blob before FormData append so web never relies on the React Native body shape.

import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

export type FieldMediaPickResult = {
  readonly uri: string;
  readonly name: string;
  readonly mimeType: string;
};

export type FieldMediaUploadOptions = {
  readonly kind?: "legal_document" | "visit_evidence";
  readonly storeId?: string;
};

async function appendPickedFile(form: FormData, file: FieldMediaPickResult): Promise<void> {
  const isBrowserObjectUrl = typeof window !== "undefined"
    && typeof Blob !== "undefined"
    && /^(blob:|data:)/i.test(file.uri);

  if (isBrowserObjectUrl) {
    const response = await fetch(file.uri);
    if (!response.ok) throw { kind: "media", status: response.status };
    const blob = await response.blob();
    form.append("file", blob, file.name);
    return;
  }

  // React Native FormData accepts the URI descriptor shape below. Keep this
  // branch isolated from browser execution; web must append a real Blob/File.
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);
}

export async function uploadFieldMedia(partnerId: string, file: FieldMediaPickResult, options: FieldMediaUploadOptions = {}): Promise<string> {
  return uploadFieldMediaForOwner({ partnerId, ...(options.storeId ? { storeId: options.storeId } : {}) }, file, options.kind);
}

export async function uploadFieldStoreMedia(storeId: string, file: FieldMediaPickResult): Promise<string> {
  return uploadFieldMediaForOwner({ storeId }, file);
}

// Provider-owned upload (captain license/vehicle photo, field agent document)
// from Workforce HR create/edit screens. The transport contract remains shared,
// while appendPickedFile keeps the browser and React Native multipart shapes
// explicit instead of pretending that one FormData value representation fits both.
export async function uploadProviderMedia(
  actorId: string,
  role: "employees" | "captains" | "field-agents",
  file: FieldMediaPickResult,
  operatorContextId: string,
): Promise<string> {
  const baseUrl = resolveDshApiBaseUrl();
  const cookieMode = baseUrl.startsWith("/");
  const token = cookieMode ? undefined : getIdentityAccessToken();
  if (!cookieMode && !token) throw { kind: "http", status: 401 };

  const form = new FormData();
  await appendPickedFile(form, file);

  const path = `/workforce/${role}/${encodeURIComponent(actorId)}/media/uploads`;
  const url = cookieMode ? `${baseUrl.replace(/\/$/, "")}${path}` : new URL(path, baseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Correlation-ID": `provider-media-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
      "X-Operator-Context-ID": operatorContextId,
    },
    body: form,
    ...(cookieMode ? { credentials: "include" as const } : {}),
  });
  if (!response.ok) throw { kind: "http", status: response.status };
  const data = (await response.json()) as { mediaRef: string };
  return data.mediaRef;
}

async function uploadFieldMediaForOwner(
  owner: { readonly partnerId: string; readonly storeId?: string } | { readonly storeId: string; readonly partnerId?: never },
  file: FieldMediaPickResult,
  kind?: "legal_document" | "visit_evidence",
): Promise<string> {
  const baseUrl = resolveDshApiBaseUrl();
  const cookieMode = baseUrl.startsWith("/");
  const token = cookieMode ? undefined : getIdentityAccessToken();
  if (!cookieMode && !token) throw { kind: "http", status: 401 };

  const form = new FormData();
  if (owner.partnerId) form.append("partnerId", owner.partnerId);
  if (owner.storeId) form.append("storeId", owner.storeId);
  if (kind) form.append("mediaKind", kind);
  await appendPickedFile(form, file);

  const url = cookieMode
    ? `${baseUrl.replace(/\/$/, "")}/dsh/field/media/uploads`
    : new URL("/dsh/field/media/uploads", baseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Correlation-ID": `field-media-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    },
    body: form,
    ...(cookieMode ? { credentials: "include" as const } : {}),
  });
  if (!response.ok) throw { kind: "http", status: response.status };
  const data = (await response.json()) as { mediaRef: string };
  return data.mediaRef;
}
