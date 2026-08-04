// Canonical location: dsh/frontend/shared/media/field-document-media.ts
// Authority: dsh/frontend/shared/media — real field document/photo upload binding.
// Uploads a picked file to dsh-api (which streams it to MinIO) and returns the
// real mediaRef to attach via fieldUploadDocument. No screen may call fetch directly.

import { getIdentityAccessToken } from "@bthwani/core-identity";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";

export type FieldMediaPickResult = {
  readonly uri: string;
  readonly name: string;
  readonly mimeType: string;
};

export async function uploadFieldMedia(partnerId: string, file: FieldMediaPickResult): Promise<string> {
  return uploadFieldMediaForOwner({ partnerId }, file);
}

export async function uploadFieldStoreMedia(storeId: string, file: FieldMediaPickResult): Promise<string> {
  return uploadFieldMediaForOwner({ storeId }, file);
}

// Provider-owned upload (captain license/vehicle photo, field agent
// document) from the Workforce HR create/edit screens — not tied to any
// partner or store, unlike the uploads above.
//
// This targets the actor-scoped governed route. The flat
// /dsh/operator/workforce/media/uploads path this used to call was a legacy
// compatibility entry that already answered 410 ROUTE_RETIRED, and its shim
// was deleted with legacy_contract_compat_routes.go, so the call had no
// handler at all. The actor is now identified by the path, and the server
// classifies the object as an employee document, so no actor field is sent.
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
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

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
  owner: { readonly partnerId: string; readonly storeId?: never } | { readonly storeId: string; readonly partnerId?: never },
  file: FieldMediaPickResult,
): Promise<string> {
  const baseUrl = resolveDshApiBaseUrl();
  const cookieMode = baseUrl.startsWith("/");
  const token = cookieMode ? undefined : getIdentityAccessToken();
  if (!cookieMode && !token) throw { kind: "http", status: 401 };

  const form = new FormData();
  if (owner.partnerId) form.append("partnerId", owner.partnerId);
  if (owner.storeId) form.append("storeId", owner.storeId);
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

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
