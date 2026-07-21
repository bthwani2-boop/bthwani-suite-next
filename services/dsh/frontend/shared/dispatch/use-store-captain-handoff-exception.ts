import React from "react";
import { reportPartnerStoreCaptainHandoffException } from "../orders/orders.api";
import type { DshStoreCaptainHandoffExceptionReason } from "../orders/orders.types";
import {
  classifyDispatchError,
  reportCaptainHandoffException,
} from "./dispatch.api";

export type StoreCaptainHandoffExceptionActor = "partner" | "captain";

type StoreCaptainHandoffExceptionDraft = {
  readonly entityId: string;
  readonly reasonCode: DshStoreCaptainHandoffExceptionReason;
  readonly note: string;
  readonly correlationId: string;
};

export type StoreCaptainHandoffExceptionState =
  | { readonly kind: "idle" }
  | ({ readonly kind: "editing" } & StoreCaptainHandoffExceptionDraft)
  | ({ readonly kind: "submitting" } & StoreCaptainHandoffExceptionDraft)
  | { readonly kind: "success"; readonly entityId: string }
  | ({ readonly kind: "error"; readonly message: string } & StoreCaptainHandoffExceptionDraft);

function exceptionMessage(error: unknown): string {
  const classified = classifyDispatchError(error);
  if (classified.kind === "permission_denied") return "لا تملك صلاحية تسجيل استثناء العهدة.";
  if (classified.kind === "offline") return "تعذر الاتصال. لم يُسجل أي استثناء.";
  if (classified.kind === "not_found") return "محاولة العهدة لم تعد نشطة. حدّث الطلب.";
  if (classified.kind === "conflict") {
    return classified.message ?? "توجد معالجة تشغيلية مفتوحة لهذا الطلب.";
  }
  return classified.message ?? "تعذر تسجيل استثناء العهدة.";
}

function isEditableState(
  state: StoreCaptainHandoffExceptionState,
): state is Extract<StoreCaptainHandoffExceptionState, { kind: "editing" | "error" }> {
  return state.kind === "editing" || state.kind === "error";
}

export function useStoreCaptainHandoffException(
  actor: StoreCaptainHandoffExceptionActor,
  refresh: () => void | Promise<void>,
) {
  const [state, setState] = React.useState<StoreCaptainHandoffExceptionState>({ kind: "idle" });

  const begin = React.useCallback((entityId: string) => {
    if (!entityId) return;
    setState({
      kind: "editing",
      entityId,
      reasonCode: "handoff_shortage",
      note: "",
      correlationId: `${actor}:store-captain-handoff:${entityId}:${Date.now()}`,
    });
  }, [actor]);

  const setReasonCode = React.useCallback((reasonCode: DshStoreCaptainHandoffExceptionReason) => {
    setState((current) => isEditableState(current)
      ? { ...current, kind: "editing", reasonCode }
      : current);
  }, []);

  const setNote = React.useCallback((note: string) => {
    setState((current) => isEditableState(current)
      ? { ...current, kind: "editing", note }
      : current);
  }, []);

  const cancel = React.useCallback(() => setState({ kind: "idle" }), []);

  const submit = React.useCallback(async (): Promise<boolean> => {
    if (!isEditableState(state)) return false;
    const note = state.note.trim();
    const draft = { ...state, note };
    if (note.length < 5) {
      setState({ ...draft, kind: "error", message: "اكتب وصفًا واضحًا من خمسة أحرف على الأقل." });
      return false;
    }

    const command = { ...draft, kind: "submitting" as const };
    setState(command);
    try {
      const input = {
        reasonCode: command.reasonCode,
        note: command.note,
        correlationId: command.correlationId,
      };
      if (actor === "partner") {
        await reportPartnerStoreCaptainHandoffException(command.entityId, input);
      } else {
        await reportCaptainHandoffException(command.entityId, input);
      }
      setState({ kind: "success", entityId: command.entityId });
      await refresh();
      return true;
    } catch (error) {
      setState({ ...command, kind: "error", message: exceptionMessage(error) });
      return false;
    }
  }, [actor, refresh, state]);

  return { state, begin, setReasonCode, setNote, cancel, submit } as const;
}
