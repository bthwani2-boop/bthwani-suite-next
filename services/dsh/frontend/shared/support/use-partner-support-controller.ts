import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addPartnerSupportMessage,
  createPartnerSupportTicket,
  getPartnerSupportTicket,
  listPartnerSupportMessages,
  listPartnerSupportTickets,
} from "./partner-support.api";
import {
  clearPartnerMessageAttempt,
  clearPartnerTicketAttempt,
  getOrCreatePartnerMessageAttempt,
  getOrCreatePartnerTicketAttempt,
} from "./partner-support-attempt";
import type {
  DshCreateTicketInput,
  DshSupportMessage,
  DshSupportTicket,
} from "./support.types";

export type PartnerSupportControllerState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly tickets: readonly DshSupportTicket[] };

export type PartnerSupportDetailState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "ready";
      readonly ticket: DshSupportTicket;
      readonly messages: readonly DshSupportMessage[];
    };

function supportErrorMessage(error: unknown): string {
  const typed = error as { kind?: string; status?: number; code?: string; message?: string };
  if (typed.kind === "network") return "تعذر الاتصال. ستُستخدم هوية العملية نفسها عند إعادة المحاولة.";
  if (typed.status === 401) return "انتهت جلسة الشريك. سجّل الدخول مجددًا.";
  if (typed.status === 403) return "لا يملك حساب الشريك صلاحية الوصول إلى هذه التذكرة أو الطلب.";
  if (typed.status === 404) return "التذكرة غير موجودة أو لا تتبع حساب الشريك.";
  if (typed.code === "IDEMPOTENCY_KEY_REQUIRED") return "تعذر تثبيت هوية العملية.";
  return typed.message?.trim() || "تعذر تنفيذ عملية الدعم.";
}

