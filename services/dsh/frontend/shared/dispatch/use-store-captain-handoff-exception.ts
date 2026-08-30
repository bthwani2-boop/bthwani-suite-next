import React from "react";
import { useIdentitySession } from "@bthwani/core-identity";
import { reportPartnerStoreCaptainHandoffException } from "../orders/orders.api";
import type { DshStoreCaptainHandoffExceptionReason } from "../orders/orders.types";
import {
  classifyDispatchError,
  fetchCaptainDeliveryException,
  reportCaptainHandoffException,
} from "./dispatch.api";
import type { DshDeliveryException } from "./dispatch.types";
import {
  clearStoreCaptainHandoffExceptionAttempt,
  getOrCreateStoreCaptainHandoffExceptionAttempt,
  type StoreCaptainHandoffExceptionAttemptIntent,
} from "./store-captain-handoff-exception-attempt";

export type StoreCaptainHandoffExceptionActor = "partner" | "captain";

type StoreCaptainHandoffExceptionDraft = {
  readonly entityId: string;
  readonly reasonCode: DshStoreCaptainHandoffExceptionReason;
  readonly note: string;
};

export type StoreCaptainHandoffExceptionState =
  | { readonly kind: "idle" }
  | ({ readonly kind: "editing" } & StoreCaptainHandoffExceptionDraft)
  | ({ readonly kind: "submitting" } & StoreCaptainHandoffExceptionDraft)
  | { readonly kind: "success"; readonly entityId: string }
  | ({ readonly kind: "error"; readonly message: string } & StoreCaptainHandoffExceptionDraft);

export type StoreCaptainHandoffExceptionReadback =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly entityId: string }
  | { readonly kind: "clear"; readonly entityId: string }
  | { readonly kind: "blocked"; readonly entityId: string; readonly exception: DshDeliveryException }
  | { readonly kind: "error"; readonly entityId: string; readonly message: string };

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

function readbackMessage(error: unknown): string {
  const classified = classifyDispatchError(error);
  if (classified.kind === "permission_denied") return "تعذر التحقق من استثناء المهمة بسبب الصلاحيات.";
  if (classified.kind === "offline") return "تعذر التحقق من حالة المهمة. الاستلام محجوب حتى عودة الاتصال.";
  return classified.message ?? "تعذر التحقق من حالة الاستثناء التشغيلي.";
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
  const identity = useIdentitySession();
  const actorId = identity.state.kind === "authenticated" ? identity.state.identity.subject : null;
  const [state, setState] = React.useState<StoreCaptainHandoffExceptionState>({ kind: "idle" });
  const [readback, setReadback] = React.useState<StoreCaptainHandoffExceptionReadback>({ kind: "idle" });

  const begin = React.useCallback((entityId: string) => {
    if (!entityId) return;
    setState({
      kind: "editing",
      entityId,
      reasonCode: "handoff_shortage",
      note: "",
    });
  }, []);

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

  const clearResolvedLocalState = React.useCallback((entityId: string) => {
    setReadback({ kind: "clear", entityId });
    setState((current) => current.kind === "success" && current.entityId === entityId
      ? { kind: "idle" }
      : current);
  }, []);

  const loadExisting = React.useCallback(async (entityId: string): Promise<void> => {
    if (actor !== "captain" || !entityId.trim()) {
      clearResolvedLocalState(entityId);
      return;
    }
    setReadback({ kind: "loading", entityId });
    try {
      const item = await fetchCaptainDeliveryException(entityId);
      // The backend pickup guard blocks on every open/acknowledged delivery
      // exception, not only handoff-specific reasons. The surface must mirror
      // that fail-closed rule after refresh or a new session.
      setReadback({ kind: "blocked", entityId, exception: item });
    } catch (error) {
      const classified = classifyDispatchError(error);
      if (classified.kind === "not_found") {
        clearResolvedLocalState(entityId);
        return;
      }
      setReadback({ kind: "error", entityId, message: readbackMessage(error) });
    }
  }, [actor, clearResolvedLocalState]);

  const submit = React.useCallback(async (): Promise<boolean> => {
    if (!isEditableState(state)) return false;
    const note = state.note.trim();
    const draft = { ...state, note };
    if (note.length < 5) {
      setState({ ...draft, kind: "error", message: "اكتب وصفًا واضحًا من خمسة أحرف على الأقل." });
      return false;
    }
    if (!actorId) {
      setState({ ...draft, kind: "error", message: "انتهت جلسة الهوية. سجّل الدخول ثم أعد المحاولة." });
      return false;
    }

    const command = { ...draft, kind: "submitting" as const };
    setState(command);
    try {
      const attemptIntent: StoreCaptainHandoffExceptionAttemptIntent = {
        actor,
        actorId,
        entityId: command.entityId,
        reasonCode: command.reasonCode,
        note: command.note,
      };
      const attempt = await getOrCreateStoreCaptainHandoffExceptionAttempt(attemptIntent);
      const input = {
        reasonCode: command.reasonCode,
        note: command.note,
        correlationId: attempt.correlationId,
      };
      const item = actor === "partner"
        ? await reportPartnerStoreCaptainHandoffException(command.entityId, input, attempt.context)
        : await reportCaptainHandoffException(command.entityId, input, attempt.context);
      if (item.correlationId !== attempt.correlationId) {
        throw new Error("handoff exception canonical readback did not preserve the mutation identity");
      }
      setState({ kind: "success", entityId: command.entityId });
      if (actor === "captain") {
        setReadback({ kind: "blocked", entityId: command.entityId, exception: item });
      }
      await clearStoreCaptainHandoffExceptionAttempt(attemptIntent, attempt.signature);
      try {
        await refresh();
      } catch {
        // The exact canonical exception response already proves the mutation.
      }
      return true;
    } catch (error) {
      setState({ ...command, kind: "error", message: exceptionMessage(error) });
      return false;
    }
  }, [actor, actorId, refresh, state]);

  return {
    state,
    readback,
    begin,
    setReasonCode,
    setNote,
    cancel,
    loadExisting,
    submit,
  } as const;
}
