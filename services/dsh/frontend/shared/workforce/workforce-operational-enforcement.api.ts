import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  PromoteCaptainInput,
  PromoteCaptainResponse,
  ProviderIncidentTransition,
  TransitionProviderIncidentInput,
  TransitionProviderIncidentResponse,
} from "./workforce-operational-enforcement.types";

const { request } = createDshHttpClient("/api/workforce", "workforce-operational-enforcement", 15000);

export function promoteCaptainToBasic(actorId: string, input: PromoteCaptainInput): Promise<PromoteCaptainResponse> {
  return request<PromoteCaptainResponse>(
    `/workforce/captains/${encodeURIComponent(actorId)}/classification/basic`,
    { method: "POST", body: input },
  );
}

export function transitionProviderIncident(
  incidentId: string,
  input: TransitionProviderIncidentInput,
): Promise<TransitionProviderIncidentResponse> {
  return request<TransitionProviderIncidentResponse>(
    `/workforce/provider-incidents/${encodeURIComponent(incidentId)}/status`,
    { method: "PATCH", body: input },
  );
}

export async function listProviderIncidentTransitions(
  incidentId: string,
): Promise<readonly ProviderIncidentTransition[]> {
  const result = await request<{ transitions: ProviderIncidentTransition[] }>(
    `/workforce/provider-incidents/${encodeURIComponent(incidentId)}/transitions`,
  );
  return result.transitions;
}
