import { useCallback, useState } from "react";
import {
  createCaptain,
  createFieldAgent,
  issueCaptainActivationCode,
  issueFieldAgentActivationCode,
  workforceErrorMessage,
} from "./workforce.api";
import type {
  ActivationCodeResult,
  Captain,
  CreateCaptainInput,
  CreateFieldAgentInput,
  FieldAgent,
} from "./workforce.types";

export type WorkforceCreateActivationState<TProvider> =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | {
      kind: "created";
      provider: TProvider;
      activation: ActivationCodeResult | null;
      activationError: string | null;
    };

export type WorkforceCreateActivationResult<TProvider> = {
  readonly provider: TProvider;
  readonly activation: ActivationCodeResult | null;
  readonly activationError: string | null;
};

function useCreateActivationController<TProvider, TInput>(
  createProvider: (input: TInput) => Promise<TProvider>,
  providerVersion: (provider: TProvider) => number,
  providerActorId: (provider: TProvider) => string,
  issueActivation: (actorId: string, expectedVersion: number) => Promise<ActivationCodeResult>,
) {
  const [state, setState] = useState<WorkforceCreateActivationState<TProvider>>({ kind: "idle" });

  const submit = useCallback(async (
    input: TInput,
    options: { readonly issueActivationCode: boolean },
  ): Promise<WorkforceCreateActivationResult<TProvider> | null> => {
    setState({ kind: "submitting" });
    try {
      const provider = await createProvider(input);
      let activation: ActivationCodeResult | null = null;
      let activationError: string | null = null;

      if (options.issueActivationCode) {
        try {
          activation = await issueActivation(providerActorId(provider), providerVersion(provider));
        } catch (error) {
          activationError = workforceErrorMessage(error);
        }
      }

      const result = { provider, activation, activationError };
      setState({ kind: "created", ...result });
      return result;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
      return null;
    }
  }, [createProvider, issueActivation, providerActorId, providerVersion]);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, submit, reset };
}

export function useFieldAgentCreateAndActivationController() {
  return useCreateActivationController<FieldAgent, CreateFieldAgentInput>(
    createFieldAgent,
    (agent) => agent.version,
    (agent) => agent.actorId,
    issueFieldAgentActivationCode,
  );
}

export function useCaptainCreateAndActivationController() {
  return useCreateActivationController<Captain, CreateCaptainInput>(
    createCaptain,
    (captain) => captain.version,
    (captain) => captain.actorId,
    issueCaptainActivationCode,
  );
}
