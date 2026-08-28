import { createDshHttpClient } from "../_kernel/dsh-http-request";
import type {
  PromoteCaptainInput,
  PromoteCaptainResponse,
  ProviderPenaltyCommand,
  TransitionProviderIncidentInput,
  TransitionProviderIncidentResponse,
} from "./workforce-operational-enforcement.types";

const { request } = createDshHttpClient("/api/workforce", "workforce-operational-enforcement", 15000);

export function promoteCaptainToBasic(actorId: string, input: PromoteCaptainInput, idempotencyKey?: string): Promise<PromoteCaptainResponse> {
  return request<PromoteCaptainResponse>(
    `/workforce/captains/${encodeURIComponent(actorId)}/classification/basic`,
    { method: "POST", body: input, idempotencyKey },
  );
}

export function transitionProviderIncident(
  incidentId: string,
  input: TransitionProviderIncidentInput,
): Promise<TransitionProviderIncidentResponse> {
  const commandIdentity = `workforce-provider-incident:${incidentId}:${input.expectedVersion}:${input.toStatus}`;
  return request<TransitionProviderIncidentResponse>(
    `/workforce/provider-incidents/${encodeURIComponent(incidentId)}/status`,
    { method: "PATCH", body: input, expectedVersion: input.expectedVersion, idempotencyKey: commandIdentity },
  );
}

export async function getProviderPenaltyCommand(commandId: string): Promise<ProviderPenaltyCommand> {
  const result = await request<{ financialCommand: ProviderPenaltyCommand }>(
    `/workforce/provider-penalty-commands/${encodeURIComponent(commandId)}`,
  );
  return result.financialCommand;
}
