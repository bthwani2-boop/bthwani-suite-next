import { useCallback, useState } from "react";
import {
  workforceErrorMessage,
  startProvisioningCase,
  resumeProvisioningCase,
} from "./workforce.api";
import type {
  StartProvisioningInput,
} from "./workforce.types";

export type WorkforceCreateActivationState =
  | { kind: "idle" }
  | { kind: "provisioning"; caseId: string; status: string }
  | { kind: "error"; message: string; caseId?: string }
  | { kind: "created"; caseId: string };

function useCreateActivationController() {
  const [state, setState] = useState<WorkforceCreateActivationState>({ kind: "idle" });

  const submit = useCallback(async (
    input: StartProvisioningInput,
    options: { readonly issueActivationCode: boolean },
  ): Promise<string | null> => {
    setState({ kind: "provisioning", caseId: "", status: "DRAFT" });
    try {
      const pc = await startProvisioningCase(input);
      if (pc.status === "READY_FOR_ACTIVATION" || pc.status === "COMPLETED") {
        setState({ kind: "created", caseId: pc.id });
      } else if (pc.status.startsWith("FAILED")) {
        setState({ kind: "error", message: pc.failureReason || "Failed", caseId: pc.id });
      } else {
        setState({ kind: "provisioning", caseId: pc.id, status: pc.status });
      }
      // Note: We ignore options.issueActivationCode here since activation 
      // will be handled asynchronously or by a separate step in the orchestrator.
      return pc.id;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
      return null;
    }
  }, []);

  const resume = useCallback(async (caseId: string) => {
    setState({ kind: "provisioning", caseId, status: "RESUMING" });
    try {
      const pc = await resumeProvisioningCase(caseId);
      if (pc.status === "READY_FOR_ACTIVATION" || pc.status === "COMPLETED") {
        setState({ kind: "created", caseId: pc.id });
      } else if (pc.status.startsWith("FAILED")) {
        setState({ kind: "error", message: pc.failureReason || "Failed", caseId: pc.id });
      } else {
        setState({ kind: "provisioning", caseId: pc.id, status: pc.status });
      }
      return pc;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error), caseId });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);

  return { state, submit, resume, reset };
}

export function useFieldAgentCreateAndActivationController() {
  return useCreateActivationController();
}

export function useCaptainCreateAndActivationController() {
  return useCreateActivationController();
}
