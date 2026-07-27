import { useCallback, useState } from "react";
import {
  buildFieldMutationContext,
  classifyFieldReadinessError,
  createReadinessEscalation,
} from "./field-readiness.api";
import {
  enqueueFieldOperation,
} from "./field-offline-queue";
import {
  escalationActionIdleState,
  escalationActionSubmittingState,
  escalationActionSuccessState,
  escalationActionQueuedState,
  escalationActionErrorState,
} from "./field-readiness.states";
import type { DshCreateEscalationInput } from "./field-readiness.types";

function resolveMessage(error: unknown): string {
  const classification = classifyFieldReadinessError(error);
  if (classification.kind === "permission_denied") return "غير مصرح لك بهذه العملية";
  if (classification.kind === "offline") return "لا يوجد اتصال بالإنترنت";
  if (classification.kind === "not_found") return "لم يتم إيجاد السجل";
  return error instanceof Error && error.message
    ? error.message
    : "حدث خطأ، يرجى المحاولة مجدداً";
}

export function useFieldEscalationSubmissionController() {
  const [actionState, setActionState] = useState(escalationActionIdleState());

  const raiseEscalation = useCallback(async (
    storeId: string,
    input: DshCreateEscalationInput,
  ): Promise<boolean> => {
    setActionState(escalationActionSubmittingState());
    const context = buildFieldMutationContext(
      "create-escalation",
      [storeId, input.visitId ?? "", input.severity, input.category, input.description],
    );

    try {
      const escalation = await createReadinessEscalation(storeId, input, context);
      setActionState(escalationActionSuccessState(escalation));
      return true;
    } catch (error) {
      if (classifyFieldReadinessError(error).kind === "offline") {
        try {
          const queued = await enqueueFieldOperation(
            "create_escalation",
            { storeId, input },
            context.idempotencyKey,
            context.correlationId,
          );
          setActionState(
            escalationActionQueuedState(
              queued.operationId,
              "تم حفظ التصعيد للمزامنة عند عودة الاتصال.",
            ),
          );
          return true;
        } catch (queueError) {
          setActionState(escalationActionErrorState(resolveMessage(queueError)));
          return false;
        }
      }

      setActionState(escalationActionErrorState(resolveMessage(error)));
      return false;
    }
  }, []);

  const resetAction = useCallback(() => {
    setActionState(escalationActionIdleState());
  }, []);

  return { actionState, raiseEscalation, resetAction };
}
