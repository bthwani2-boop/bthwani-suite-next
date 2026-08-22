import { useCallback, useState } from "react";
import { createFieldAgent, workforceErrorMessage } from "./workforce.api";
import type { CreateFieldAgentInput, FieldAgent } from "./workforce.types";

export type CanonicalFieldAgentCreateState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }
  | { kind: "created"; agent: FieldAgent };

/** The only Control Panel Field create controller. Workforce owns Identity orchestration. */
export function useCanonicalFieldAgentCreateController() {
  const [state, setState] = useState<CanonicalFieldAgentCreateState>({ kind: "idle" });

  const submit = useCallback(async (input: CreateFieldAgentInput) => {
    setState({ kind: "submitting" });
    try {
      const agent = await createFieldAgent({ ...input, engagementType: "independent_contractor" });
      setState({ kind: "created", agent });
      return agent;
    } catch (error) {
      setState({ kind: "error", message: workforceErrorMessage(error) });
      return null;
    }
  }, []);

  const reset = useCallback(() => setState({ kind: "idle" }), []);
  return { state, submit, reset };
}