export function usePartnerSupportController(actorId: string | null, enabled = true) {
  const [state, setState] = useState<PartnerSupportControllerState>({ kind: "loading" });
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<PartnerSupportDetailState>({ kind: "idle" });
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const mutationLock = useRef(false);
  const mountedRef = useRef(true);
  const ticketsSequence = useRef(0);
  const detailSequence = useRef(0);
  const contextKey = enabled && actorId ? actorId : "disabled";
  const contextKeyRef = useRef(contextKey);
  contextKeyRef.current = contextKey;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      ticketsSequence.current += 1;
      detailSequence.current += 1;
      mutationLock.current = false;
    };
  }, []);

  useEffect(() => {
    ticketsSequence.current += 1;
    detailSequence.current += 1;
    mutationLock.current = false;
    setMutating(false);
    setMutationError(null);
    if (!enabled || !actorId) {
      setSelectedTicketId(null);
      setDetailState({ kind: "idle" });
    }
  }, [actorId, enabled]);

  const loadTickets = useCallback(async (expectedTicketId?: string): Promise<boolean> => {
    const requestContextKey = contextKey;
    const sequence = ++ticketsSequence.current;
    if (!enabled || !actorId) {
      if (mountedRef.current && requestContextKey === contextKeyRef.current) {
        setState({ kind: "error", message: "جلسة الشريك غير جاهزة." });
        setSelectedTicketId(null);
      }
      return false;
    }
    setState({ kind: "loading" });
    try {
      const tickets = await listPartnerSupportTickets();
      if (
        !mountedRef.current
        || sequence !== ticketsSequence.current
        || requestContextKey !== contextKeyRef.current
      ) return false;
      if (expectedTicketId && !tickets.some((ticket) => ticket.id === expectedTicketId)) {
        setState({ kind: "error", message: "تم إرسال التذكرة، لكن لم تظهر في القراءة canonical للحساب." });
        return false;
      }
      setState({ kind: "ready", tickets });
      setSelectedTicketId((current) => {
        if (expectedTicketId) return expectedTicketId;
        if (current && tickets.some((ticket) => ticket.id === current)) return current;
        return tickets[0]?.id ?? null;
      });
      return true;
    } catch (error) {
      if (
        !mountedRef.current
        || sequence !== ticketsSequence.current
        || requestContextKey !== contextKeyRef.current
      ) return false;
      setState({ kind: "error", message: supportErrorMessage(error) });
      return false;
    }
  }, [actorId, contextKey, enabled]);

  const loadDetail = useCallback(async (
    ticketId: string | null = selectedTicketId,
    expectedMessageId?: string,
  ): Promise<boolean> => {
    const requestContextKey = contextKey;
    const sequence = ++detailSequence.current;
    if (!enabled || !actorId || !ticketId) {
      if (mountedRef.current && requestContextKey === contextKeyRef.current) {
        setDetailState({ kind: "idle" });
      }
      return false;
    }
    setDetailState({ kind: "loading" });
    try {
      const [ticket, messages] = await Promise.all([
        getPartnerSupportTicket(ticketId),
        listPartnerSupportMessages(ticketId),
      ]);
      if (
        !mountedRef.current
        || sequence !== detailSequence.current
        || requestContextKey !== contextKeyRef.current
      ) return false;
      if (ticket.id !== ticketId) {
        setDetailState({ kind: "error", message: "أعاد DSH تذكرة لا تطابق التذكرة المطلوبة." });
        return false;
      }
      if (expectedMessageId && !messages.some((message) => message.id === expectedMessageId)) {
        setDetailState({ kind: "error", message: "تم إرسال الرسالة، لكن لم تظهر في القراءة canonical للمحادثة." });
        return false;
      }
      setDetailState({ kind: "ready", ticket, messages });
      return true;
    } catch (error) {
      if (
        !mountedRef.current
        || sequence !== detailSequence.current
        || requestContextKey !== contextKeyRef.current
      ) return false;
      setDetailState({ kind: "error", message: supportErrorMessage(error) });
      return false;
    }
  }, [actorId, contextKey, enabled, selectedTicketId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    void loadDetail(selectedTicketId);
  }, [loadDetail, selectedTicketId]);

  const runMutation = useCallback(async <T,>(
    mutationContextKey: string,
    operation: () => Promise<T>,
  ): Promise<T | null> => {
    if (mutationLock.current) return null;
    mutationLock.current = true;
    setMutating(true);
    setMutationError(null);
    try {
      const result = await operation();
      if (!mountedRef.current || mutationContextKey !== contextKeyRef.current) return null;
      return result;
    } catch (error) {
      if (mountedRef.current && mutationContextKey === contextKeyRef.current) {
        setMutationError(supportErrorMessage(error));
      }
      return null;
    } finally {
      mutationLock.current = false;
      if (mountedRef.current && mutationContextKey === contextKeyRef.current) {
        setMutating(false);
      }
    }
  }, []);

  const createTicket = useCallback(async (input: DshCreateTicketInput): Promise<boolean> => {
    if (!actorId || !enabled) {
      setMutationError("جلسة الشريك غير جاهزة لتثبيت هوية العملية.");
      return false;
    }
    const mutationActorId = actorId;
    const mutationContextKey = contextKey;
    const result = await runMutation(mutationContextKey, async () => {
      const attempt = await getOrCreatePartnerTicketAttempt(mutationActorId, input);
      const ticket = await createPartnerSupportTicket(input, attempt.context);
      if (!mountedRef.current || mutationContextKey !== contextKeyRef.current) {
        throw new Error("تغيرت جلسة الشريك أثناء إنشاء التذكرة؛ تم الاحتفاظ بهوية العملية للتحقق الآمن عند العودة للحساب الأصلي.");
      }
      const ticketsVerified = await loadTickets(ticket.id);
      const detailVerified = ticketsVerified ? await loadDetail(ticket.id) : false;
      if (!ticketsVerified || !detailVerified) {
        throw new Error("تم إرسال التذكرة، لكن تعذر إثباتها من القراءة canonical؛ تم الاحتفاظ بهوية العملية لإعادة المحاولة الآمنة.");
      }
      await clearPartnerTicketAttempt(mutationActorId);
      return ticket;
    });
    return result !== null;
  }, [actorId, contextKey, enabled, loadDetail, loadTickets, runMutation]);

  const sendMessage = useCallback(async (body: string): Promise<boolean> => {
    const ticketId = selectedTicketId;
    const normalizedBody = body.trim();
    if (!ticketId || !normalizedBody) {
      setMutationError("اكتب رسالة وحدد تذكرة أولًا.");
      return false;
    }
    if (!actorId || !enabled) {
      setMutationError("جلسة الشريك غير جاهزة لتثبيت هوية العملية.");
      return false;
    }
    const mutationActorId = actorId;
    const mutationContextKey = contextKey;
    const result = await runMutation(mutationContextKey, async () => {
      const attempt = await getOrCreatePartnerMessageAttempt(mutationActorId, ticketId, normalizedBody);
      const message = await addPartnerSupportMessage(
        ticketId,
        normalizedBody,
        attempt.context,
      );
      if (!mountedRef.current || mutationContextKey !== contextKeyRef.current) {
        throw new Error("تغيرت جلسة الشريك أثناء إرسال الرسالة؛ تم الاحتفاظ بهوية العملية للتحقق الآمن عند العودة للحساب الأصلي.");
      }
      const detailVerified = await loadDetail(ticketId, message.id);
      if (!detailVerified) {
        throw new Error("تم إرسال الرسالة، لكن تعذر إثباتها من القراءة canonical؛ تم الاحتفاظ بهوية العملية لإعادة المحاولة الآمنة.");
      }
      await clearPartnerMessageAttempt(mutationActorId, ticketId);
      return message;
    });
    return result !== null;
  }, [actorId, contextKey, enabled, loadDetail, runMutation, selectedTicketId]);

  const tickets = state.kind === "ready" ? state.tickets : [];
  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId) ?? null,
    [selectedTicketId, tickets],
  );

  return {
    state,
    tickets,
    selectedTicketId,
    selectedTicket,
    selectTicket: setSelectedTicketId,
    detailState,
    mutationError,
    clearMutationError: () => setMutationError(null),
    mutating,
    reload: loadTickets,
    reloadDetail: () => loadDetail(selectedTicketId),
    createTicket,
    sendMessage,
  } as const;
}
