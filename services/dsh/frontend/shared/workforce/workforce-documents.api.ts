import { corrId, createDshHttpClient } from "../_kernel/dsh-http-request";
import type { Employee, FieldAgent, ProviderKind } from "./workforce.types";

const { request } = createDshHttpClient("/api/workforce", "workforce", 15000);

function providerCollection(kind: ProviderKind): string {
  switch (kind) {
    case "field":
      return "field-agents";
    case "captain":
      return "captains";
    case "employee":
      return "employees";
  }
}

export async function appendProviderDocument(
  kind: ProviderKind,
  actorId: string,
  expectedVersion: number,
  mediaRef: string,
): Promise<FieldAgent | Employee> {
  return request<FieldAgent | Employee>(
    `/workforce/${providerCollection(kind)}/${encodeURIComponent(actorId)}/documents`,
    {
      method: "POST",
      idempotencyKey: corrId("wf-document-link"),
      body: { expectedVersion, mediaRef },
    },
  );
}
