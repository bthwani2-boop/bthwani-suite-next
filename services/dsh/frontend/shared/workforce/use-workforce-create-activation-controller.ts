import { useCallback, useState } from "react";
import {
  workforceErrorMessage,
} from "./workforce.api";

export type WorkforceCreateActivationState =
  | { kind: "idle" }
  | { kind: "provisioning"; caseId: string; status: string }
  | { kind: "error"; message: string; caseId?: string }
  | { kind: "created"; caseId: string };

function useCreateActivationController() {
  const [state, setState] = useState<WorkforceCreateActivationState>({ kind: "idle" });

  const submit = useCallback(async (
    input: any,
    options: { readonly issueActivationCode: boolean },
  ): Promise<string | null> => {
    setState({ kind: "error", message: "Provisioning is centrally managed by Workforce. Endpoint deprecated in DSH." });
    return null;
  }, []);

  const resume = useCallback(async (caseId: string) => {
    setState({ kind: "error", message: "Provisioning is centrally managed by Workforce. Endpoint deprecated in DSH.", caseId });
    return null;
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, submit, resume, reset };
}

export function useCaptainCreateAndActivationController() {
  return useCreateActivationController();
}
