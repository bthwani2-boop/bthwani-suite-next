import { getIdentityAccessToken } from "@bthwani/core-identity";

import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import type { FieldMediaPickResult } from "../media/field-document-media";

export async function uploadEmployeeMedia(actorId: string, file: FieldMediaPickResult): Promise<string> {
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

  const path = `/dsh/operator/workforce/employees/${encodeURIComponent(actorId)}/media/uploads`;
  const url = cookieMode ? `${baseUrl.replace(/\/$/, "")}${path}` : new URL(path, baseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "X-Correlation-ID": `employee-media-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`,
    },
    body: form,
    ...(cookieMode ? { credentials: "include" as const } : {}),
  });
  if (!response.ok) throw { kind: "http", status: response.status };
  const data = (await response.json()) as { mediaRef: string };
  return data.mediaRef;
}
