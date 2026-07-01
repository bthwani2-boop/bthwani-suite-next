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
  const token = getIdentityAccessToken();
  if (!token) throw { kind: "http", status: 401 };

  const form = new FormData();
  form.append("partnerId", partnerId);
  form.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const response = await fetch(new URL("/dsh/field/media/uploads", resolveDshApiBaseUrl()), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!response.ok) throw { kind: "http", status: response.status };
  const data = (await response.json()) as { mediaRef: string };
  return data.mediaRef;
}
