import { createDshHttpClient } from "../_kernel/dsh-http-request";

const { request } = createDshHttpClient("/api/dsh", "workforce-scope", 15000);

export type WorkforceScopeActorRole = "field" | "captain";

export type WorkforceScopeSnapshot = {
  readonly actorId: string;
  readonly actorRole: WorkforceScopeActorRole;
  readonly storeIds: readonly string[];
  readonly serviceAreaCodes: readonly string[];
};

export type WorkforceScopeStoreOption = {
  readonly id: string;
  readonly displayName: string;
  readonly serviceAreaCode: string;
  readonly cityCode: string;
};

type OperatorStoreListEnvelope = {
  readonly stores?: ReadonlyArray<{
    readonly id?: string;
    readonly displayName?: string;
    readonly display_name?: string;
    readonly serviceAreaCode?: string;
    readonly service_area_code?: string;
    readonly cityCode?: string;
    readonly city_code?: string;
  }>;
};

export async function fetchWorkforceScopeOptions(): Promise<readonly WorkforceScopeStoreOption[]> {
  const response = await request<OperatorStoreListEnvelope>("/dsh/operator/stores?limit=100&offset=0");
  return (response.stores ?? []).flatMap((store) => {
    const id = store.id?.trim();
    const serviceAreaCode = (store.serviceAreaCode ?? store.service_area_code)?.trim();
    if (!id || !serviceAreaCode) return [];
    return [{
      id,
      displayName: (store.displayName ?? store.display_name ?? id).trim(),
      serviceAreaCode,
      cityCode: (store.cityCode ?? store.city_code ?? "").trim(),
    }];
  });
}

export async function getWorkforceScopes(
  actorId: string,
  actorRole: WorkforceScopeActorRole,
): Promise<WorkforceScopeSnapshot> {
  return request<WorkforceScopeSnapshot>(
    `/dsh/operator/workforce/scopes/${encodeURIComponent(actorId)}?actorRole=${actorRole}`,
  );
}

export async function replaceWorkforceScopes(input: WorkforceScopeSnapshot): Promise<WorkforceScopeSnapshot> {
  return request<WorkforceScopeSnapshot>(
    `/dsh/operator/workforce/scopes/${encodeURIComponent(input.actorId)}`,
    {
      method: "PUT",
      body: {
        actorRole: input.actorRole,
        storeIds: input.storeIds,
        serviceAreaCodes: input.serviceAreaCodes,
      },
    },
  );
}
